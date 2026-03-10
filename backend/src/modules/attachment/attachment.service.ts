import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "@/utils/cloudinary.js";

class AttachmentService {
  private getImageModerationProviders(): string[] {
    const raw = (process.env.CLOUDINARY_IMAGE_MODERATION || "").trim();
    if (!raw) return [];
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private isBlockedByModeration(statuses?: string[]): boolean {
    if (!statuses || statuses.length === 0) return false;
    return statuses.some((status) =>
      ["rejected", "flagged", "blocked", "failed"].includes(status),
    );
  }

  private isPendingModeration(statuses?: string[]): boolean {
    if (!statuses || statuses.length === 0) return false;
    return statuses.some((status) => status === "pending");
  }

  private async uploadAttachmentWithModeration(file: Express.Multer.File) {
    const providers = this.getImageModerationProviders();
    const shouldModerateImage = file.mimetype.startsWith("image/");
    const moderationOption =
      shouldModerateImage && providers.length > 0 ? providers[0] : undefined;

    const result = await uploadToCloudinary(file.buffer, {
      folder: "ai-colab-chat/attachments",
      resourceType: "auto",
      moderation: moderationOption,
    });

    if (this.isBlockedByModeration(result.moderationStatuses)) {
      try {
        await deleteFromCloudinary(result.publicId);
      } catch {}
      throw new ApiError(
        "Image blocked by safety policy. Please upload a different image.",
        STATUS_CODES.BAD_REQUEST,
      );
    }

    if (this.isPendingModeration(result.moderationStatuses)) {
      try {
        await deleteFromCloudinary(result.publicId);
      } catch {}
      throw new ApiError(
        "Image is awaiting safety review. Please try a different image.",
        STATUS_CODES.BAD_REQUEST,
      );
    }

    return result;
  }

  /**
   * Delete an attachment by ID from Cloudinary and the Database.
   */
  async delete(id: number) {
    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new ApiError("Attachment not found", STATUS_CODES.NOT_FOUND);
    }

    if (attachment.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(attachment.cloudinaryPublicId);
      } catch (e) {
        console.error("Failed to delete from Cloudinary:", e);
      }
    }

    await prisma.attachment.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Upload a file to Cloudinary and save the attachment record.
   * Called BEFORE a message exists (presend flow); messageId is null until linked.
   */
  async presend(file: Express.Multer.File) {
    const result = await this.uploadAttachmentWithModeration(file);

    const attachment = await prisma.attachment.create({
      data: {
        messageId: undefined,
        fileName: file.originalname,
        fileUrl: result.url,
        cloudinaryPublicId: result.publicId,
        mimeType: file.mimetype,
        fileSize: file.size,
      },
    });

    return attachment;
  }

  /**
   * Link a set of (presend) attachments to a message.
   * Only links attachments that are currently unlinked (messageId = null).
   */
  async linkToMessage(attachmentIds: number[], messageId: number) {
    if (attachmentIds.length === 0) return;
    await prisma.attachment.updateMany({
      where: {
        id: { in: attachmentIds },
        messageId: null as any,
      },
      data: { messageId },
    });
  }

  /**
   * Fetch attachment records for the given IDs. Used by chat.stream to build
   * the OpenRouter content payload.
   */
  async findMany(attachmentIds: number[]) {
    return prisma.attachment.findMany({
      where: { id: { in: attachmentIds } },
    });
  }

  async create(userId: number, messageId: number, file: Express.Multer.File) {
    const message = await prisma.message.findFirst({
      where: { id: messageId, isDeleted: false },
      include: { chat: true },
    });

    if (!message || message.chat.userId !== userId) {
      throw new ApiError("Message not found", STATUS_CODES.NOT_FOUND);
    }

    const result = await this.uploadAttachmentWithModeration(file);

    const attachment = await prisma.attachment.create({
      data: {
        messageId,
        fileName: file.originalname,
        fileUrl: result.url,
        cloudinaryPublicId: result.publicId,
        mimeType: file.mimetype,
        fileSize: file.size,
      },
    });

    return attachment;
  }
}

export default AttachmentService;
