import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { CreateMessageBody } from "./message.types.js";
import {
    getPaginationOptions,
    formatPaginationResponse,
} from "@/utils/paginationUtils.js";

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

    async starResponse(userId: number, responseId: number, isStarred: boolean) {
        const response = await prisma.modelResponse.findFirst({
            where: { id: responseId },
            include: {
                chat: { select: { userId: true, isDeleted: true } },
                message: { select: { id: true, isDeleted: true, chatId: true } },
            },
        });

        if (
            !response ||
            response.chat.userId !== userId ||
            response.chat.isDeleted ||
            response.message.isDeleted
        ) {
            throw new ApiError("Response not found", STATUS_CODES.NOT_FOUND);
        }

        const updated = await prisma.modelResponse.update({
            where: { id: responseId },
            data: { isStarred },
            include: {
                model: { select: { id: true, name: true, externalId: true } },
            },
        });

        return updated;
    }

    async listStarredResponses(userId: number, query: any) {
        const { take, skip, page, pageSize } = getPaginationOptions(query, 30);
        const where = {
            isStarred: true,
            chat: {
                userId,
                isDeleted: false,
            },
            message: {
                isDeleted: false,
            },
        };

        const [responses, totalRecords] = await Promise.all([
            prisma.modelResponse.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: "desc" },
                include: {
                    model: { select: { id: true, name: true, externalId: true } },
                    chat: { select: { id: true, title: true } },
                    message: { select: { id: true, createdAt: true } },
                },
            }),
            prisma.modelResponse.count({ where }),
        ]);

        return formatPaginationResponse(responses, totalRecords, page, pageSize);
    }
}

export default MessageService;
