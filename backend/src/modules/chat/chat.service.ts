import prisma from "@root/prisma";
import { v4 as uuidv4 } from "uuid";
import { ApiError } from "@/utils/ApiError";
import STATUS_CODES from "@/utils/statusCodes";
import { CreateChatBody } from "./chat.types";
import { getPaginationOptions, formatPaginationResponse } from "@/utils/paginationUtils";

class ChatService {
    async create(userId: number, data: CreateChatBody) {
        if (data.folderId) {
            const folder = await prisma.folder.findFirst({
                where: { id: data.folderId, userId, isDeleted: false },
            });
            if (!folder) throw new ApiError("Folder not found", STATUS_CODES.NOT_FOUND);
        }

        const chat = await prisma.chat.create({
            data: {
                title: data.title,
                userId,
                folderId: data.folderId ?? null,
            },
        });

        return chat;
    }

    async list(userId: number, query: any) {
        const { take, skip, page, pageSize } = getPaginationOptions(query, 20);

        const where: any = { userId, isDeleted: false };
        if (query.folderId) where.folderId = parseInt(query.folderId);
        if (query.isArchived !== undefined) where.isArchived = query.isArchived === "true";

        const [chats, totalRecords] = await Promise.all([
            prisma.chat.findMany({
                where,
                skip,
                take,
                orderBy: { updatedAt: "desc" },
            }),
            prisma.chat.count({ where }),
        ]);

        return formatPaginationResponse(chats, totalRecords, page, pageSize);
    }

    async getById(userId: number, chatId: number) {
        const chat = await prisma.chat.findFirst({
            where: { id: chatId, userId, isDeleted: false },
            include: {
                messages: {
                    where: { isDeleted: false },
                    orderBy: { createdAt: "asc" },
                    include: {
                        attachments: true,
                        modelResponses: {
                            include: { model: { select: { id: true, name: true, externalId: true } } },
                        },
                    },
                },
            },
        });

        if (!chat) throw new ApiError("Chat not found", STATUS_CODES.NOT_FOUND);

        return chat;
    }

    async update(userId: number, chatId: number, data: { title?: string; folderId?: number | null }) {
        const chat = await prisma.chat.findFirst({
            where: { id: chatId, userId, isDeleted: false },
        });

        if (!chat) throw new ApiError("Chat not found", STATUS_CODES.NOT_FOUND);

        if (data.folderId) {
            const folder = await prisma.folder.findFirst({
                where: { id: data.folderId, userId, isDeleted: false },
            });
            if (!folder) throw new ApiError("Folder not found", STATUS_CODES.NOT_FOUND);
        }

        const updated = await prisma.chat.update({
            where: { id: chatId },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.folderId !== undefined && { folderId: data.folderId }),
            },
        });

        return updated;
    }

    async archive(userId: number, chatId: number) {
        const chat = await prisma.chat.findFirst({
            where: { id: chatId, userId, isDeleted: false },
        });

        if (!chat) throw new ApiError("Chat not found", STATUS_CODES.NOT_FOUND);

        const updated = await prisma.chat.update({
            where: { id: chatId },
            data: { isArchived: !chat.isArchived },
        });

        return updated;
    }

    async share(userId: number, chatId: number) {
        const chat = await prisma.chat.findFirst({
            where: { id: chatId, userId, isDeleted: false },
        });

        if (!chat) throw new ApiError("Chat not found", STATUS_CODES.NOT_FOUND);

        const updated = await prisma.chat.update({
            where: { id: chatId },
            data: {
                isShared: true,
                shareId: chat.shareId ?? uuidv4(),
                sharedAt: chat.sharedAt ?? new Date(),
            },
        });

        return updated;
    }

    async getShared(shareId: string) {
        const chat = await prisma.chat.findFirst({
            where: { shareId, isShared: true, isDeleted: false },
            include: {
                messages: {
                    where: { isDeleted: false },
                    orderBy: { createdAt: "asc" },
                    include: {
                        attachments: true,
                        modelResponses: {
                            include: { model: { select: { id: true, name: true } } },
                        },
                    },
                },
                user: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        if (!chat) throw new ApiError("Shared chat not found", STATUS_CODES.NOT_FOUND);

        return chat;
    }

    async softDelete(userId: number, chatId: number) {
        const chat = await prisma.chat.findFirst({
            where: { id: chatId, userId, isDeleted: false },
        });

        if (!chat) throw new ApiError("Chat not found", STATUS_CODES.NOT_FOUND);

        await prisma.chat.update({
            where: { id: chatId },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        return { message: "Chat deleted successfully" };
    }
}

export default ChatService;
