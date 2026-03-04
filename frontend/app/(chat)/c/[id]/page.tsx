"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { chatService, modelService } from "@/lib/services";
import { MessageList } from "@/components/chat/message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { toast } from "react-toastify";

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
}

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const chatId = Number(params.id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<number[]>([]);
  const [activeModelTabs, setActiveModelTabs] = useState<Record<number, number>>({});
  const [isSending, setIsSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [editVersionIndices, setEditVersionIndices] = useState<Record<number, number>>({});
  const [isNotFound, setIsNotFound] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");
  const firstMessageSent = useRef(false);
  const isStreamingRef = useRef(false);
  const modelsRestoredRef = useRef(false);

  const fetchChat = useCallback(async () => {
    try {
      const res = await chatService.getById(chatId);
      const chat = res.data.data;

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

  const fetchModels = useCallback(async () => {
    try {
      const res = await modelService.list({ pageSize: "100" });
      const allModels = res.data.data?.data || [];
      const activeModels = allModels.filter((m: any) => m.isActive);
      setModels(activeModels);
      
      if (activeModels.length > 0 && selectedModels.length === 0) {
        const storedModelId = localStorage.getItem("preferredModelId");
        const parsedId = storedModelId ? Number(storedModelId) : null;
        
        if (parsedId && activeModels.find((m: any) => m.id === parsedId)) {
          setSelectedModels([parsedId]);
        } else {
          const defaultModels = activeModels.filter((m: any) => m.defaultForCapabilities?.includes("STANDARD"));
          if (defaultModels.length > 0) {
            setSelectedModels(defaultModels.map((m: any) => m.id));
          } else {
            setSelectedModels([activeModels[0].id]);
          }
        }
      }
    } catch { /* ignore */ }
  }, [selectedModels.length]);

  const handleModelChange = (ids: number[]) => {
    setSelectedModels(ids);
    localStorage.setItem(`chat_${chatId}_models`, JSON.stringify(ids));
    if (ids.length > 0) {
      localStorage.setItem("preferredModelId", String(ids[0]));
    }
  };

  useEffect(() => {
    fetchModels();
    fetchChat();
  }, [fetchModels, fetchChat]);

  // Handle first message from redirect
  useEffect(() => {
    const firstMessage = searchParams.get("firstMessage");
    const modelIds = searchParams.get("models");
    const initChatType = searchParams.get("chatType");
    if (!firstMessage || firstMessageSent.current || models.length === 0) return;
    firstMessageSent.current = true;

    const modelIdList = modelIds?.split(",").map(Number).filter(Boolean) || selectedModels;
    if (modelIdList.length > 0) setSelectedModels(modelIdList);

    sendMessage(firstMessage, modelIdList, initChatType || "STANDARD");
    window.history.replaceState({}, "", `/c/${chatId}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, searchParams]);

  // Stream a single model's response
  const streamSingleModel = (
    mid: number,
    streamingMsgId: number,
    token: string,
    apiUrl: string,
    content: string,
    chatType: string | undefined,
    userMessageId: number,
    assistantMessageId: number,
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
      }),
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
                toast.error(`${models.find(m => m.id === mid)?.name || "Model"}: ${parsed.message}`);
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

  const sendMessage = async (content: string, modelIds?: number[], chatType?: string) => {
    if (isSending) return;
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
    }]);

    // Add streaming placeholder with one response per model
    const streamingMsgId = Date.now() + 1;
    setMessages((prev) => [...prev, {
      id: streamingMsgId,
      role: "ASSISTANT",
      content: "",
      createdAt: new Date().toISOString(),
      modelResponses: targetModelIds.map((mid) => ({
        id: mid,
        model: { id: mid, name: models.find((m) => m.id === mid)?.name || "AI" },
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
        // Single model: use existing /send endpoint directly (creates user+assistant msg)
        await streamSingleModel(
          targetModelIds[0], streamingMsgId, token, apiUrl,
          content, chatType, 0, 0 // 0 means the endpoint creates them
        );
      } else {
        // Multi model: call /prepare-multi FIRST to get IDs, then fire ALL streams at once
        const prepRes = await fetch(`${apiUrl}/chats/${chatId}/prepare-multi`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ content }),
        });

        if (!prepRes.ok) {
          const errData = await prepRes.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to prepare messages");
        }

        const prepData = await prepRes.json();
        const { userMessageId, assistantMessageId } = prepData.data;

        // Fire ALL models simultaneously — no waiting between them!
        await Promise.allSettled(
          targetModelIds.map((mid) =>
            streamSingleModel(mid, streamingMsgId, token, apiUrl, content, chatType, userMessageId, assistantMessageId)
          )
        );
      }

      isStreamingRef.current = false;
      await fetchChat();
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsgId && m.id !== streamingMsgId));
    } finally {
      isStreamingRef.current = false;
      setIsSending(false);
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleRegenerate = async (messageId: number, modelId: number) => {
    if (isSending) return;
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
          modelResponses: [
            ...(msg.modelResponses || []),
            {
              id: streamingRespId,
              model: { id: modelId, name: models.find((m) => m.id === modelId)?.name || "AI" },
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

      const response = await fetch(`${apiUrl}/chats/${chatId}/messages/${messageId}/regenerate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ modelId, chatType: localStorage.getItem("preferredChatType") || "STANDARD" }),
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
                toast.error(parsed.message);
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
    } finally {
      isStreamingRef.current = false;
      setIsSending(false);
      setIsStreaming(false);
      setStreamingContent("");
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

  const handleEditVersionChange = (rootMessageId: number, versionIndex: number) => {
    setEditVersionIndices((prev) => ({ ...prev, [rootMessageId]: versionIndex }));
  };

  const handleEditMessage = async (messageId: number, newContent: string) => {
    if (isSending) return;
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
          streamSingleModel(mid, assistantMsgId, token, apiUrl, newContent, chatType, userMsgId, assistantMsgId)
        )
      );

      // 4. Handle any instant stream initiation failures
      responses.forEach((res, idx) => {
        if (res.status === "rejected") {
          const mid = targetModelIds[idx];
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
      toast.error(err.message || "Failed to edit message");
    } finally {
      isStreamingRef.current = false;
      setIsSending(false);
      setIsStreaming(false);
      setStreamingContent("");
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
      />
      <ChatInput
        models={models}
        selectedModels={selectedModels}
        onModelChange={handleModelChange}
        maxModels={-1}
        onSend={(content, files, chatType) => sendMessage(content, undefined, chatType)}
        isSending={isSending}
        initialPrompt={initialPrompt}
        onPromptClear={() => setInitialPrompt("")}
      />
    </div>
  );
}
