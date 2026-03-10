import OpenAI from "openai";

export interface OpenRouterStreamOptions {
  model: string;
  messages: any[];
  chatType?: string;
  max_tokens?: number;
  plugins?: any[];
  temperature?: number;
}

export const createOpenRouterStream = async (
  options: OpenRouterStreamOptions,
): Promise<AsyncIterable<any>> => {
  const { model, messages, chatType, plugins } = options;
  const apiKey = process.env.OPENROUTER_API_KEY;

  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey || "",
    defaultHeaders: {
      "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
      "X-Title": "AI Colab Chat",
    },
  });

  // Merge caller-supplied plugins with any capability-driven ones
  const builtinPlugins: any[] = [];
  if (chatType === "WEB_SEARCH")
    builtinPlugins.push({ id: "web", max_results: 2 });
  const allPlugins = [...builtinPlugins, ...(plugins ?? [])];

  const stream = (await client.chat.completions.create({
    model,
    messages: messages as any,
    max_tokens: options.max_tokens,
    temperature: options.temperature,
    n: chatType === "IMAGE_GENERATION" ? 1 : undefined,
    stream: true,
    stream_options: { include_usage: true },
    modalities: chatType === "IMAGE_GENERATION" ? ["image"] : undefined,
    plugins: allPlugins.length > 0 ? allPlugins : undefined,
  } as any)) as unknown as AsyncIterable<any>;

  return stream;
};
