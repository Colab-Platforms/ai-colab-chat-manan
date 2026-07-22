import prisma from "@root/prisma.js";
import OpenAI from "openai";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { CreateMessageBody, EnhancePromptBody } from "./message.types.js";
import {
  getPaginationOptions,
  formatPaginationResponse,
} from "@/utils/paginationUtils.js";
import { estimateTokenCount } from "@/utils/tokenCounter.js";
import { createWalletTransaction } from "@/utils/walletUtils.js";
import { buildPrismaQuery } from "prisma-qb";

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
        throw new ApiError(
          "Original message not found",
          STATUS_CODES.NOT_FOUND,
        );
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
    const { where: qbWhere, orderBy } = buildPrismaQuery({
      query,
      searchFields: [{ field: "content" }],
      filterFields: [],
      sortFields: [{ key: "updatedAt", field: "updatedAt" }],
      defaultSort: { key: "updatedAt", order: "asc" },
      allowedQueryKeys: ["page", "pageSize"],
    });

    const where = {
      ...qbWhere,
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
        orderBy,
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

  async enhancePrompt(userId: number, data: EnhancePromptBody) {
    const prompt = data.prompt.trim();

    const model = await prisma.model.findFirst({
      where: {
        externalId: "openai/gpt-4.1",
        isActive: true,
        isDeleted: false,
      },
    });

    if (!model) {
      throw new ApiError(
        "Enhance model is not available",
        STATUS_CODES.BAD_REQUEST,
      );
    }

    const wallet = await prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new ApiError(
        "Wallet not found. Please subscribe to a plan first",
        STATUS_CODES.BAD_REQUEST,
      );
    }

    if (wallet.tokensRemaining <= 0) {
      throw new ApiError("Insufficient tokens", STATUS_CODES.BAD_REQUEST);
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new ApiError(
        "OpenRouter API key is not configured",
        STATUS_CODES.SERVER_ERROR,
      );
    }

    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
        "X-Title": "AI Colab Chat",
      },
    });

    const systemInstruction =
      "Rewrite the user prompt to be clearer, more specific, and more likely to produce high-quality AI responses. Keep the same intent and language. Return only the improved prompt text with no labels, quotes, markdown, or explanations.";
    console.log("--- Sending Enhance Prompt Request to OpenRouter ---");
    console.log(`Model: ${model.externalId}`);
    console.log("Messages:");
    console.log(`  [0] SYSTEM: ${systemInstruction}`);
    console.log(`  [1] USER: ${prompt}`);
    console.log("--------------------------------------------------");

    const completion = await client.chat.completions.create({
      model: model.externalId,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
    });

    const enhancedPrompt = completion.choices?.[0]?.message?.content?.trim();
    if (!enhancedPrompt) {
      throw new ApiError("Failed to enhance prompt", STATUS_CODES.SERVER_ERROR);
    }

    const promptTokens =
      completion.usage?.prompt_tokens ??
      estimateTokenCount(systemInstruction) + estimateTokenCount(prompt);
    const completionTokens =
      completion.usage?.completion_tokens ?? estimateTokenCount(enhancedPrompt);
    const totalTokens = promptTokens + completionTokens;

    const tokenMultiplier = model.tokenMultiplier ?? 1.0;
    const billablePromptTokens = Math.ceil(promptTokens * tokenMultiplier);
    const billableCompletionTokens = Math.ceil(
      completionTokens * tokenMultiplier,
    );
    const billableTotalTokens = billablePromptTokens + billableCompletionTokens;

    if (wallet.tokensRemaining <= 0) {
      throw new ApiError("Token limit exceeded", STATUS_CODES.BAD_REQUEST);
    }

    if (wallet.tokensRemaining < billableTotalTokens) {
      throw new ApiError("Insufficient tokens", STATUS_CODES.BAD_REQUEST);
    }

    await prisma.$transaction(async (tx) => {
      await tx.usageLog.create({
        data: {
          userId,
          modelId: model.id,
          capability: "STANDARD",
          promptTokens,
          completionTokens,
          totalTokens,
          billablePromptTokens,
          billableCompletionTokens,
          billableTotalTokens,
        },
      });

      const updatedWallet = await tx.userWallet.update({
        where: { userId },
        data: {
          tokensRemaining: { decrement: billableTotalTokens },
          tokensUsed: { increment: billableTotalTokens },
        },
      });

      await createWalletTransaction(tx, {
        userId,
        walletId: updatedWallet.id,
        amount: billableTotalTokens,
        type: "DEBIT",
        referenceId: `chat_usage_enhance_prompt`,
        meta: {
          reason: "ENHANCE_PROMPT_USAGE",
          modelId: model.id,
        },
      });
    });

    return {
      enhancedPrompt,
      model: {
        id: model.id,
        name: model.name,
        externalId: model.externalId,
      },
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        billablePromptTokens,
        billableCompletionTokens,
        billableTotalTokens,
      },
    };
  }
}

export default MessageService;
