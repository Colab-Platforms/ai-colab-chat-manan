import OpenAI from "openai";

export interface OpenRouterStreamOptions {
  model: string;
  messages: any[];
  chatType?: string;
  max_tokens?: number;
}

export const createOpenRouterStream = async (
  options: OpenRouterStreamOptions,
): Promise<AsyncIterable<any>> => {
  const { model, messages, chatType } = options;
  const apiKey = process.env.OPENROUTER_API_KEY;

  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey || "",
    defaultHeaders: {
      "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
      "X-Title": "AI Colab Chat",
    },
  });

  const stream = (await client.chat.completions.create({
    model,
    messages: messages as any,
    max_tokens: options.max_tokens,
    stream: true,
    stream_options: { include_usage: true },
    modalities: chatType === "IMAGE_GENERATION" ? ["image"] : undefined,
    plugins:
      chatType === "WEB_SEARCH" ? [{ id: "web", max_results: 2 }] : undefined,
  } as any)) as unknown as AsyncIterable<any>;

  return stream;
};
