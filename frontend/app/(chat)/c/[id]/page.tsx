"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { notFound, useParams } from "next/navigation";
import { chatService, modelService, messageService, assistantService } from "@/lib/services";
import { MessageList } from "@/components/chat/message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { toast } from "react-toastify";
import * as LucideIcons from "lucide-react";
import { Bot, Sparkles, MessageSquare } from "lucide-react";

const SUGGESTED_PROMPTS = [
  { text: "Brainstorm ideas for...", value: "Brainstorm ideas for ", icon: Sparkles, className: "w-3.5 h-3.5 inline mr-2" },
  { text: "Help me write a...", value: "Help me write a ", icon: MessageSquare, className: "w-3.5 h-3.5 inline mr-2" },
  { text: "Explain how...", value: "Explain how ", icon: MessageSquare, className: "w-3.5 h-3.5 inline mr-2 inline-block transform scale-x-[-1]" },
];

interface Model {
  id: number;
  name: string;
  description: string | null;
  externalId?: string;
  isDefault?: boolean;
  defaultForCapabilities?: string[];
}

interface Message {
  id: number;
  role: string;
  content: string;
  createdAt: string;
  editedFromId?: number | null;
  attachments?: any[];
  modelResponses?: any[];
  chatType?: string;
}

export default function ChatPage() {
  const params = useParams();
  const chatId = Number(params.id);
  const [shouldForceScrollFromStarred, setShouldForceScrollFromStarred] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const modelsRef = useRef<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<number[]>([]);
  const [activeModelTabs, setActiveModelTabs] = useState<Record<number, number>>({});
  const [isSending, setIsSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [editVersionIndices, setEditVersionIndices] = useState<Record<number, number>>({});
  const [isNotFound, setIsNotFound] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [assistant, setAssistant] = useState<{ id: number; name: string; description?: string | null; icon: string } | null>(null);
  const firstMessageSent = useRef(false);
  const isStreamingRef = useRef(false);
  const modelsRestoredRef = useRef(false);
  const streamAbortControllersRef = useRef<AbortController[]>([]);
  const stopRequestedRef = useRef(false);

  const clearStreamAbortControllers = useCallback(() => {
    streamAbortControllersRef.current = [];
  }, []);

  const createStreamAbortController = useCallback(() => {
    const controller = new AbortController();
    streamAbortControllersRef.current.push(controller);
    if (stopRequestedRef.current) {
      controller.abort();
    }
    return controller;
  }, []);

  const isAbortError = (error: any) =>
    error?.name === "AbortError" ||
    error?.code === "ABORT_ERR" ||
    String(error?.message || "").toLowerCase().includes("aborted");

  const stopStreaming = useCallback(() => {
    stopRequestedRef.current = true;
    streamAbortControllersRef.current.forEach((controller) => controller.abort());
    toast.info("Generation stopped");
  }, []);

  const fetchChat = useCallback(async () => {
    try {
      const res = await chatService.getById(chatId);
      const chat = res.data.data;

      // Load assistant info if this chat has one
      if (chat.assistantId) {
        try {
          const aRes = await assistantService.getById(chat.assistantId);
          setAssistant(aRes.data.data);
        } catch { /* ignore */ }
      } else {
        setAssistant(null);
      }

      setMessages((prev) => {
        if (isStreamingRef.current) return prev;
        return chat.messages || [];
      });

      const tabs: Record<number, number> = {};
      (chat.messages || []).forEach((msg: Message) => {
        if (msg.modelResponses && msg.modelResponses.length > 0) {
          tabs[msg.id] = msg.modelResponses[0].model.id;
        }
      });
      
      setActiveModelTabs((prev) => {
        if (isStreamingRef.current) return prev;
        return tabs;
      });

      // Restore selected models from chat history (only on first load)
      if (!modelsRestoredRef.current && !isStreamingRef.current) {
        modelsRestoredRef.current = true;
        const stored = localStorage.getItem(`chat_${chatId}_models`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSelectedModels(parsed);
              return;
            }
          } catch { /* ignore */ }
        }
        const lastAssistantMsg = (chat.messages || [])
          .filter((m: Message) => m.role === "ASSISTANT")
          .pop();
        if (lastAssistantMsg?.modelResponses?.length > 0) {
          const usedModelIds = [...new Set(lastAssistantMsg.modelResponses.map((mr: any) => mr.model.id))] as number[];
          if (usedModelIds.length > 0) {
            setSelectedModels(usedModelIds);
          }
        }
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setIsNotFound(true);
      }
    }
  }, [chatId]);

  const syncChatAfterStop = useCallback(() => {
    window.setTimeout(() => {
      fetchChat();
    }, 500);
  }, [fetchChat]);

  const fetchModels = useCallback(async () => {
    try {
      const res = await modelService.list({ pageSize: "100" });
      const allModels = res.data.data?.data || [];
      const activeModels = allModels.filter((m: any) => m.isActive);
      setModels(activeModels);
      modelsRef.current = activeModels;
      
      if (activeModels.length > 0 && selectedModels.length === 0) {
        const storedModelId = localStorage.getItem("preferredModelId");
        const parsedId = storedModelId ? Number(storedModelId) : null;
        
        let resolvedModelIds: number[];
        if (parsedId && activeModels.find((m: any) => m.id === parsedId)) {
          resolvedModelIds = [parsedId];
        } else {
          const defaultModels = activeModels.filter((m: any) => m.defaultForCapabilities?.includes("STANDARD"));
          resolvedModelIds = defaultModels.length > 0
            ? defaultModels.map((m: any) => m.id)
            : [activeModels[0].id];
        }
        setSelectedModels(resolvedModelIds);

        // Fire pending first message from new-chat redirect (sessionStorage handoff)
        if (!firstMessageSent.current) {
          const raw = sessionStorage.getItem(`pending_chat_${chatId}`);
          if (raw) {
            firstMessageSent.current = true;
            sessionStorage.removeItem(`pending_chat_${chatId}`);
            try {
              const { content, modelIds, chatType, attachmentIds, attachmentObjects } = JSON.parse(raw);
              // Use the model IDs from the home page if valid, otherwise fall back to resolved
              const targetIds = Array.isArray(modelIds) && modelIds.length > 0 ? modelIds : resolvedModelIds;
              setSelectedModels(targetIds);
              // Use setTimeout to ensure state has settled before sending
              setTimeout(() => sendMessage(content, attachmentIds, targetIds, chatType, attachmentObjects), 0);
            } catch { /* ignore */ }
          }
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, selectedModels.length]);

  const handleModelChange = (ids: number[]) => {
    setSelectedModels(ids);
    localStorage.setItem(`chat_${chatId}_models`, JSON.stringify(ids));
    if (ids.length > 0) {
      localStorage.setItem("preferredModelId", String(ids[0]));
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const openedFromStarredChatId = sessionStorage.getItem("open_chat_from_starred");
    if (openedFromStarredChatId === String(chatId)) {
      setShouldForceScrollFromStarred(true);
      sessionStorage.removeItem("open_chat_from_starred");
    } else {
      setShouldForceScrollFromStarred(false);
    }
  }, [chatId]);

  useEffect(() => {
    fetchModels();
    fetchChat();
  }, [fetchModels, fetchChat]);

  useEffect(() => {
    if (!shouldForceScrollFromStarred) return;
    let attempt = 0;
    const maxAttempts = 8;

    const scrollToBottom = () => {
      const container = document.getElementById("chat-scroll-container");
      const anchor = document.getElementById("chat-bottom-anchor");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      anchor?.scrollIntoView({ behavior: "auto", block: "end" });

      if (attempt < maxAttempts) {
        attempt += 1;
        setTimeout(scrollToBottom, 80);
      }
    };

    scrollToBottom();
  }, [shouldForceScrollFromStarred, messages.length]);

  const streamSingleModel = (
    mid: number,
    streamingMsgId: number,
    token: string,
    apiUrl: string,
    content: string,
    chatType: string | undefined,
    userMessageId: number,
    assistantMessageId: number,
    attachmentIds?: number[],
    signal?: AbortSignal,
  ) => {
    return fetch(`${apiUrl}/chats/${chatId}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        modelId: mid,
        chatType,
        userMessageId,
        assistantMessageId,
        ...(attachmentIds && attachmentIds.length > 0 ? { attachmentIds } : {}),
      }),
      signal,
    }).then(async (response) => {
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const chunkStr of lines) {
            const line = chunkStr.trim();
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "token") {
                accumulated += parsed.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === streamingMsgId
                      ? {
                          ...msg,
                          modelResponses: msg.modelResponses?.map((mr: any) =>
                            mr.model.id === mid
                              ? { ...mr, content: accumulated, status: "STREAMING" }
                              : mr
                          ),
                        }
                      : msg
                  )
                );
              } else if (parsed.type === "error") {
                const errorMessage = parsed.message || "Generation failed";
                accumulated = errorMessage;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === streamingMsgId
                      ? {
                          ...msg,
                          modelResponses: msg.modelResponses?.map((mr: any) =>
                            mr.model.id === mid
                              ? { ...mr, content: errorMessage, status: "FAILED" }
                              : mr
                          ),
                        }
                      : msg
                  )
                );
                toast.error(`${modelsRef.current.find((m) => m.id === mid)?.name || "Model"}: ${parsed.message}`);
              } else if (parsed.type === "done") {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === streamingMsgId
                      ? {
                          ...msg,
                          modelResponses: msg.modelResponses?.map((mr: any) =>
                            mr.model.id === mid
                              ? { ...mr, content: accumulated, status: "COMPLETED" }
                              : mr
                          ),
                        }
                      : msg
                  )
                );
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    });
  };

  const sendMessage = async (content: string, attachmentIds?: number[], modelIds?: number[], chatType?: string, attachmentObjects?: any[]) => {
    if (isSending) return;
    stopRequestedRef.current = false;
    clearStreamAbortControllers();
    setIsSending(true);
    setIsStreaming(true);
    isStreamingRef.current = true;
    setStreamingContent("");

    const targetModelIds = modelIds && modelIds.length > 0 ? modelIds : [...selectedModels];
    if (targetModelIds.length === 0) {
      toast.error("Please select a model");
      setIsSending(false);
      setIsStreaming(false);
      return;
    }

    // Persist selected models
    localStorage.setItem(`chat_${chatId}_models`, JSON.stringify(targetModelIds));

    // Optimistically add user message
    const tempUserMsgId = Date.now();
    setMessages((prev) => [...prev, {
      id: tempUserMsgId,
      role: "USER",
      content,
      createdAt: new Date().toISOString(),
      attachments: attachmentObjects || [],
    }]);

    // Add streaming placeholder with one response per model
    const streamingMsgId = Date.now() + 1;
    setMessages((prev) => [...prev, {
      id: streamingMsgId,
      role: "ASSISTANT",
      content: "",
      createdAt: new Date().toISOString(),
      chatType,
      modelResponses: targetModelIds.map((mid) => ({
        id: mid,
        model: { id: mid, name: modelsRef.current.find((m) => m.id === mid)?.name || "AI" },
        content: "",
        status: "STREAMING",
        tokensUsed: null,
      })),
    }]);
    setActiveModelTabs((prev) => ({ ...prev, [streamingMsgId]: targetModelIds[0] }));

    const token = localStorage.getItem("token") || "";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    try {
      if (targetModelIds.length === 1) {
        const controller = createStreamAbortController();
        // Single model: use existing /send endpoint directly (creates user+assistant msg)
        await streamSingleModel(
          targetModelIds[0], streamingMsgId, token, apiUrl,
          content, chatType, 0, 0, attachmentIds, controller.signal
        );
      } else {
        // Multi model: call /prepare-multi FIRST to get IDs, then fire ALL streams at once
        const prepRes = await fetch(`${apiUrl}/chats/${chatId}/prepare-multi`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ content, attachmentIds }),
        });

        if (!prepRes.ok) {
          const errData = await prepRes.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to prepare messages");
        }

        const prepData = await prepRes.json();
        const { userMessageId, assistantMessageId } = prepData.data;

        // Fire ALL models simultaneously — no waiting between them!
        const responses = await Promise.allSettled(
          targetModelIds.map((mid) =>
            streamSingleModel(
              mid,
              streamingMsgId,
              token,
              apiUrl,
              content,
              chatType,
              userMessageId,
              assistantMessageId,
              attachmentIds,
              createStreamAbortController().signal
            )
          )
        );
        responses.forEach((result, idx) => {
          if (result.status !== "rejected") return;
          const mid = targetModelIds[idx];
          if (isAbortError(result.reason) || stopRequestedRef.current) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === streamingMsgId
                  ? {
                      ...msg,
                      modelResponses: msg.modelResponses?.map((mr: any) =>
                        mr.model.id === mid
                          ? { ...mr, status: "FAILED", content: mr.content || "Generation stopped by user." }
                          : mr
                      ),
                    }
                  : msg
              )
            );
            return;
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMsgId
                ? {
                    ...msg,
                    modelResponses: msg.modelResponses?.map((mr: any) =>
                      mr.model.id === mid
                        ? { ...mr, status: "FAILED", content: result.reason?.message || "Failed to stream response" }
                        : mr
                    ),
                  }
                : msg
            )
          );
          toast.error(`${modelsRef.current.find((m) => m.id === mid)?.name || "Model"}: ${result.reason?.message || "Failed to stream response"}`);
        });
      }

      isStreamingRef.current = false;
      await fetchChat();
      // Dispatch refresh so sidebar title updates after first message
      window.dispatchEvent(new Event("refresh-chats"));
    } catch (err: any) {
      if (isAbortError(err) || stopRequestedRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMsgId
              ? {
                  ...msg,
                  modelResponses: msg.modelResponses?.map((mr: any) =>
                    mr.status === "STREAMING"
                      ? { ...mr, status: "FAILED", content: mr.content || "Generation stopped by user." }
                      : mr
                  ),
                }
              : msg
          )
        );
        isStreamingRef.current = false;
        syncChatAfterStop();
      } else {
        toast.error(err.message || "Failed to send message");
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsgId && m.id !== streamingMsgId));
      }
    } finally {
      clearStreamAbortControllers();
      isStreamingRef.current = false;
      setIsSending(false);
      setIsStreaming(false);
      setStreamingContent("");
      stopRequestedRef.current = false;
    }
  };

  const handleRegenerate = async (messageId: number, modelId: number) => {
    if (isSending) return;
    stopRequestedRef.current = false;
    clearStreamAbortControllers();
    setIsSending(true);
    setIsStreaming(true);
    isStreamingRef.current = true;
    setStreamingContent("");

    const targetMsg = messages.find(m => m.id === messageId);
    if (!targetMsg || targetMsg.role !== "ASSISTANT") {
      toast.error("Can only regenerate assistant messages");
      setIsSending(false);
      setIsStreaming(false);
      return;
    }

    const streamingRespId = Date.now();
    setMessages((prev) => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          chatType: msg.chatType || localStorage.getItem("preferredChatType") || "STANDARD",
          modelResponses: [
            ...(msg.modelResponses || []),
            {
              id: streamingRespId,
              model: { id: modelId, name: modelsRef.current.find((m) => m.id === modelId)?.name || "AI" },
              content: "",
              status: "STREAMING",
              tokensUsed: null,
            }
          ]
        };
      }
      return msg;
    }));
    setActiveModelTabs((prev) => ({ ...prev, [messageId]: modelId }));

    try {
      const token = localStorage.getItem("token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const controller = createStreamAbortController();

      const response = await fetch(`${apiUrl}/chats/${chatId}/messages/${messageId}/regenerate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ modelId, chatType: localStorage.getItem("preferredChatType") || "STANDARD" }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to regenerate message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const chunkStr of lines) {
            const line = chunkStr.trim();
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "token") {
                accumulated += parsed.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          modelResponses: msg.modelResponses?.map((mr: any) =>
                            mr.id === streamingRespId
                              ? { ...mr, content: accumulated, status: "STREAMING" }
                              : mr
                          ),
                        }
                      : msg
                  )
                );
              } else if (parsed.type === "error") {
                const errorMessage = parsed.message || "Generation failed";
                accumulated = errorMessage;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          modelResponses: msg.modelResponses?.map((mr: any) =>
                            mr.id === streamingRespId
                              ? { ...mr, content: errorMessage, status: "FAILED" }
                              : mr
                          ),
                        }
                      : msg
                  )
                );
                toast.error(errorMessage);
              } else if (parsed.type === "done") {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          modelResponses: msg.modelResponses?.map((mr: any) =>
                            mr.id === streamingRespId
                              ? { ...mr, content: accumulated, status: "COMPLETED" }
                              : mr
                          ),
                        }
                      : msg
                  )
                );
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }

      isStreamingRef.current = false;
      await fetchChat();
    } catch (err: any) {
      if (isAbortError(err) || stopRequestedRef.current) {
        setMessages((prev) => prev.map(msg => {
          if (msg.id !== messageId) return msg;
          return {
            ...msg,
            modelResponses: msg.modelResponses?.map((mr: any) =>
              mr.id === streamingRespId
                ? { ...mr, status: "FAILED", content: mr.content || "Generation stopped by user." }
                : mr
            )
          };
        }));
        isStreamingRef.current = false;
        syncChatAfterStop();
      } else {
        toast.error(err.message || "Failed to regenerate message");
        setMessages((prev) => prev.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              modelResponses: msg.modelResponses?.filter((mr: any) => mr.id !== streamingRespId)
            };
          }
          return msg;
        }));
      }
    } finally {
      clearStreamAbortControllers();
      isStreamingRef.current = false;
      setIsSending(false);
      setIsStreaming(false);
      setStreamingContent("");
      stopRequestedRef.current = false;
    }
  };

  const handleFeedback = async (responseId: number, isLiked: boolean | null) => {
    try {
      setMessages((prev) => prev.map(msg => ({
        ...msg,
        modelResponses: msg.modelResponses?.map((mr: any) => 
          mr.id === responseId ? { ...mr, isLiked } : mr
        )
      })));
      await chatService.feedback(chatId, responseId, isLiked);
    } catch {
      toast.error("Failed to submit feedback");
      fetchChat();
    }
  };

  const handleModelTabChange = (messageId: number, modelId: number) => {
    setActiveModelTabs((prev) => ({ ...prev, [messageId]: modelId }));
  };

  const handleToggleStar = async (responseId: number, isStarred: boolean) => {
    setMessages((prev) =>
      prev.map((msg) => ({
        ...msg,
        modelResponses: msg.modelResponses?.map((mr: any) =>
          mr.id === responseId ? { ...mr, isStarred } : mr
        ),
      }))
    );
    try {
      await messageService.starResponse(responseId, isStarred);
    } catch {
      toast.error("Failed to update starred state");
      fetchChat();
    }
  };

  const handleEnhancePrompt = async (prompt: string) => {
    const res = await messageService.enhancePrompt(prompt);
    return res.data.data;
  };

  const handleEditVersionChange = (rootMessageId: number, versionIndex: number) => {
    setEditVersionIndices((prev) => ({ ...prev, [rootMessageId]: versionIndex }));
  };

  const handleEditMessage = async (messageId: number, newContent: string) => {
    if (isSending) return;
    stopRequestedRef.current = false;
    clearStreamAbortControllers();
    setIsSending(true);
    setIsStreaming(true);
    isStreamingRef.current = true;
    setStreamingContent("");

    // --- Identify Original Models ---
    const originalIdx = messages.findIndex(m => m.id === messageId);
    let pairedAssistantMsg = null;
    if (originalIdx !== -1 && originalIdx + 1 < messages.length && messages[originalIdx + 1].role === "ASSISTANT") {
      pairedAssistantMsg = messages[originalIdx + 1];
    }
    const targetModelIds = pairedAssistantMsg?.modelResponses?.map((mr: any) => mr.model.id) || [...selectedModels];

    if (targetModelIds.length === 0) {
      toast.error("No models found to edit with.");
      setIsSending(false);
      setIsStreaming(false);
      return;
    }

    const token = localStorage.getItem("token") || "";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const chatType = localStorage.getItem("preferredChatType") || "STANDARD";

    // --- Optimistic UI Update ---
    // Find original message's root for version tracking
    const originalMsg = messages[originalIdx];
    const rootId = originalMsg?.editedFromId || messageId;
    
    const tempUserMsgId = Date.now();
    const tempAssistantMsgId = Date.now() + 1;

    setEditVersionIndices((prev) => ({ ...prev, [rootId]: 999 }));

    setMessages((prev) => {
      const keptMessages = prev.filter((m, idx) => {
        if (idx <= originalIdx) return true;
        if (m.role === "USER" && (m.editedFromId === rootId || m.id === rootId)) return true;
        if (m.role === "ASSISTANT") {
          const prevUserIdx = prev.findIndex((pm, pi) => pi < idx && pm.role === "USER" && (pm.editedFromId === rootId || pm.id === rootId) && pi > originalIdx);
          if (prevUserIdx !== -1) return true;
        }
        return false;
      });

      return [
        ...keptMessages,
        {
          id: tempUserMsgId,
          role: "USER",
          content: newContent,
          createdAt: new Date().toISOString(),
          editedFromId: rootId,
        },
        {
          id: tempAssistantMsgId,
          role: "ASSISTANT",
          content: "",
          createdAt: new Date().toISOString(),
          chatType,
          modelResponses: targetModelIds.map((mid) => ({
            id: mid,
            model: { id: mid, name: models.find((m) => m.id === mid)?.name || "AI" },
            content: "",
            status: "STREAMING",
            tokensUsed: null,
          })),
        },
      ];
    });
    // ----------------------------

    try {
      // 1. Prepare multi-model edit (soft-delete old, create new msg DB entries)
      const prepRes = await fetch(`${apiUrl}/chats/${chatId}/messages/${messageId}/edit-prepare-multi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newContent }),
      });

      if (!prepRes.ok) {
        const errData = await prepRes.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to prepare edit");
      }

      const prepData = await prepRes.json();
      const userMsgId = prepData.data.userMessageId;
      const assistantMsgId = prepData.data.assistantMessageId;

      // 2. Sync temp UI IDs with real DB IDs before streaming
      setMessages((prev) => prev.map(msg => {
        if (msg.id === tempUserMsgId) return { ...msg, id: userMsgId };
        if (msg.id === tempAssistantMsgId) return { ...msg, id: assistantMsgId };
        return msg;
      }));

      // 3. Fire concurrent stream requests for all original models
      const responses = await Promise.allSettled(
        targetModelIds.map((mid) =>
          streamSingleModel(
            mid,
            assistantMsgId,
            token,
            apiUrl,
            newContent,
            chatType,
            userMsgId,
            assistantMsgId,
            undefined,
            createStreamAbortController().signal
          )
        )
      );

      // 4. Handle any instant stream initiation failures
      responses.forEach((res, idx) => {
        if (res.status === "rejected") {
          const mid = targetModelIds[idx];
          if (isAbortError(res.reason) || stopRequestedRef.current) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      modelResponses: msg.modelResponses?.map((mr: any) =>
                        mr.model.id === mid
                          ? { ...mr, content: mr.content || "Generation stopped by user.", status: "FAILED" }
                          : mr
                      ),
                    }
                  : msg
              )
            );
            return;
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    modelResponses: msg.modelResponses?.map((mr: any) =>
                      mr.model.id === mid
                        ? { ...mr, content: res.reason.message || "Failed", status: "FAILED" }
                        : mr
                    ),
                  }
                : msg
            )
          );
          toast.error(`${models.find(m => m.id === mid)?.name || "Model"}: ${res.reason.message}`);
        }
      });

      isStreamingRef.current = false;
      await fetchChat();
    } catch (err: any) {
      if (isAbortError(err) || stopRequestedRef.current) {
        isStreamingRef.current = false;
        syncChatAfterStop();
      } else {
        toast.error(err.message || "Failed to edit message");
      }
    } finally {
      clearStreamAbortControllers();
      isStreamingRef.current = false;
      setIsSending(false);
      setIsStreaming(false);
      setStreamingContent("");
      stopRequestedRef.current = false;
    }
  };

  if (isNotFound) {
    notFound();
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={messages}
        activeModelTabs={activeModelTabs}
        onModelTabChange={handleModelTabChange}
        onRegenerate={handleRegenerate}
        onFeedback={handleFeedback}
        onEditMessage={handleEditMessage}
        editVersionIndices={editVersionIndices}
        onEditVersionChange={handleEditVersionChange}
        onFollowUpClick={setInitialPrompt}
        onToggleStar={handleToggleStar}
        bottomAnchorId="chat-bottom-anchor"
        forceScrollToBottom={shouldForceScrollFromStarred}
        scrollContainerId="chat-scroll-container"
      />
      <ChatInput
        models={models}
        selectedModels={selectedModels}
        onModelChange={handleModelChange}
        maxModels={-1}
        onSend={(content, attachmentIds, chatType, attachmentObjects) => sendMessage(content, attachmentIds, undefined, chatType, attachmentObjects)}
        onEnhancePrompt={handleEnhancePrompt}
        isSending={isSending}
        onStopStreaming={stopStreaming}
        initialPrompt={initialPrompt}
        onPromptClear={() => setInitialPrompt("")}
        draftStorageKey={`chat_draft_${chatId}`}
      />
    </div>
  );
}
