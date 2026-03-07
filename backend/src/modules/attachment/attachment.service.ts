import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "@/utils/cloudinary.js";

class AttachmentService {
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
    const result = await uploadToCloudinary(file.buffer, {
      folder: "ai-colab-chat/attachments",
      resourceType: "auto",
    });

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

    const result = await uploadToCloudinary(file.buffer, {
      folder: "ai-colab-chat/attachments",
      resourceType: "auto",
    });

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
