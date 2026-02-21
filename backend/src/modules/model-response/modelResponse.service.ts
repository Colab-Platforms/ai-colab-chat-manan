import prisma from "@root/prisma";
import { ApiError } from "@/utils/ApiError";
import STATUS_CODES from "@/utils/statusCodes";
import { CompleteResponseBody } from "./modelResponse.types";

class ModelResponseService {
    async completeResponse(userId: number, data: CompleteResponseBody) {
        const totalTokens = data.promptTokens + data.completionTokens;

        const chat = await prisma.chat.findFirst({
            where: { id: data.chatId, userId, isDeleted: false },
        });
        if (!chat) throw new ApiError("Chat not found", STATUS_CODES.NOT_FOUND);

        const message = await prisma.message.findFirst({
            where: { id: data.messageId, chatId: data.chatId, isDeleted: false },
        });
        if (!message) throw new ApiError("Message not found", STATUS_CODES.NOT_FOUND);

        const model = await prisma.model.findFirst({
            where: { id: data.modelId, isDeleted: false },
        });
        if (!model) throw new ApiError("Model not found", STATUS_CODES.NOT_FOUND);

        const result = await prisma.$transaction(async (tx) => {
            const wallet = await tx.userWallet.findUnique({
                where: { userId },
            });

            if (!wallet) {
                throw new ApiError("Wallet not found. Please subscribe to a plan first", STATUS_CODES.BAD_REQUEST);
            }

            if (wallet.tokensRemaining < totalTokens) {
                throw new ApiError("Insufficient tokens", STATUS_CODES.BAD_REQUEST);
            }

            const modelResponse = await tx.modelResponse.create({
                data: {
                    chatId: data.chatId,
                    messageId: data.messageId,
                    modelId: data.modelId,
                    content: data.content,
                    promptTokens: data.promptTokens,
                    completionTokens: data.completionTokens,
                    totalTokens,
                    status: "COMPLETED",
                    completedAt: new Date(),
                },
            });

            await tx.usageLog.create({
                data: {
                    userId,
                    modelId: data.modelId,
                    chatId: data.chatId,
                    promptTokens: data.promptTokens,
                    completionTokens: data.completionTokens,
                    totalTokens,
                },
            });

            await tx.userWallet.update({
                where: { userId },
                data: {
                    tokensRemaining: { decrement: totalTokens },
                    tokensUsed: { increment: totalTokens },
                },
            });

            return modelResponse;
        });

        return result;
    }
}

export default ModelResponseService;
