import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { createWalletTransaction } from "@/utils/walletUtils.js";
import { deleteFromCloudinary } from "@/utils/cloudinary.js";
import { listVideoModels, type VideoModelInfo } from "@/utils/openrouterVideo.js";
import { runPendingVideoJobs } from "./video.generation.service.js";
import { containsDisallowedContent } from "./video.moderation.js";
import { vlog, vlogBlock, vlogError } from "./video.logger.js";
import { MAX_TITLE_CHARS, type CreateVideoInput, type ListVideosQuery } from "./video.types.js";

const DEFAULT_LIMIT = 20;
const DEFAULT_DURATION = 4;
const DEFAULT_RESOLUTION = "720p";
const DEFAULT_ASPECT_RATIO = "16:9";

// The provider's own model catalogue rarely changes; refetching it on every
// create request would add a network round trip to every video request for
// no reason, so it's cached with a short TTL instead of not at all.
const MODEL_INFO_TTL_MS = 10 * 60 * 1000;
let modelInfoCache: { at: number; models: VideoModelInfo[] } | null = null;

const getVideoModelInfo = async (externalId: string): Promise<VideoModelInfo | null> => {
  const now = Date.now();
  if (!modelInfoCache || now - modelInfoCache.at > MODEL_INFO_TTL_MS) {
    modelInfoCache = { at: now, models: await listVideoModels() };
  }
  return modelInfoCache.models.find((m) => m.id === externalId) ?? null;
};

class VideoService {
  /**
   * Picks the model to generate with — the same defaultForCapabilities-first
   * lookup chat.service.ts uses for IMAGE_GENERATION, so a video model is
   * configured the same way any other model is (see model.route.ts).
   */
  private async resolveModel(modelId?: number) {
    if (modelId) {
      const requested = await prisma.model.findFirst({
        where: {
          id: modelId,
          isActive: true,
          isDeleted: false,
          capabilities: { has: "VIDEO_GENERATION" },
        },
      });
      if (!requested) {
        throw new ApiError(
          "That video model isn't available.",
          STATUS_CODES.BAD_REQUEST,
        );
      }
      return requested;
    }

    const preferred = await prisma.model.findFirst({
      where: {
        isActive: true,
        isDeleted: false,
        defaultForCapabilities: { has: "VIDEO_GENERATION" },
      },
    });
    if (preferred) return preferred;

    const fallback = await prisma.model.findFirst({
      where: {
        isActive: true,
        isDeleted: false,
        capabilities: { has: "VIDEO_GENERATION" },
      },
    });
    if (fallback) return fallback;

    throw new ApiError(
      "No video generation model is configured yet.",
      STATUS_CODES.SERVER_ERROR,
    );
  }

  /** Active VIDEO_GENERATION models a user can pick from, cheapest first. */
  async listAvailableModels() {
    return prisma.model.findMany({
      where: {
        isActive: true,
        isDeleted: false,
        capabilities: { has: "VIDEO_GENERATION" },
      },
      select: {
        id: true,
        name: true,
        description: true,
        externalId: true,
        videoCostPerSecond: true,
        videoCostPerSecondByResolution: true,
        videoCostPerSecondByResolutionImageInput: true,
      },
      orderBy: { videoCostPerSecond: "asc" },
    });
  }

  /**
   * Wallet tokens/second for this model at this resolution — the
   * per-resolution map wins when it has an entry (Seedance 2.0's price
   * scales ~11x from 480p to 4K, so a flat rate would badly underprice the
   * expensive tiers), otherwise falls back to the flat videoCostPerSecond.
   */
  private resolveCostPerSecond(
    model: {
      name: string;
      videoCostPerSecond: number | null;
      videoCostPerSecondByResolution: unknown;
      videoCostPerSecondByResolutionImageInput: unknown;
    },
    resolution: string,
    hasImageInput: boolean,
  ): number {
    // Image-conditioned generation is CHEAPER for some models (Seedance's
    // own pricing_skus: video_tokens_with_video_input is ~39% below
    // video_tokens) — only used when the model actually has a distinct
    // rate; Veo has none, so it falls through to the normal map for it.
    if (hasImageInput) {
      const byResolutionImage = model.videoCostPerSecondByResolutionImageInput as Record<
        string,
        number
      > | null;
      const perResolutionImage = byResolutionImage?.[resolution];
      if (typeof perResolutionImage === "number") return perResolutionImage;
    }

    const byResolution = model.videoCostPerSecondByResolution as Record<string, number> | null;
    const perResolution = byResolution?.[resolution];
    if (typeof perResolution === "number") return perResolution;

    if (model.videoCostPerSecond) return model.videoCostPerSecond;

    throw new ApiError(
      `Video model "${model.name}" has no cost configured for resolution ${resolution}.`,
      STATUS_CODES.SERVER_ERROR,
    );
  }

  /**
   * Enqueues a video and returns immediately with a PENDING row — generation
   * runs in the background against OpenRouter's async video API, which can
   * take anywhere from ~20 seconds to a few minutes.
   */
  async create(userId: number, input: CreateVideoInput) {
    vlog("create", `user=${userId} request received — prompt="${input.prompt.slice(0, 80)}..."`);

    if (input.chatId) {
      const chat = await prisma.chat.findFirst({
        where: { id: input.chatId, userId, isDeleted: false },
        select: { id: true },
      });
      if (!chat) {
        vlog("create", `user=${userId} chatId=${input.chatId} not found — rejecting`);
        throw new ApiError("Chat not found", STATUS_CODES.NOT_FOUND);
      }
    }

    const prompt = input.prompt.trim();
    if (containsDisallowedContent(prompt)) {
      vlog("create", `user=${userId} prompt rejected by moderation gate`);
      throw new ApiError(
        "This prompt isn't something I can generate a video for. Please rephrase it.",
        STATUS_CODES.BAD_REQUEST,
      );
    }
    vlog("create", `user=${userId} moderation check passed`);

    const model = await this.resolveModel(input.modelId);
    vlog("create", `user=${userId} resolved model=${model.name} (id=${model.id}, externalId=${model.externalId})`);

    const duration = input.duration ?? DEFAULT_DURATION;
    const resolution = input.resolution ?? DEFAULT_RESOLUTION;
    const aspectRatio = input.aspectRatio ?? DEFAULT_ASPECT_RATIO;
    vlog("create", `user=${userId} params duration=${duration}s resolution=${resolution} aspectRatio=${aspectRatio}`);

    // Best-effort cross-check against what the model actually supports.
    // Never blocks generation on its own failure — a flaky catalogue fetch
    // must not be the reason a paying user can't generate a video.
    try {
      const modelInfo = await getVideoModelInfo(model.externalId);
      if (modelInfo) {
        vlog("create", `catalogue check: durations=[${modelInfo.supportedDurations}] resolutions=[${modelInfo.supportedResolutions}]`);
        if (
          modelInfo.supportedDurations.length > 0 &&
          !modelInfo.supportedDurations.includes(duration)
        ) {
          throw new ApiError(
            `${model.name} supports these durations (seconds): ${modelInfo.supportedDurations.join(", ")}.`,
            STATUS_CODES.BAD_REQUEST,
          );
        }
        if (
          modelInfo.supportedResolutions.length > 0 &&
          !modelInfo.supportedResolutions.includes(resolution)
        ) {
          throw new ApiError(
            `${model.name} supports these resolutions: ${modelInfo.supportedResolutions.join(", ")}.`,
            STATUS_CODES.BAD_REQUEST,
          );
        }
      } else {
        vlog("create", `catalogue check: model ${model.externalId} not found in OpenRouter's /videos/models — skipping validation`);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      vlogError("create", "model catalogue check failed (continuing without validation)", error);
    }

    const hasImageInput = Boolean(input.firstFrameUrl || input.lastFrameUrl);
    const costPerSecond = this.resolveCostPerSecond(model, resolution, hasImageInput);
    const reservedTokens = Math.ceil(duration * costPerSecond);
    vlog(
      "create",
      `user=${userId} reservedTokens=${reservedTokens} (${duration}s × ${costPerSecond}/s @ ${resolution}${hasImageInput ? ", image-to-video" : ""})`,
    );

    const video = await prisma.$transaction(async (tx) => {
      const wallet = await tx.userWallet.findUnique({ where: { userId } });
      if (!wallet || wallet.tokensRemaining < reservedTokens) {
        vlog(
          "create",
          `user=${userId} INSUFFICIENT TOKENS — needs=${reservedTokens} has=${wallet?.tokensRemaining ?? 0}`,
        );
        throw new ApiError(
          `Insufficient tokens — this video needs ${reservedTokens} tokens, you have ${wallet?.tokensRemaining ?? 0}.`,
          STATUS_CODES.BAD_REQUEST,
        );
      }

      const created = await tx.generatedVideo.create({
        data: {
          userId,
          chatId: input.chatId ?? null,
          messageId: input.messageId ?? null,
          modelId: model.id,
          status: "PENDING",
          prompt: prompt.slice(0, MAX_TITLE_CHARS * 10),
          duration,
          resolution,
          aspectRatio,
          firstFrameUrl: input.firstFrameUrl ?? null,
          lastFrameUrl: input.lastFrameUrl ?? null,
          reservedTokens,
        },
      });

      await tx.userWallet.update({
        where: { userId },
        data: {
          tokensRemaining: { decrement: reservedTokens },
          tokensUsed: { increment: reservedTokens },
        },
      });

      await createWalletTransaction(tx, {
        userId,
        walletId: wallet.id,
        amount: reservedTokens,
        type: "DEBIT",
        referenceId: `video_reserve_${created.id}`,
        meta: { reason: "VIDEO_GENERATION_RESERVE", videoId: created.id },
      });

      return created;
    });

    vlogBlock("create", `job=${video.id} created as PENDING, ${reservedTokens} tokens reserved`, {
      videoId: video.id,
      userId,
      modelId: model.id,
      duration,
      resolution,
      aspectRatio,
      reservedTokens,
    });

    // Kick the worker now rather than waiting for the next cron tick — the
    // user is watching a card for a request that can take minutes, so poll
    // latency here is very visible.
    void runPendingVideoJobs();
    vlog("create", `job=${video.id} worker kicked`);

    return video;
  }

  async list(userId: number, query: ListVideosQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), 100);

    const where = {
      userId,
      isDeleted: false,
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.chatId ? { chatId: Number(query.chatId) } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.generatedVideo.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.generatedVideo.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(userId: number, id: number) {
    const video = await prisma.generatedVideo.findFirst({
      where: { id, userId, isDeleted: false },
    });
    if (!video) {
      throw new ApiError("Video not found", STATUS_CODES.NOT_FOUND);
    }
    return video;
  }

  /**
   * Re-queues a failed video. Re-debits the wallet — unlike a document retry,
   * a failed video's reservation was already refunded in full (see
   * video.generation.service.ts), so a retry is a genuinely new paid attempt.
   */
  async retry(userId: number, id: number) {
    vlog("retry", `user=${userId} requested retry of job=${id}`);
    const video = await prisma.generatedVideo.findFirst({
      where: { id, userId, isDeleted: false },
    });
    if (!video) {
      throw new ApiError("Video not found", STATUS_CODES.NOT_FOUND);
    }
    if (video.status !== "FAILED") {
      vlog("retry", `job=${id} rejected — status is ${video.status}, not FAILED`);
      throw new ApiError("Only failed videos can be retried", STATUS_CODES.BAD_REQUEST);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const wallet = await tx.userWallet.findUnique({ where: { userId } });
      if (!wallet || wallet.tokensRemaining < video.reservedTokens) {
        throw new ApiError(
          `Insufficient tokens to retry — needs ${video.reservedTokens} tokens.`,
          STATUS_CODES.BAD_REQUEST,
        );
      }

      await tx.userWallet.update({
        where: { userId },
        data: {
          tokensRemaining: { decrement: video.reservedTokens },
          tokensUsed: { increment: video.reservedTokens },
        },
      });

      await createWalletTransaction(tx, {
        userId,
        walletId: wallet.id,
        amount: video.reservedTokens,
        type: "DEBIT",
        referenceId: `video_reserve_retry_${video.id}_${Date.now()}`,
        meta: { reason: "VIDEO_GENERATION_RESERVE_RETRY", videoId: video.id },
      });

      return tx.generatedVideo.update({
        where: { id },
        data: {
          status: "PENDING",
          attempts: 0,
          lastError: null,
          externalJobId: null,
          actualCostUsd: null,
        },
      });
    });

    vlog("retry", `job=${id} re-reserved ${video.reservedTokens} tokens, reset to PENDING`);
    void runPendingVideoJobs();
    vlog("retry", `job=${id} worker kicked`);

    return updated;
  }

  async delete(userId: number, id: number) {
    vlog("delete", `user=${userId} requested delete of job=${id}`);
    const video = await prisma.generatedVideo.findFirst({
      where: { id, userId, isDeleted: false },
      select: { id: true, cloudinaryPublicId: true },
    });
    if (!video) {
      throw new ApiError("Video not found", STATUS_CODES.NOT_FOUND);
    }

    if (video.cloudinaryPublicId) {
      await deleteFromCloudinary(video.cloudinaryPublicId, "video").catch((error) => {
        vlogError("delete", `job=${id} failed to delete Cloudinary asset`, error);
      });
      vlog("delete", `job=${id} Cloudinary asset removed (publicId=${video.cloudinaryPublicId})`);
    }

    const result = await prisma.generatedVideo.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
      select: { id: true },
    });
    vlog("delete", `job=${id} soft-deleted`);
    return result;
  }
}

export default VideoService;
