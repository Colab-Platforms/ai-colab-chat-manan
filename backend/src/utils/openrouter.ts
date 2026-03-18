import OpenAI from "openai";

export interface OpenRouterStreamOptions {
  model: string;
  messages: any[];
  chatType?: string;
  max_tokens?: number;
  plugins?: any[];
  temperature?: number;
  signal?: AbortSignal;
}

export const createOpenRouterStream = async (
  options: OpenRouterStreamOptions,
): Promise<AsyncIterable<any>> => {
  const { model, messages, chatType, plugins, signal } = options;
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
    builtinPlugins.push({
      id: "web",
      max_results: 2,
      search_context_size: "medium",
    });
  const allPlugins = [...builtinPlugins, ...(plugins ?? [])];

  console.log("--- Sending Request to OpenRouter ---");
  console.log(`Model: ${model}`);
  console.log(`Chat Type: ${chatType}`);
  console.log("Messages:");
  messages.forEach((msg, index) => {
    console.log(`  [${index}] ${msg.role.toUpperCase()}:`);
    if (typeof msg.content === "string") {
      console.log(`      ${msg.content.replace(/\n/g, "\n      ")}`);
    } else {
      console.log(`      ${JSON.stringify(msg.content, null, 2).replace(/\n/g, "\n      ")}`);
    }
  });
  console.log("---------------------------------------");

  const stream = (await client.chat.completions.create(
    {
      model,
      messages: messages as any,
      max_tokens: options.max_tokens,
      temperature: options.temperature,
      n: chatType === "IMAGE_GENERATION" ? 1 : undefined,
      stream: true,
      stream_options: { include_usage: true },
      modalities: chatType === "IMAGE_GENERATION" ? ["image"] : undefined,
      plugins: allPlugins.length > 0 ? allPlugins : undefined,
    } as any,
    signal ? ({ signal } as any) : undefined,
  )) as unknown as AsyncIterable<any>;

  return stream;
};
