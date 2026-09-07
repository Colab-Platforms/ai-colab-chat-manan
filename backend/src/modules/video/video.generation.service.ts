import prisma from "@root/prisma.js";
import { uploadToCloudinary } from "@/utils/cloudinary.js";
import { createWalletTransaction } from "@/utils/walletUtils.js";
import {
  downloadVideoContent,
  pollVideoJob,
  submitVideoJob,
  VideoSubmitError,
  type FrameImage,
  type VideoJobPollResult,
} from "@/utils/openrouterVideo.js";
import { vlog, vlogBlock, vlogError } from "./video.logger.js";

const MAX_ATTEMPTS = Number(process.env.VIDEO_MAX_ATTEMPTS ?? 3);
const BATCH_SIZE = Number(process.env.VIDEO_BATCH_SIZE ?? 3);
const CALLBACK_BASE_URL = process.env.BACKEND_PUBLIC_URL || "";

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "") || "video";

const buildPublicId = (id: number): string => `video-${id}-${slugify(String(Date.now()))}`;

/** Atomically claims a PENDING row so exactly one worker submits it. */
const claimPending = async (id: number): Promise<boolean> => {
  const { count } = await prisma.generatedVideo.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "SUBMITTED", startedAt: new Date() },
  });
  return count === 1;
};

/** Refunds this video's full reservation — used on any terminal failure. */
const refundReservation = async (video: {
  id: number;
  userId: number;
  reservedTokens: number;
}): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    const wallet = await tx.userWallet.findUnique({ where: { userId: video.userId } });
    if (!wallet) {
      vlogError("refund", `job=${video.id} user=${video.userId} has no wallet — cannot refund`, null);
      return;
    }

    await tx.userWallet.update({
      where: { userId: video.userId },
      data: {
        tokensRemaining: { increment: video.reservedTokens },
        tokensUsed: { decrement: video.reservedTokens },
      },
    });

    await createWalletTransaction(tx, {
      userId: video.userId,
      walletId: wallet.id,
      amount: video.reservedTokens,
      type: "CREDIT",
      referenceId: `video_refund_${video.id}`,
      meta: { reason: "VIDEO_GENERATION_REFUND", videoId: video.id },
    });
  });
  vlog("refund", `job=${video.id} refunded ${video.reservedTokens} tokens to user=${video.userId}`);
};

/**
 * A submit-call failure below the attempts cap normally goes back to PENDING
 * for the next tick to retry — the existing reservation covers it, no
 * re-debit. But a 4xx from OpenRouter (bad params, content-policy rejection
 * like "image may contain a real person") is deterministic: the identical
 * request will fail identically every time, so retrying just burns attempts
 * and delays the refund. Those fail immediately instead.
 */
const handleSubmitFailure = async (id: number, error: unknown): Promise<void> => {
  const message = String((error as any)?.message ?? error).slice(0, 1000);
  const nonRetryable = error instanceof VideoSubmitError && !error.retryable;
  const video = await prisma.generatedVideo.findUnique({ where: { id } });
  if (!video) return;

  const attempts = video.attempts + 1;
  const exhausted = nonRetryable || attempts >= MAX_ATTEMPTS;

  await prisma.generatedVideo.update({
    where: { id },
    data: {
      status: exhausted ? "FAILED" : "PENDING",
      attempts,
      lastError: message,
      ...(exhausted ? { completedAt: new Date() } : {}),
    },
  });

  if (exhausted) {
    await refundReservation(video);
  }

  vlogError(
    "submit",
    `job=${id} attempt=${attempts}/${MAX_ATTEMPTS} → ${
      exhausted
        ? `FAILED (refunded, ${nonRetryable ? "non-retryable provider rejection" : "giving up"})`
        : "back to PENDING (will retry)"
    }`,
    message,
  );
};

export const submitPendingVideoJobs = async (): Promise<void> => {
  const pending = await prisma.generatedVideo.findMany({
    where: { status: "PENDING", isDeleted: false, attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
    include: { model: true },
  });

  if (pending.length === 0) {
    vlog("submit", "drain tick — nothing PENDING");
    return;
  }
  vlog("submit", `drain tick — ${pending.length} PENDING job(s) found`);

  await Promise.all(
    pending.map(async (video) => {
      const claimed = await claimPending(video.id);
      if (!claimed) {
        vlog("submit", `job=${video.id} already claimed by another worker — skipping`);
        return;
      }
      vlog("submit", `job=${video.id} CLAIMED (PENDING → SUBMITTED), calling OpenRouter`);

      try {
        const callbackUrl = CALLBACK_BASE_URL
          ? `${CALLBACK_BASE_URL.replace(/\/+$/, "")}/api/videos/webhooks/openrouter`
          : undefined;
        const frameImages: FrameImage[] = [
          ...(video.firstFrameUrl ? [{ url: video.firstFrameUrl, frameType: "first_frame" as const }] : []),
          ...(video.lastFrameUrl ? [{ url: video.lastFrameUrl, frameType: "last_frame" as const }] : []),
        ];
        vlogBlock("submit", `job=${video.id} submitting to OpenRouter`, {
          model: video.model.externalId,
          duration: video.duration,
          resolution: video.resolution,
          aspectRatio: video.aspectRatio,
          frameImages: frameImages.length > 0 ? frameImages : "(text-to-video)",
          callbackUrl: callbackUrl ?? "(none — BACKEND_PUBLIC_URL not set, poll-only)",
        });

        const result = await submitVideoJob({
          model: video.model.externalId,
          prompt: video.prompt,
          duration: video.duration,
          resolution: video.resolution,
          aspectRatio: video.aspectRatio,
          callbackUrl,
          frameImages: frameImages.length > 0 ? frameImages : undefined,
        });

        await prisma.generatedVideo.update({
          where: { id: video.id },
          data: { externalJobId: result.id },
        });

        vlog("submit", `job=${video.id} submitted OK -> externalJobId=${result.id} status=${result.status}`);
      } catch (error) {
        await handleSubmitFailure(video.id, error);
      }
    }),
  );
};

/**
 * Shared by the poll tick and the webhook handler — both arrive at the same
 * terminal-state payload shape from OpenRouter, just via different paths.
 */
export const applyTerminalStatus = async (
  videoId: number,
  poll: VideoJobPollResult,
): Promise<void> => {
  vlog("terminal", `job=${videoId} applying provider status=${poll.status}`);

  const video = await prisma.generatedVideo.findUnique({ where: { id: videoId } });
  if (!video) {
    vlog("terminal", `job=${videoId} not found — ignoring`);
    return;
  }
  if (video.status !== "SUBMITTED") {
    vlog("terminal", `job=${videoId} already in terminal state (${video.status}) — ignoring duplicate delivery`);
    return;
  }

  if (poll.status === "completed") {
    vlog("terminal", `job=${video.id} COMPLETED on provider side — downloading content`);
    try {
      const buffer = await downloadVideoContent(video.externalJobId!);
      vlog("terminal", `job=${video.id} downloaded ${buffer.length} bytes — uploading to Cloudinary`);

      const publicId = buildPublicId(video.id);
      const uploaded = await uploadToCloudinary(buffer, {
        folder: "generated-videos",
        resourceType: "video",
        publicId,
      });
      vlog("terminal", `job=${video.id} uploaded to Cloudinary: ${uploaded.url}`);

      await prisma.$transaction([
        prisma.generatedVideo.update({
          where: { id: video.id },
          data: {
            status: "COMPLETED",
            fileUrl: uploaded.url,
            cloudinaryPublicId: uploaded.publicId,
            fileSize: buffer.length,
            actualCostUsd: poll.costUsd,
            completedAt: new Date(),
            lastError: null,
          },
        }),
        // Logged on completion (not at reserve time) so a job that later
        // fails/refunds never shows up as "usage" in the admin report — the
        // wallet debit already happened at create(), this is just the
        // Token Usage page's record of it, mirroring how chat completions
        // log against UsageLog.
        prisma.usageLog.create({
          data: {
            userId: video.userId,
            modelId: video.modelId,
            chatId: video.chatId,
            messageId: video.messageId,
            capability: "VIDEO_GENERATION",
            promptTokens: 0,
            completionTokens: video.reservedTokens,
            totalTokens: video.reservedTokens,
            billablePromptTokens: 0,
            billableCompletionTokens: video.reservedTokens,
            billableTotalTokens: video.reservedTokens,
          },
        }),
      ]);

      vlogBlock("terminal", `job=${video.id} COMPLETED`, {
        videoId: video.id,
        fileUrl: uploaded.url,
        fileSize: buffer.length,
        reservedTokens: video.reservedTokens,
        actualCostUsd: poll.costUsd,
      });
    } catch (error) {
      // Generation succeeded on the provider's side but our download/upload
      // failed — this is OUR failure, not a reason to bill the user, and not
      // safely retryable via a fresh provider submission (that would
      // generate a second video). Refund and surface for manual retry.
      const message = String((error as any)?.message ?? error).slice(0, 1000);
      await prisma.generatedVideo.update({
        where: { id: video.id },
        data: { status: "FAILED", lastError: message, completedAt: new Date() },
      });
      await refundReservation(video);
      vlogError("terminal", `job=${video.id} download/upload failed after provider completed — refunded`, message);
    }
    return;
  }

  if (poll.status === "failed" || poll.status === "cancelled" || poll.status === "expired") {
    const status = poll.status === "cancelled" ? "CANCELLED" : poll.status === "expired" ? "EXPIRED" : "FAILED";
    await prisma.generatedVideo.update({
      where: { id: video.id },
      data: {
        status,
        lastError: poll.error ?? `Provider reported status: ${poll.status}`,
        completedAt: new Date(),
      },
    });
    await refundReservation(video);
    vlog("terminal", `job=${video.id} ${status} — refunded ${video.reservedTokens} tokens (reason: ${poll.error ?? poll.status})`);
    return;
  }

  vlog("terminal", `job=${video.id} still ${poll.status} — nothing to do this tick`);
};

/**
 * Safety-net poll for rows a webhook never resolved (delivery failure,
 * callback_url unreachable in local/dev, etc). Only polls jobs old enough
 * that "still pending" isn't simply because it was submitted seconds ago.
 */
export const pollSubmittedVideoJobs = async (): Promise<void> => {
  const staleBefore = new Date(Date.now() - 20_000);

  const submitted = await prisma.generatedVideo.findMany({
    where: {
      status: "SUBMITTED",
      isDeleted: false,
      externalJobId: { not: null },
      startedAt: { lt: staleBefore },
    },
    orderBy: { startedAt: "asc" },
    take: BATCH_SIZE * 2,
  });

  if (submitted.length === 0) {
    vlog("poll", "safety-net tick — nothing SUBMITTED to poll");
    return;
  }
  vlog("poll", `safety-net tick — polling ${submitted.length} SUBMITTED job(s)`);

  await Promise.all(
    submitted.map(async (video) => {
      try {
        vlog("poll", `job=${video.id} polling externalJobId=${video.externalJobId}`);
        const poll = await pollVideoJob(video.externalJobId!);
        vlog("poll", `job=${video.id} provider status=${poll.status}`);
        await applyTerminalStatus(video.id, poll);
      } catch (error) {
        vlogError("poll", `job=${video.id} poll request failed`, error);
      }
    }),
  );
};

/**
 * A row stuck in SUBMITTED with no externalJobId means the process died
 * between the atomic claim and the submit call actually completing — put it
 * back on the queue rather than leaving it orphaned forever.
 */
export const reclaimOrphanedSubmissions = async (): Promise<void> => {
  const staleBefore = new Date(Date.now() - 2 * 60_000);

  const { count } = await prisma.generatedVideo.updateMany({
    where: { status: "SUBMITTED", externalJobId: null, startedAt: { lt: staleBefore } },
    data: { status: "PENDING", lastError: "Stale — submission did not complete in time" },
  });

  if (count > 0) {
    vlog("reclaim", `reclaimed ${count} orphaned submission(s) back to PENDING`);
  }
};

let isDraining = false;

/** Drains the PENDING (submit) queue. Safe to call concurrently. */
export const runPendingVideoJobs = async (): Promise<void> => {
  if (isDraining) return;
  isDraining = true;
  try {
    await submitPendingVideoJobs();
  } catch (error) {
    vlogError("drain", "drain error", error);
  } finally {
    isDraining = false;
  }
};
