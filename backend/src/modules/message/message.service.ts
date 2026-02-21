import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { CreateMessageBody } from "./message.types.js";

class MessageService {
    async create(userId: number, data: CreateMessageBody) {
        const chat = await prisma.chat.findFirst({
            where: { id: data.chatId, userId, isDeleted: false },
        });

        if (!chat) {
            throw new ApiError("Chat not found", STATUS_CODES.NOT_FOUND);
        }

        if (data.editedFromId) {
            const originalMessage = await prisma.message.findFirst({
                where: { id: data.editedFromId, chatId: data.chatId, isDeleted: false },
            });
            if (!originalMessage) {
                throw new ApiError("Original message not found", STATUS_CODES.NOT_FOUND);
            }
        }

        const message = await prisma.message.create({
            data: {
                chatId: data.chatId,
                content: data.content,
                role: "USER",
                editedFromId: data.editedFromId ?? null,
            },
            include: { attachments: true },
        });

        return message;
    }
}

export default MessageService;
