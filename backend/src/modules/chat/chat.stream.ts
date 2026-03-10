import { Request, Response } from "express";
import prisma from "@root/prisma.js";
import { uploadToCloudinary } from "@/utils/cloudinary.js";
import { createOpenRouterStream } from "@/utils/openrouter.js";
import { estimateMessageTokens } from "@/utils/tokenCounter.js";
import { checkPredefinedResponse } from "@/utils/predefinedResponses.js";
import AttachmentService from "@/modules/attachment/attachment.service.js";
import mammoth from "mammoth";
import { parseOffice } from "officeparser";

const attachmentService = new AttachmentService();

// ---------------------------------------------------------------------------
// Helpers for building OpenRouter multipart message content from attachments
// ---------------------------------------------------------------------------

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const PDF_MIME_TYPES = ["application/pdf"];
const WORD_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const PPT_MIME_TYPES = [
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const TEXT_MIME_TYPES = ["text/plain", "text/markdown", "text/x-markdown"];

interface AttachmentRecord {
  id: number;
  fileName: string;
  fileUrl: string;
  mimeType: string;
}

/**
 * Fetch a URL and return a base64 data URL string.
 */
async function urlToBase64DataUrl(
  url: string,
  mimeType: string,
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to fetch attachment: ${response.status}`);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Build the OpenRouter content-parts array for a user message that has attachments.
 * Returns:
 *   - contentParts  : array to use as message.content
 *   - extraPlugins  : any plugins needed (e.g. file-parser for PDFs)
 */
async function buildAttachmentContentParts(
  textContent: string,
  attachments: AttachmentRecord[],
): Promise<{ contentParts: any[]; extraPlugins: any[] }> {
  const parts: any[] = [];
  const extraPlugins: any[] = [];
  let hasPdf = false;
  let extraText = "";

  for (const att of attachments) {
    const mime = att.mimeType;

    if (IMAGE_MIME_TYPES.includes(mime)) {
      // Fetch image from Cloudinary and send as base64 — avoids URL fetch issues on OpenRouter
      try {
        const dataUrl = await urlToBase64DataUrl(att.fileUrl, mime);
        parts.push({ type: "image_url", image_url: { url: dataUrl } });
      } catch (e) {
        console.error("Failed to fetch image attachment", att.fileName, e);
        // Fallback: send URL directly
        parts.push({ type: "image_url", image_url: { url: att.fileUrl } });
      }
    } else if (PDF_MIME_TYPES.includes(mime)) {
      hasPdf = true;
      // Fetch PDF from Cloudinary and send as base64 data URL
      // This is more reliable than relying on OpenRouter to fetch the Cloudinary URL
      try {
        const dataUrl = await urlToBase64DataUrl(
          att.fileUrl,
          "application/pdf",
        );
        parts.push({
          type: "file",
          file: { filename: att.fileName, file_data: dataUrl },
        });
      } catch (e) {
        console.error("Failed to fetch PDF attachment", att.fileName, e);
        // Fallback: send URL directly
        parts.push({
          type: "file",
          file: { filename: att.fileName, file_data: att.fileUrl },
        });
      }
    } else if (WORD_MIME_TYPES.includes(mime)) {
      try {
        const response = await fetch(att.fileUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const result = await mammoth.extractRawText({ buffer });
          const text = result.value.trim();
          if (text) {
            extraText += `\n\n[Attached Word Document: ${att.fileName}]\n${text}`;
          }
        }
      } catch (e) {
        console.error(
          "Failed to extract text from Word document",
          att.fileName,
          e,
        );
      }
    } else if (PPT_MIME_TYPES.includes(mime)) {
      try {
        const response = await fetch(att.fileUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          try {
            const ast = await parseOffice(buffer as any);
            const text = ast.toText();
            if (text && text.trim()) {
              extraText += `\n\n[Attached PowerPoint Presentation: ${att.fileName}]\n${text.trim()}`;
            }
          } catch (parseError) {
            console.error(
              "OfficeParser failed to parse PPTX buffer for",
              att.fileName,
              parseError,
            );
          }
        }
      } catch (e) {
        console.error(
          "Failed to extract text from PowerPoint",
          att.fileName,
          e,
        );
      }
    } else if (TEXT_MIME_TYPES.includes(mime)) {
      // Fetch the raw text from Cloudinary URL and append inline
      try {
        const response = await fetch(att.fileUrl);
        if (response.ok) {
          const text = await response.text();
          extraText += `\n\n[Attached text file: ${att.fileName}]\n${text}`;
        }
      } catch (e) {
        console.error("Failed to fetch text attachment", att.fileName, e);
      }
    }
  }

  if (hasPdf) {
    extraPlugins.push({ id: "file-parser", pdf: { engine: "pdf-text" } });
  }

  // Text part always comes first so the model reads the user's question before files
  const finalText = textContent + extraText;
  parts.unshift({ type: "text", text: finalText });

  return { contentParts: parts, extraPlugins };
}

async function checkTokenLimitsAndSetupStream(
  res: Response,
  wallet: any,
  model: any,
  conversationHistory: any[],
  chatId: number,
  assistantMessageId: number,
  messageIdPayload: Record<string, any>,
  enableFollowUpQuestions: boolean,
): Promise<{ maxCompletionTokens: number; trimmedHistory: any[] } | null> {
  const tokenMultiplier = model.tokenMultiplier || 1.0;
  const maxAffordableTokens = Math.floor(
    wallet.tokensRemaining / tokenMultiplier,
  );

  res.setHeader("Content-Type", "text-event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(
    `data: ${JSON.stringify({ type: "message_id", ...messageIdPayload })}\n\n`,
  );
  if (typeof (res as any).flush === "function") {
    (res as any).flush();
  }

  // Extract the very latest message (the new user prompt)
  const latestPrompt = conversationHistory.pop();
  if (!latestPrompt) {
    return { maxCompletionTokens: maxAffordableTokens, trimmedHistory: [] };
  }

  // Check if just the newest prompt itself is too large (including a 100 token buffer for the response)
  const MIN_RESPONSE_TOKENS = 100;
  let currentHistoryTokens = estimateMessageTokens([latestPrompt]);

  if (currentHistoryTokens + MIN_RESPONSE_TOKENS >= maxAffordableTokens) {
    res.write(
      `data: ${JSON.stringify({ type: "error", message: "Insufficient tokens for this prompt length." })}\n\n`,
    );
    res.write("data: [DONE]\n\n");
    res.end();

    await prisma.modelResponse.create({
      data: {
        chatId,
        messageId: assistantMessageId,
        modelId: model.id,
        content: "System: Insufficient tokens for this prompt.",
        promptTokens: currentHistoryTokens,
        completionTokens: 0,
        totalTokens: currentHistoryTokens,
        status: "FAILED",
        completedAt: new Date(),
      },
    });
    return null;
  }

  // Start adding older messages back in from newest to oldest
  const reversedHistory = conversationHistory.reverse();
  const trimmedHistoryData: any[] = [];

  for (const msg of reversedHistory) {
    const msgTokens = estimateMessageTokens([msg]) - 3; // subtracting base overhead per message loop
    if (
      currentHistoryTokens + msgTokens + MIN_RESPONSE_TOKENS <
      maxAffordableTokens
    ) {
      currentHistoryTokens += msgTokens;
      trimmedHistoryData.unshift(msg);
    } else {
      // Reached the token limit, drop the rest of the older messages
      break;
    }
  }

  // Always append the latest prompt at the end so the AI responds to the current message
  if (enableFollowUpQuestions) {
    const promptWithInstructions = {
      ...latestPrompt,
      content: `${latestPrompt.content}\n\n---\nBased on your response, suggest 4 concise follow-up questions the user could ask next. Format them as a JSON array of strings inside a \`\`\`json block at the very end of your response.`,
    };
    trimmedHistoryData.push(promptWithInstructions);
  } else {
    trimmedHistoryData.push(latestPrompt);
  }

  // Set a hard absolute upper limit of 10,000 raw tokens for generating tokens in a single response
  // Note: For models with multipliers, this could incur up to 30k billable tokens (e.g. 3x Opus)
  const ABSOLUTE_MAX_COMPLETION = 10000;

  const maxCompletionTokens = Math.min(
    Math.max(1, maxAffordableTokens - currentHistoryTokens),
    ABSOLUTE_MAX_COMPLETION,
  );

  return { maxCompletionTokens, trimmedHistory: trimmedHistoryData };
}

interface SendMessageBody {
  content: string;
  modelId: number;
  chatType?: string;
  userMessageId?: number;
  assistantMessageId?: number;
  attachmentIds?: number[];
}

export async function streamChat(req: Request, res: Response) {
  const userId = req.user!.id;
  const chatId = Number(req.params.chatId);
  const {
    content,
    modelId,
    chatType,
    userMessageId,
    assistantMessageId,
    attachmentIds,
  } = req.body as SendMessageBody;

  try {
    // Validate inputs
    if (!content?.trim()) {
      res.status(400).json({ status: false, message: "Content is required" });
      return;
    }

    if (attachmentIds && attachmentIds.length > 5) {
      res.status(400).json({
        status: false,
        message: "Maximum 5 attachments allowed per message",
      });
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

    // Reuse existing user message or create a new one
    let userMessage: { id: number };
    if (userMessageId) {
      const existing = await prisma.message.findFirst({
        where: { id: userMessageId, chatId, role: "USER" },
      });
      if (!existing) {
        res
          .status(400)
          .json({ status: false, message: "Invalid userMessageId" });
        return;
      }
      userMessage = existing;
    } else {
      userMessage = await prisma.message.create({
        data: { chatId, role: "USER", content: content.trim() },
      });

      // Link any presend attachments to this new message
      if (attachmentIds && attachmentIds.length > 0) {
        await attachmentService.linkToMessage(attachmentIds, userMessage.id);
      }

      // Update chat title if first message
      const messageCount = await prisma.message.count({ where: { chatId } });
      if (messageCount === 1) {
        await prisma.chat.update({
          where: { id: chatId },
          data: { title: content.trim().substring(0, 60) },
        });
      }
    }

    // Reuse existing assistant message or create a new (empty) one early
    // so its ID can be sent to the frontend immediately
    let assistantMessage: { id: number };
    if (assistantMessageId) {
      const existing = await prisma.message.findFirst({
        where: { id: assistantMessageId, chatId, role: "ASSISTANT" },
      });
      if (!existing) {
        res
          .status(400)
          .json({ status: false, message: "Invalid assistantMessageId" });
        return;
      }
      assistantMessage = existing;
    } else {
      assistantMessage = await prisma.message.create({
        data: { chatId, role: "ASSISTANT", content: "" },
      });
    }

    // Build conversation history
    const previousMessages = await prisma.message.findMany({
      where: { chatId, isDeleted: false, id: { not: assistantMessage.id } },
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
      role: "user" | "assistant" | "system";
      content: string | any[];
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

    const userPreference = await prisma.userPreference.findUnique({
      where: { userId },
    });
    const enableFollowUpQuestions =
      userPreference?.enableFollowUpQuestions !== false;

    // -----------------------------------------------------------------------
    // Assistant persona injection – prepend assistant system prompt first
    // so it sits at the very beginning of the conversation context.
    // Context memory (user personalisation) is stacked on top of it next.
    // -----------------------------------------------------------------------
    let assistantTemperature: number | undefined;
    if (chat.assistantId) {
      const chatAssistant = await prisma.assistant.findFirst({
        where: { id: chat.assistantId, isActive: true, isDeleted: false },
      });
      if (chatAssistant) {
        conversationHistory.unshift({
          role: "system",
          content: chatAssistant.systemPrompt,
        });
        assistantTemperature = chatAssistant.temperature;
      }
    }

    // Prepend context memory as a system message (zero extra queries — already fetched above)
    const contextItems = userPreference?.contextMemory || [];
    if (contextItems.length > 0) {
      const systemContent = `User context (personalisation — always keep in mind):\n${contextItems.map((c) => `- ${c}`).join("\n")}`;
      conversationHistory.unshift({ role: "system", content: systemContent });
    }

    // Build multipart content for current message if attachments are present
    let attachmentPlugins: any[] = [];
    if (attachmentIds && attachmentIds.length > 0) {
      const attachments = await attachmentService.findMany(attachmentIds);
      if (attachments.length > 0) {
        const { contentParts, extraPlugins } =
          await buildAttachmentContentParts(content.trim(), attachments);
        // Replace the last user message with the multipart version
        // (checkTokenLimitsAndSetupStream will use the last item as latestPrompt)
        conversationHistory.push({ role: "user", content: contentParts });
        attachmentPlugins = extraPlugins;
      }
    }

    // If no attachments were pushed above, push the plain text version
    if (attachmentPlugins.length === 0 && (attachmentIds?.length ?? 0) === 0) {
      conversationHistory.push({ role: "user", content: content.trim() });
    } else if (
      attachmentPlugins.length === 0 &&
      (attachmentIds?.length ?? 0) > 0
    ) {
      // Attachments array was provided but all records were missing — fall back to text
      conversationHistory.push({ role: "user", content: content.trim() });
    }

    const tokenLimits = await checkTokenLimitsAndSetupStream(
      res,
      wallet,
      model,
      conversationHistory,
      chatId,
      assistantMessage.id,
      {
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
      },
      enableFollowUpQuestions,
    );
    if (tokenLimits === null) return;
    const { maxCompletionTokens, trimmedHistory } = tokenLimits;

    // Merge attachment plugins (from above) into the stream call
    const streamPlugins = attachmentPlugins;

    // -----------------------------------------------------------------------
    // Predefined response intercept – platform identity / greetings / about
    // -----------------------------------------------------------------------
    const predefinedText = checkPredefinedResponse(
      content,
      userPreference?.contextMemory,
    );
    if (predefinedText) {
      // Stream word-by-word with a small delay (same feel as OpenRouter)
      const words = predefinedText.split(" ");
      let streamedContent = "";
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? "" : " ") + words[i];
        streamedContent += chunk;
        res.write(
          `data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`,
        );
        if (typeof (res as any).flush === "function") (res as any).flush();
        await new Promise((r) => setTimeout(r, 15));
      }

      // Calculate tokens using 3.5 chars/token estimator + model multiplier
      const pTokens = Math.ceil(content.length / 3.5);
      const cTokens = Math.ceil(predefinedText.length / 3.5);
      const tTokens = pTokens + cTokens;
      const tokenMultiplierPre = model.tokenMultiplier || 1.0;
      const billablePromptPre = Math.ceil(pTokens * tokenMultiplierPre);
      const billableCompletionPre = Math.ceil(cTokens * tokenMultiplierPre);
      const billableTotalPre = billablePromptPre + billableCompletionPre;

      await prisma.$transaction(async (tx) => {
        await tx.message.update({
          where: { id: assistantMessage.id },
          data: { content: streamedContent },
        });
        await tx.modelResponse.create({
          data: {
            chatId,
            messageId: assistantMessage.id,
            modelId: model.id,
            content: streamedContent,
            promptTokens: pTokens,
            completionTokens: cTokens,
            totalTokens: tTokens,
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
        await tx.usageLog.create({
          data: {
            userId,
            modelId: model.id,
            chatId,
            messageId: assistantMessage.id,
            capability: (chatType || "STANDARD") as any,
            promptTokens: pTokens,
            completionTokens: cTokens,
            totalTokens: tTokens,
            billablePromptTokens: billablePromptPre,
            billableCompletionTokens: billableCompletionPre,
            billableTotalTokens: billableTotalPre,
          },
        });
        await tx.userWallet.update({
          where: { userId },
          data: {
            tokensRemaining: { decrement: billableTotalPre },
            tokensUsed: { increment: billableTotalPre },
          },
        });
      });

      res.write(
        `data: ${JSON.stringify({ type: "done", promptTokens: pTokens, completionTokens: cTokens, totalTokens: tTokens })}\n\n`,
      );
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    // Call OpenRouter with streaming
    let fullContent = "";
    let promptTokens = 0;
    let completionTokens = 0;
    let imagesToUpload: string[] = [];

    try {
      const stream = await createOpenRouterStream({
        model: model.externalId,
        messages: trimmedHistory,
        chatType,
        max_tokens: maxCompletionTokens,
        plugins: streamPlugins.length > 0 ? streamPlugins : undefined,
        temperature: assistantTemperature,
      });

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
              if (url && !imagesToUpload.includes(url))
                imagesToUpload.push(url);
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
        await prisma.modelResponse.create({
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
        // Update assistant message content with whatever we got
        await prisma.message.update({
          where: { id: assistantMessage.id },
          data: { content: fullContent || "" },
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
      for (const origUrl of imagesToUpload) {
        try {
          const result = await uploadToCloudinary(origUrl, {
            folder: "ai-colab-chat/generated",
            format: "webp",
            quality: "auto",
          });
          if (result && result.url) {
            fullContent = fullContent.split(origUrl).join(result.url);
          }
        } catch (imgError) {
          console.error("  ❌ Failed to upload image to Cloudinary:", imgError);
        }
      }
    }

    const totalTokens = promptTokens + completionTokens;
    const tokenMultiplier = model.tokenMultiplier || 1.0;
    const billablePromptTokens = Math.ceil(promptTokens * tokenMultiplier);
    const billableCompletionTokens = Math.ceil(
      completionTokens * tokenMultiplier,
    );
    const billableTotalTokens = billablePromptTokens + billableCompletionTokens;

    // Update assistant message + create model response + deduct tokens in transaction
    await prisma.$transaction(async (tx) => {
      await tx.message.update({
        where: { id: assistantMessage.id },
        data: { content: fullContent },
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
            messageId: assistantMessage.id,
            capability: (chatType || "STANDARD") as any,
            promptTokens,
            completionTokens,
            totalTokens,
            billablePromptTokens,
            billableCompletionTokens,
            billableTotalTokens,
          },
        });

        await tx.userWallet.update({
          where: { userId },
          data: {
            tokensRemaining: { decrement: billableTotalTokens },
            tokensUsed: { increment: billableTotalTokens },
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
      role: "user" | "assistant" | "system";
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

    const userPreference = await prisma.userPreference.findUnique({
      where: { userId },
    });
    const enableFollowUpQuestions =
      userPreference?.enableFollowUpQuestions !== false;

    // Prepend context memory as a system message
    const contextItemsRegen = userPreference?.contextMemory || [];
    if (contextItemsRegen.length > 0) {
      const systemContent = `User context (personalisation — always keep in mind):\n${contextItemsRegen.map((c) => `- ${c}`).join("\n")}`;
      conversationHistory.unshift({ role: "system", content: systemContent });
    }

    const prevMessageId =
      previousMessages[previousMessages.length - 1]?.id || 0;
    const tokenLimits = await checkTokenLimitsAndSetupStream(
      res,
      wallet,
      model,
      conversationHistory,
      chatId,
      messageId,
      { userMessageId: prevMessageId },
      enableFollowUpQuestions,
    );
    if (tokenLimits === null) return;
    const { maxCompletionTokens, trimmedHistory } = tokenLimits;

    // -----------------------------------------------------------------------
    // Predefined response intercept (regenerate path)
    // -----------------------------------------------------------------------
    const prevUserMsg = previousMessages[previousMessages.length - 1];
    const originalContent =
      prevUserMsg?.role === "USER" ? prevUserMsg.content : "";
    const predefinedTextRegen = originalContent
      ? checkPredefinedResponse(originalContent, userPreference?.contextMemory)
      : null;
    if (predefinedTextRegen) {
      const words = predefinedTextRegen.split(" ");
      let streamedContent = "";
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? "" : " ") + words[i];
        streamedContent += chunk;
        res.write(
          `data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`,
        );
        if (typeof (res as any).flush === "function") (res as any).flush();
        await new Promise((r) => setTimeout(r, 15));
      }

      const pTokens = Math.ceil(originalContent.length / 3.5);
      const cTokens = Math.ceil(predefinedTextRegen.length / 3.5);
      const tTokens = pTokens + cTokens;
      const tokenMultiplierRegen = model.tokenMultiplier || 1.0;
      const billablePromptRegen = Math.ceil(pTokens * tokenMultiplierRegen);
      const billableCompletionRegen = Math.ceil(cTokens * tokenMultiplierRegen);
      const billableTotalRegen = billablePromptRegen + billableCompletionRegen;

      await prisma.$transaction(async (tx) => {
        await tx.modelResponse.create({
          data: {
            chatId,
            messageId,
            modelId: model.id,
            content: streamedContent,
            promptTokens: pTokens,
            completionTokens: cTokens,
            totalTokens: tTokens,
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
        await tx.usageLog.create({
          data: {
            userId,
            modelId: model.id,
            chatId,
            messageId,
            capability: (chatType || "STANDARD") as any,
            promptTokens: pTokens,
            completionTokens: cTokens,
            totalTokens: tTokens,
            billablePromptTokens: billablePromptRegen,
            billableCompletionTokens: billableCompletionRegen,
            billableTotalTokens: billableTotalRegen,
          },
        });
        await tx.userWallet.update({
          where: { userId },
          data: {
            tokensRemaining: { decrement: billableTotalRegen },
            tokensUsed: { increment: billableTotalRegen },
          },
        });
      });

      res.write(
        `data: ${JSON.stringify({ type: "done", promptTokens: pTokens, completionTokens: cTokens, totalTokens: tTokens })}\n\n`,
      );
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    let fullContent = "";
    let promptTokens = 0;
    let completionTokens = 0;
    let imagesToUpload: string[] = [];

    try {
      const stream = await createOpenRouterStream({
        model: model.externalId,
        messages: trimmedHistory,
        chatType,
        max_tokens: maxCompletionTokens,
      });

      for await (const chunk of stream) {
        let delta = chunk.choices?.[0]?.delta?.content || "";

        const images =
          chunk.choices?.[0]?.delta?.images ||
          chunk.choices?.[0]?.message?.images;
        if (images && Array.isArray(images)) {
          const imageMd = images
            .map((img: any) => {
              const url = img.image_url?.url || img.url;
              if (url && !imagesToUpload.includes(url))
                imagesToUpload.push(url);
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
      for (const origUrl of imagesToUpload) {
        try {
          const result = await uploadToCloudinary(origUrl, {
            folder: "ai-colab-chat/generated",
            format: "webp",
            quality: "auto",
          });
          if (result && result.url) {
            fullContent = fullContent.split(origUrl).join(result.url);
          }
        } catch (imgError) {
          console.error("  ❌ Failed to upload image to Cloudinary:", imgError);
        }
      }
    }

    const totalTokens = promptTokens + completionTokens;
    const tokenMultiplier = model.tokenMultiplier || 1.0;
    const billablePromptTokens = Math.ceil(promptTokens * tokenMultiplier);
    const billableCompletionTokens = Math.ceil(
      completionTokens * tokenMultiplier,
    );
    const billableTotalTokens = billablePromptTokens + billableCompletionTokens;

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
            messageId,
            capability: (chatType || "STANDARD") as any,
            promptTokens,
            completionTokens,
            totalTokens,
            billablePromptTokens,
            billableCompletionTokens,
            billableTotalTokens,
          },
        });

        await tx.userWallet.update({
          where: { userId },
          data: {
            tokensRemaining: { decrement: billableTotalTokens },
            tokensUsed: { increment: billableTotalTokens },
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

export async function prepareMulti(req: Request, res: Response) {
  const userId = req.user!.id;
  const chatId = Number(req.params.chatId);
  const { content, attachmentIds } = req.body as {
    content: string;
    attachmentIds?: number[];
  };

  try {
    if (!content?.trim()) {
      res.status(400).json({ status: false, message: "Content is required" });
      return;
    }

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId, isDeleted: false },
    });
    if (!chat) {
      res.status(404).json({ status: false, message: "Chat not found" });
      return;
    }

    // Create user message
    const userMessage = await prisma.message.create({
      data: { chatId, role: "USER", content: content.trim() },
    });

    if (attachmentIds && attachmentIds.length > 0) {
      await attachmentService.linkToMessage(attachmentIds, userMessage.id);
    }

    // Update chat title if first message
    const messageCount = await prisma.message.count({ where: { chatId } });
    if (messageCount === 1) {
      await prisma.chat.update({
        where: { id: chatId },
        data: { title: content.trim().substring(0, 60) },
      });
    }

    // Create empty assistant message
    const assistantMessage = await prisma.message.create({
      data: { chatId, role: "ASSISTANT", content: "" },
    });

    res.json({
      status: true,
      data: {
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
      },
    });
  } catch (error: any) {
    console.error("Prepare multi error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
}

export async function editAndResend(req: Request, res: Response) {
  const userId = req.user!.id;
  const chatId = Number(req.params.chatId);
  const originalMessageId = Number(req.params.messageId);
  const { content, modelId, chatType } = req.body as {
    content: string;
    modelId: number;
    chatType?: string;
  };

  try {
    if (!content?.trim()) {
      res.status(400).json({ status: false, message: "Content is required" });
      return;
    }
    if (!modelId) {
      res.status(400).json({ status: false, message: "modelId is required" });
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

    // Find original user message
    const originalMessage = await prisma.message.findFirst({
      where: { id: originalMessageId, chatId, role: "USER", isDeleted: false },
    });
    if (!originalMessage) {
      res
        .status(404)
        .json({ status: false, message: "Original message not found" });
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

    // Find the assistant response paired with the original user message
    // so we can preserve it for version navigation
    const pairedAssistant = await prisma.message.findFirst({
      where: {
        chatId,
        role: "ASSISTANT",
        isDeleted: false,
        createdAt: { gt: originalMessage.createdAt },
      },
      orderBy: { createdAt: "asc" },
    });

    // Soft-delete messages that came AFTER the paired assistant
    // (preserves the original user→assistant pair for version switching)
    if (pairedAssistant) {
      await prisma.message.updateMany({
        where: {
          chatId,
          isDeleted: false,
          createdAt: { gt: pairedAssistant.createdAt },
        },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    }

    // Determine the root message id for editedFromId
    // If the original was itself an edit, chain to the same root
    const rootMessageId = originalMessage.editedFromId || originalMessage.id;

    // Create new user message linked to original
    const newUserMessage = await prisma.message.create({
      data: {
        chatId,
        role: "USER",
        content: content.trim(),
        editedFromId: rootMessageId,
      },
    });

    // Create empty assistant message
    const assistantMessage = await prisma.message.create({
      data: { chatId, role: "ASSISTANT", content: "" },
    });

    // Build conversation history from messages BEFORE the original message
    const previousMessages = await prisma.message.findMany({
      where: {
        chatId,
        isDeleted: false,
        createdAt: { lt: originalMessage.createdAt },
      },
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
    // Add the new edited user message
    conversationHistory.push({ role: "user", content: content.trim() });

    const userPreference = await prisma.userPreference.findUnique({
      where: { userId },
    });
    const enableFollowUpQuestions =
      userPreference?.enableFollowUpQuestions !== false;

    const tokenLimits = await checkTokenLimitsAndSetupStream(
      res,
      wallet,
      model,
      conversationHistory,
      chatId,
      assistantMessage.id,
      {
        userMessageId: newUserMessage.id,
        assistantMessageId: assistantMessage.id,
      },
      enableFollowUpQuestions,
    );
    if (tokenLimits === null) return;
    const { maxCompletionTokens, trimmedHistory } = tokenLimits;

    // Stream AI response
    let fullContent = "";
    let promptTokens = 0;
    let completionTokens = 0;
    let imagesToUpload: string[] = [];

    try {
      const stream = await createOpenRouterStream({
        model: model.externalId,
        messages: trimmedHistory,
        chatType,
        max_tokens: maxCompletionTokens,
      });

      for await (const chunk of stream) {
        let delta = chunk.choices?.[0]?.delta?.content || "";

        const images =
          chunk.choices?.[0]?.delta?.images ||
          chunk.choices?.[0]?.message?.images;
        if (images && Array.isArray(images)) {
          const imageMd = images
            .map((img: any) => {
              const url = img.image_url?.url || img.url;
              if (url && !imagesToUpload.includes(url))
                imagesToUpload.push(url);
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
      console.error("❌ OpenRouter Error in editAndResend:", aiError.message);
      try {
        await prisma.modelResponse.create({
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
        await prisma.message.update({
          where: { id: assistantMessage.id },
          data: { content: fullContent || "" },
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

    // Upload images to Cloudinary
    if (imagesToUpload.length > 0) {
      for (const origUrl of imagesToUpload) {
        try {
          const result = await uploadToCloudinary(origUrl, {
            folder: "ai-colab-chat/generated",
            format: "webp",
            quality: "auto",
          });
          if (result && result.url) {
            fullContent = fullContent.split(origUrl).join(result.url);
          }
        } catch (imgError) {
          console.error("  ❌ Failed to upload image to Cloudinary:", imgError);
        }
      }
    }

    const totalTokens = promptTokens + completionTokens;
    const tokenMultiplier = model.tokenMultiplier || 1.0;
    const billablePromptTokens = Math.ceil(promptTokens * tokenMultiplier);
    const billableCompletionTokens = Math.ceil(
      completionTokens * tokenMultiplier,
    );
    const billableTotalTokens = billablePromptTokens + billableCompletionTokens;

    // Save response + deduct tokens
    await prisma.$transaction(async (tx) => {
      await tx.message.update({
        where: { id: assistantMessage.id },
        data: { content: fullContent },
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
            messageId: assistantMessage.id,
            capability: (chatType || "STANDARD") as any,
            promptTokens,
            completionTokens,
            totalTokens,
            billablePromptTokens,
            billableCompletionTokens,
            billableTotalTokens,
          },
        });

        await tx.userWallet.update({
          where: { userId },
          data: {
            tokensRemaining: { decrement: billableTotalTokens },
            tokensUsed: { increment: billableTotalTokens },
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
    console.error("Edit and resend error:", error);
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

// --- Multi-Model Edit Preparation ---
export async function prepareEditMulti(req: Request, res: Response) {
  const userId = req.user!.id;
  const chatId = Number(req.params.chatId);
  const messageId = Number(req.params.messageId);
  const { content } = req.body as { content: string };

  try {
    if (!content?.trim()) {
      res.status(400).json({ status: false, message: "Content is required" });
      return;
    }

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId, isDeleted: false },
    });
    if (!chat) {
      res.status(404).json({ status: false, message: "Chat not found" });
      return;
    }

    const originalMessage = await prisma.message.findFirst({
      where: { id: messageId, chatId, isDeleted: false },
    });
    if (!originalMessage || originalMessage.role !== "USER") {
      res
        .status(404)
        .json({ status: false, message: "Original user message not found" });
      return;
    }

    // Check user tokens mapping
    const wallet = await prisma.userWallet.findUnique({ where: { userId } });
    if (!wallet || wallet.tokensRemaining <= 0) {
      res.status(400).json({ status: false, message: "Insufficient tokens" });
      return;
    }

    const pairedAssistant = await prisma.message.findFirst({
      where: {
        chatId,
        role: "ASSISTANT",
        isDeleted: false,
        createdAt: { gt: originalMessage.createdAt },
      },
      orderBy: { createdAt: "asc" },
    });

    if (pairedAssistant) {
      await prisma.message.updateMany({
        where: {
          chatId,
          isDeleted: false,
          createdAt: { gt: pairedAssistant.createdAt },
        },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    }

    const rootMessageId = originalMessage.editedFromId || originalMessage.id;

    // Create user message
    const newUserMessage = await prisma.message.create({
      data: {
        chatId,
        role: "USER",
        content: content.trim(),
        editedFromId: rootMessageId,
      },
    });

    // Create empty assistant message
    const assistantMessage = await prisma.message.create({
      data: { chatId, role: "ASSISTANT", content: "" },
    });

    res.json({
      status: true,
      data: {
        userMessageId: newUserMessage.id,
        assistantMessageId: assistantMessage.id,
      },
    });
  } catch (error: any) {
    console.error("prepareEditMulti error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
}
