import prisma from "@root/prisma.js";
import { v4 as uuidv4 } from "uuid";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { CreateChatBody } from "./chat.types.js";
import {
  getPaginationOptions,
  formatPaginationResponse,
} from "@/utils/paginationUtils.js";
import { buildPrismaQuery } from "prisma-qb";

class ChatService {
  async create(userId: number, data: CreateChatBody) {
    if (data.folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: data.folderId, userId, isDeleted: false },
      });
      if (!folder)
        throw new ApiError("Folder not found", STATUS_CODES.NOT_FOUND);
    }

    if (data.assistantId) {
      const assistant = await prisma.assistant.findFirst({
        where: { id: data.assistantId, isActive: true, isDeleted: false },
      });
      if (!assistant)
        throw new ApiError(
          "Assistant not found or inactive",
          STATUS_CODES.NOT_FOUND,
        );
    }

    const chat = await prisma.chat.create({
      data: {
        title: data.title,
        userId,
        folderId: data.folderId ?? null,
        assistantId: data.assistantId ?? null,
      },
    });

    return chat;
  }

  async list(userId: number, query: any) {
    const { take, skip, page, pageSize } = getPaginationOptions(query, 20);

    const { where: qbWhere, orderBy } = buildPrismaQuery({
      query,
      searchFields: [{ field: "title" }],
      filterFields: [
        { key: "folderId", field: "folderId", type: "number" },
        { key: "isArchived", field: "isArchived", type: "boolean" },
      ],
      sortFields: [
        { key: "updatedAt", field: "updatedAt" },
        { key: "createdAt", field: "createdAt" },
      ],
      defaultSort: { key: "updatedAt", order: "desc" },
      softDelete: { field: "isDeleted", value: false },
      allowedQueryKeys: ["page", "pageSize"],
    });

    const where: any = { ...qbWhere, userId };

    if (query.folderId === 'null') {
      where.folderId = null;
    }

    const [chats, totalRecords] = await Promise.all([
      prisma.chat.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          assistant: { select: { id: true, name: true, icon: true } },
        },
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
              include: {
                model: { select: { id: true, name: true, externalId: true } },
              },
            },
          },
        },
      },
    });

    if (!chat) throw new ApiError("Chat not found", STATUS_CODES.NOT_FOUND);

    return chat;
  }

  async update(
    userId: number,
    chatId: number,
    data: {
      title?: string;
      folderId?: number | null;
      assistantId?: number | null;
    },
  ) {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId, isDeleted: false },
    });

    if (!chat) throw new ApiError("Chat not found", STATUS_CODES.NOT_FOUND);

    if (data.folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: data.folderId, userId, isDeleted: false },
      });
      if (!folder)
        throw new ApiError("Folder not found", STATUS_CODES.NOT_FOUND);
    }

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data,
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

  async pin(userId: number, chatId: number) {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId, isDeleted: false },
    });

    if (!chat) throw new ApiError("Chat not found", STATUS_CODES.NOT_FOUND);

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { isPinned: !chat.isPinned },
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

    if (!chat)
      throw new ApiError("Shared chat not found", STATUS_CODES.NOT_FOUND);

    return chat;
  }

  async feedback(userId: number, responseId: number, isLiked: boolean | null) {
    const response = await prisma.modelResponse.findFirst({
      where: { id: responseId },
      include: { chat: { select: { userId: true, isDeleted: true } } },
    });

    if (
      !response ||
      response.chat.userId !== userId ||
      response.chat.isDeleted
    ) {
      throw new ApiError("Response not found", STATUS_CODES.NOT_FOUND);
    }

    const updated = await prisma.modelResponse.update({
      where: { id: responseId },
      data: { isLiked },
    });

    return updated;
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
