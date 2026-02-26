import { Request, Response } from "express";
import prisma from "@root/prisma.js";
import OpenAI from "openai";
import { v2 as cloudinary } from "cloudinary";

interface SendMessageBody {
  content: string;
  modelId: number;
  chatType?: string;
}

export async function streamChat(req: Request, res: Response) {
  const userId = req.user!.id;
  const chatId = Number(req.params.chatId);
  const { content, modelId, chatType } = req.body as SendMessageBody;

  console.log("🎯 streamChat hit:", {
    userId,
    chatId,
    content,
    modelId,
    chatType,
  });

  try {
    // Validate inputs
    if (!content?.trim()) {
      res.status(400).json({ status: false, message: "Content is required" });
      return;
    }

    // Get chat
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId, isDeleted: false },
    });
    if (!chat) {
      res.status(404).json({ status: false, message: "Chat not found" });
      return;
    }

    // Get model
    const model = await prisma.model.findFirst({
      where: { id: modelId, isActive: true, isDeleted: false },
      include: { modelProvider: true },
    });
    if (!model) {
      res
        .status(404)
        .json({ status: false, message: "Model not found or inactive" });
      return;
    }

    // Check wallet
    const wallet = await prisma.userWallet.findUnique({ where: { userId } });
    if (!wallet || wallet.tokensRemaining <= 0) {
      res.status(400).json({ status: false, message: "Insufficient tokens" });
      return;
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: { chatId, role: "USER", content: content.trim() },
    });

    // Update chat title if first message
    const messageCount = await prisma.message.count({ where: { chatId } });
    if (messageCount === 1) {
      await prisma.chat.update({
        where: { id: chatId },
        data: { title: content.trim().substring(0, 60) },
      });
    }

    // Build conversation history
    const previousMessages = await prisma.message.findMany({
      where: { chatId, isDeleted: false },
      orderBy: { createdAt: "asc" },
      include: {
        modelResponses: {
          where: { status: "COMPLETED" },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const conversationHistory: {
      role: "user" | "assistant";
      content: string;
    }[] = [];
    for (const msg of previousMessages) {
      if (msg.role === "USER") {
        conversationHistory.push({ role: "user", content: msg.content });
      } else if (msg.role === "ASSISTANT" && msg.modelResponses[0]?.content) {
        conversationHistory.push({
          role: "assistant",
          content: msg.modelResponses[0].content,
        });
      }
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Send userMessage ID so frontend can track it
    res.write(
      `data: ${JSON.stringify({ type: "message_id", userMessageId: userMessage.id })}\n\n`,
    );
    if (typeof (res as any).flush === "function") {
      (res as any).flush();
    }

    // Call OpenRouter with streaming
    let fullContent = "";
    let promptTokens = 0;
    let completionTokens = 0;
    let imagesToUpload: string[] = [];

    const apiKey = process.env.OPENROUTER_API_KEY;
    console.log("🔑 OpenRouter Debug:");
    console.log("  Key exists:", !!apiKey);
    console.log("  Key length:", apiKey?.length || 0);
    console.log("  Key prefix:", apiKey?.substring(0, 12) + "...");
    console.log("  Model:", model.externalId);
    console.log("  Messages:", conversationHistory.length);

    try {
      console.log("🚀 Creating OpenRouter client...");
      const client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey || "",
        defaultHeaders: {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Colab Chat",
        },
      });

      console.log("📤 Sending request to OpenRouter...");
      console.log("  model:", model.externalId);
      console.log("  messages:", JSON.stringify(conversationHistory, null, 2));

      const stream = (await client.chat.completions.create({
        model: model.externalId,
        messages: conversationHistory,
        stream: true,
        stream_options: { include_usage: true },
        modalities: chatType === "IMAGE_GENERATION" ? ["image"] : undefined,
        plugins:
          chatType === "WEB_SEARCH"
            ? [{ id: "web", max_results: 5 }]
            : undefined,
      } as any)) as unknown as AsyncIterable<any>;

      console.log("📡 OpenRouter stream started, reading chunks...");
      let chunkIndex = 0;
      for await (const chunk of stream) {
        let delta = chunk.choices?.[0]?.delta?.content || "";

        // Handle images payload from OpenRouter
        const images =
          chunk.choices?.[0]?.delta?.images ||
          chunk.choices?.[0]?.message?.images;
        if (images && Array.isArray(images)) {
          const imageMd = images
            .map((img: any) => {
              const url = img.image_url?.url || img.url;
              if (url && !imagesToUpload.includes(url)) imagesToUpload.push(url);
              return `\n![Generated Image](${url})\n`;
            })
            .join("");
          if (imageMd) delta += imageMd;
        }

        if (delta) {
          fullContent += delta;
          res.write(
            `data: ${JSON.stringify({ type: "token", content: delta })}\n\n`,
          );
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
        }

        // Capture usage from the final chunk
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens || 0;
          completionTokens = chunk.usage.completion_tokens || 0;
        }
      }
      console.log("✅ Stream complete. Total chunks:", chunkIndex);
      console.log("📝 Full content:", fullContent);
    } catch (aiError: any) {
      console.error("❌ OpenRouter Error:");
      console.error("  Status:", aiError.status);
      console.error("  Message:", aiError.message);
      console.error(
        "  Error body:",
        JSON.stringify(aiError.error || aiError.response?.data, null, 2),
      );

      // Save whatever partial content we received so it doesn't vanish from the UI
      // Even if empty, we must create a FAILED message so the assistant bubble persists
      try {
        await prisma.$transaction(async (tx) => {
          const assistantMessage = await tx.message.create({
            data: { chatId, role: "ASSISTANT", content: fullContent || "" },
          });
          await tx.modelResponse.create({
            data: {
              chatId,
              messageId: assistantMessage.id,
              modelId: model.id,
              content: fullContent || "",
              promptTokens: promptTokens || 0,
              completionTokens: completionTokens || 0,
              totalTokens: (promptTokens || 0) + (completionTokens || 0),
              status: "FAILED",
              completedAt: new Date(),
            },
          });
        });
      } catch (dbErr) {
        console.error("Failed to save partial AI response to DB", dbErr);
      }

      res.write(
        `data: ${JSON.stringify({ type: "error", message: aiError.message || "AI request failed" })}\n\n`,
      );
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    if (imagesToUpload.length > 0) {
      console.log(`☁️ Uploading ${imagesToUpload.length} generated images to Cloudinary...`);
      for (const origUrl of imagesToUpload) {
        try {
          const result = await cloudinary.uploader.upload(origUrl, {
            folder: "ai-colab-chat/generated",
            format: "webp",
            quality: "auto"
          });
          if (result && result.secure_url) {
            fullContent = fullContent.split(origUrl).join(result.secure_url);
            console.log("  ✅ Image optimized & saved:", result.secure_url);
          }
        } catch (imgError) {
          console.error("  ❌ Failed to upload image to Cloudinary:", imgError);
        }
      }
    }

    const totalTokens = promptTokens + completionTokens;

    // Save assistant message + model response + deduct tokens in transaction
    await prisma.$transaction(async (tx) => {
      const assistantMessage = await tx.message.create({
        data: { chatId, role: "ASSISTANT", content: fullContent },
      });

      await tx.modelResponse.create({
        data: {
          chatId,
          messageId: assistantMessage.id,
          modelId: model.id,
          content: fullContent,
          promptTokens,
          completionTokens,
          totalTokens,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      if (totalTokens > 0) {
        await tx.usageLog.create({
          data: {
            userId,
            modelId: model.id,
            chatId,
            promptTokens,
            completionTokens,
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
      }
    });

    // Send done signal with usage info
    res.write(
      `data: ${JSON.stringify({ type: "done", promptTokens, completionTokens, totalTokens })}\n\n`,
    );
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Stream chat error:", error);
    if (!res.headersSent) {
      res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Internal server error",
      });
    } else {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
      );
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
}

export async function regenerateChat(req: Request, res: Response) {
  const userId = req.user!.id;
  const chatId = Number(req.params.chatId);
  const messageId = Number(req.params.messageId);
  const { modelId, chatType } = req.body as {
    modelId: number;
    chatType?: string;
  };

  console.log("🎯 regenerateChat hit:", {
    userId,
    chatId,
    messageId,
    modelId,
    chatType,
  });

  try {
    if (!modelId) {
      res.status(400).json({ status: false, message: "modelId is required" });
      return;
    }

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId, isDeleted: false },
    });
    if (!chat) {
      res.status(404).json({ status: false, message: "Chat not found" });
      return;
    }

    const model = await prisma.model.findFirst({
      where: { id: modelId, isActive: true, isDeleted: false },
      include: { modelProvider: true },
    });
    if (!model) {
      res
        .status(404)
        .json({ status: false, message: "Model not found or inactive" });
      return;
    }

    const wallet = await prisma.userWallet.findUnique({ where: { userId } });
    if (!wallet || wallet.tokensRemaining <= 0) {
      res.status(400).json({ status: false, message: "Insufficient tokens" });
      return;
    }

    const allMessages = await prisma.message.findMany({
      where: { chatId, isDeleted: false },
      orderBy: { createdAt: "asc" },
      include: {
        modelResponses: {
          where: { status: "COMPLETED" },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const targetIndex = allMessages.findIndex((m) => m.id === messageId);
    if (targetIndex === -1 || allMessages[targetIndex].role !== "ASSISTANT") {
      res
        .status(404)
        .json({ status: false, message: "Target assistant message not found" });
      return;
    }

    const previousMessages = allMessages.slice(0, targetIndex);
    const conversationHistory: {
      role: "user" | "assistant";
      content: string;
    }[] = [];
    for (const msg of previousMessages) {
      if (msg.role === "USER") {
        conversationHistory.push({ role: "user", content: msg.content });
      } else if (msg.role === "ASSISTANT" && msg.modelResponses[0]?.content) {
        conversationHistory.push({
          role: "assistant",
          content: msg.modelResponses[0].content,
        });
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    res.write(
      `data: ${JSON.stringify({ type: "message_id", userMessageId: previousMessages[previousMessages.length - 1]?.id || 0 })}\n\n`,
    );
    if (typeof (res as any).flush === "function") {
      (res as any).flush();
    }

    let fullContent = "";
    let promptTokens = 0;
    let completionTokens = 0;
    let imagesToUpload: string[] = [];

    const apiKey = process.env.OPENROUTER_API_KEY;

    try {
      const client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey || "",
        defaultHeaders: {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Colab Chat",
        },
      });

      const stream = (await client.chat.completions.create({
        model: model.externalId,
        messages: conversationHistory as any,
        stream: true,
        stream_options: { include_usage: true },
        modalities: chatType === "IMAGE_GENERATION" ? ["image"] : undefined,
        plugins:
          chatType === "WEB_SEARCH"
            ? [{ id: "web", max_results: 5 }]
            : undefined,
      } as any)) as unknown as AsyncIterable<any>;

      for await (const chunk of stream) {
        let delta = chunk.choices?.[0]?.delta?.content || "";

        const images =
          chunk.choices?.[0]?.delta?.images ||
          chunk.choices?.[0]?.message?.images;
        if (images && Array.isArray(images)) {
          const imageMd = images
            .map((img: any) => {
              const url = img.image_url?.url || img.url;
              if (url && !imagesToUpload.includes(url)) imagesToUpload.push(url);
              return `\n![Generated Image](${url})\n`;
            })
            .join("");
          if (imageMd) delta += imageMd;
        }

        if (delta) {
          fullContent += delta;
          res.write(
            `data: ${JSON.stringify({ type: "token", content: delta })}\n\n`,
          );
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
        }

        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens || 0;
          completionTokens = chunk.usage.completion_tokens || 0;
        }
      }
    } catch (aiError: any) {
      console.error("❌ OpenRouter Error in regenerate:", aiError.message);
      try {
        await prisma.modelResponse.create({
          data: {
            chatId,
            messageId,
            modelId: model.id,
            content: fullContent || "",
            promptTokens: promptTokens || 0,
            completionTokens: completionTokens || 0,
            totalTokens: (promptTokens || 0) + (completionTokens || 0),
            status: "FAILED",
            completedAt: new Date(),
          },
        });
      } catch (dbErr) {
        console.error("Failed to save partial AI response to DB", dbErr);
      }

      res.write(
        `data: ${JSON.stringify({ type: "error", message: aiError.message || "AI request failed" })}\n\n`,
      );
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    if (imagesToUpload.length > 0) {
      console.log(`☁️ Uploading ${imagesToUpload.length} generated images to Cloudinary...`);
      for (const origUrl of imagesToUpload) {
        try {
          const result = await cloudinary.uploader.upload(origUrl, {
            folder: "ai-colab-chat/generated",
            format: "webp",
            quality: "auto"
          });
          if (result && result.secure_url) {
            fullContent = fullContent.split(origUrl).join(result.secure_url);
            console.log("  ✅ Image optimized & saved:", result.secure_url);
          }
        } catch (imgError) {
          console.error("  ❌ Failed to upload image to Cloudinary:", imgError);
        }
      }
    }

    const totalTokens = promptTokens + completionTokens;

    await prisma.$transaction(async (tx) => {
      await tx.modelResponse.create({
        data: {
          chatId,
          messageId,
          modelId: model.id,
          content: fullContent,
          promptTokens,
          completionTokens,
          totalTokens,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      if (totalTokens > 0) {
        await tx.usageLog.create({
          data: {
            userId,
            modelId: model.id,
            chatId,
            promptTokens,
            completionTokens,
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
      }
    });

    res.write(
      `data: ${JSON.stringify({ type: "done", promptTokens, completionTokens, totalTokens })}\n\n`,
    );
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Regenerate chat error:", error);
    if (!res.headersSent) {
      res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Internal server error",
      });
    } else {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
      );
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
}
