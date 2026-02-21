import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";

class AttachmentService {
    async create(userId: number, messageId: number, file: Express.Multer.File) {
        const message = await prisma.message.findFirst({
            where: { id: messageId, isDeleted: false },
            include: { chat: true },
        });

        if (!message || message.chat.userId !== userId) {
            throw new ApiError("Message not found", STATUS_CODES.NOT_FOUND);
        }

        const attachment = await prisma.attachment.create({
            data: {
                messageId,
                fileName: file.originalname,
                fileUrl: `/uploads/attachments/${file.filename}`,
                mimeType: file.mimetype,
                fileSize: file.size,
            },
        });

        return attachment;
    }
}

export default AttachmentService;
