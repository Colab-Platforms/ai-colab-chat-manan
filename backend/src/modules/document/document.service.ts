import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { deleteFromCloudinary } from "@/utils/cloudinary.js";
import { runPendingDocumentJobs } from "./document.generation.service.js";
import {
  getSupportedFormats,
  isFormatSupported,
} from "./document.renderers.js";
import {
  MAX_TITLE_CHARS,
  type CreateDocumentInput,
  type ListDocumentsQuery,
} from "./document.types.js";

const DEFAULT_LIMIT = 20;

class DocumentService {
  /**
   * Enqueues a document and returns immediately with a PENDING row, so the UI
   * can render a "generating" state right away. Generation itself is a
   * background job — a large PDF takes far longer than a request should.
   */
  async create(userId: number, input: CreateDocumentInput) {
    if (input.chatId) {
      const chat = await prisma.chat.findFirst({
        where: { id: input.chatId, userId, isDeleted: false },
        select: { id: true },
      });
      if (!chat) {
        throw new ApiError("Chat not found", STATUS_CODES.NOT_FOUND);
      }
    }

    // The API errors on an unrenderable format instead of substituting one,
    // unlike the chat path: an API caller can read the error and pick again,
    // whereas a chat user can only be told in prose after the fact.
    const format = input.format ?? "PDF";
    if (!isFormatSupported(format)) {
      throw new ApiError(
        `${format} generation is not available yet. Supported formats: ${getSupportedFormats().join(", ")}.`,
        STATUS_CODES.BAD_REQUEST,
      );
    }

    const document = await prisma.generatedDocument.create({
      data: {
        userId,
        chatId: input.chatId ?? null,
        messageId: input.messageId ?? null,
        format,
        status: "PENDING",
        // Placeholder until the spec model names it; `create` must not block
        // on the model call just to produce a title.
        title: (input.title?.trim() || input.prompt.trim()).slice(
          0,
          MAX_TITLE_CHARS,
        ),
        prompt: input.prompt.trim(),
        sourceText: input.sourceText?.trim() || null,
        theme: input.theme ?? "professional",
      },
    });

    // Kick the worker now rather than waiting for the next cron tick — the
    // user is watching a spinner, so poll latency is user-visible here.
    void runPendingDocumentJobs();

    return document;
  }

  async list(userId: number, query: ListDocumentsQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), 100);

    const where = {
      userId,
      isDeleted: false,
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.chatId ? { chatId: Number(query.chatId) } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.generatedDocument.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        // `spec` and `sourceText` can both be large; they are not needed to
        // render a list row.
        omit: { spec: true, sourceText: true },
      }),
      prisma.generatedDocument.count({ where }),
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
    const document = await prisma.generatedDocument.findFirst({
      where: { id, userId, isDeleted: false },
      omit: { spec: true, sourceText: true },
    });

    if (!document) {
      throw new ApiError("Document not found", STATUS_CODES.NOT_FOUND);
    }

    return document;
  }

  /**
   * Re-queues a failed document. The stored spec is reused when present, so a
   * retry after a render/upload failure costs nothing in model spend.
   */
  async retry(userId: number, id: number) {
    const document = await prisma.generatedDocument.findFirst({
      where: { id, userId, isDeleted: false },
      select: { id: true, status: true },
    });

    if (!document) {
      throw new ApiError("Document not found", STATUS_CODES.NOT_FOUND);
    }
    if (document.status !== "FAILED") {
      throw new ApiError(
        "Only failed documents can be retried",
        STATUS_CODES.BAD_REQUEST,
      );
    }

    const updated = await prisma.generatedDocument.update({
      where: { id },
      data: { status: "PENDING", attempts: 0, lastError: null },
      omit: { spec: true, sourceText: true },
    });

    void runPendingDocumentJobs();

    return updated;
  }

  async delete(userId: number, id: number) {
    const document = await prisma.generatedDocument.findFirst({
      where: { id, userId, isDeleted: false },
      select: { id: true, cloudinaryPublicId: true },
    });

    if (!document) {
      throw new ApiError("Document not found", STATUS_CODES.NOT_FOUND);
    }

    if (document.cloudinaryPublicId) {
      // Best-effort: a stale remote file must not block the local delete.
      await deleteFromCloudinary(document.cloudinaryPublicId).catch((error) => {
        console.error(
          `[document] Failed to delete Cloudinary asset for document ${id}:`,
          error,
        );
      });
    }

    return prisma.generatedDocument.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
      select: { id: true },
    });
  }
}

export default DocumentService;
