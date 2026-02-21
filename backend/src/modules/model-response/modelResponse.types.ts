export interface CompleteResponseBody {
    chatId: number;
    messageId: number;
    modelId: number;
    content: string;
    promptTokens: number;
    completionTokens: number;
}
