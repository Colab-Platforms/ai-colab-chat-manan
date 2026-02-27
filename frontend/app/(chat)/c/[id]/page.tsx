"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
  const firstMessageSent = useRef(false);
  const isStreamingRef = useRef(false);

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
    } catch { /* ignore */ }
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
          // Fallback: use defaultForCapabilities STANDARD models, otherwise first active
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

    sendMessage(firstMessage, modelIdList[0] || selectedModels[0], initChatType || "STANDARD");
    window.history.replaceState({}, "", `/c/${chatId}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, searchParams]);

  const sendMessage = async (content: string, modelId?: number, chatType?: string) => {
    if (isSending) return;
    setIsSending(true);
    setIsStreaming(true);
    isStreamingRef.current = true;
    setStreamingContent("");

    const targetModelId = modelId || selectedModels[0];
    if (!targetModelId) {
      toast.error("Please select a model");
      setIsSending(false);
      setIsStreaming(false);
      return;
    }

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: Date.now(),
      role: "USER",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // Add streaming placeholder
    const streamingMsgId = Date.now() + 1;
    const streamingMsg: Message = {
      id: streamingMsgId,
      role: "ASSISTANT",
      content: "",
      createdAt: new Date().toISOString(),
      modelResponses: [{
        id: 0,
        model: { id: targetModelId, name: models.find((m) => m.id === targetModelId)?.name || "AI" },
        content: "",
        status: "STREAMING",
        tokensUsed: null,
      }],
    };
    setMessages((prev) => [...prev, streamingMsg]);
    setActiveModelTabs((prev) => ({ ...prev, [streamingMsgId]: targetModelId }));

    try {
      const token = localStorage.getItem("token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

      const response = await fetch(`${apiUrl}/chats/${chatId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, modelId: targetModelId, chatType }),
      });

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
          
          // Keep the last incomplete chunk in the buffer
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
                // Update streaming message content in real-time
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === streamingMsgId
                      ? {
                          ...msg,
                          content: accumulated,
                          modelResponses: msg.modelResponses?.map((mr) => ({
                            ...mr,
                            content: accumulated,
                            status: "STREAMING",
                          })),
                        }
                      : msg
                  )
                );
              } else if (parsed.type === "error") {
                toast.error(parsed.message);
              } else if (parsed.type === "done") {
                // Mark as completed
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === streamingMsgId
                      ? {
                          ...msg,
                          content: accumulated,
                          modelResponses: msg.modelResponses?.map((mr) => ({
                            ...mr,
                            content: accumulated,
                            status: "COMPLETED",
                          })),
                        }
                      : msg
                  )
                );
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }

      // Refresh to get real IDs from DB
      isStreamingRef.current = false;
      await fetchChat();
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
      // Remove placeholder messages
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id && m.id !== streamingMsgId));
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

    // Find the target assistant message
    const targetMsg = messages.find(m => m.id === messageId);
    if (!targetMsg || targetMsg.role !== "ASSISTANT") {
      toast.error("Can only regenerate assistant messages");
      setIsSending(false);
      setIsStreaming(false);
      return;
    }

    // Add streaming placeholder under the same message
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
                          modelResponses: msg.modelResponses?.map((mr) =>
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
                          modelResponses: msg.modelResponses?.map((mr) =>
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
      // Remove placeholder response
      setMessages((prev) => prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            modelResponses: msg.modelResponses?.filter(mr => mr.id !== streamingRespId)
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
      // Optimistic update
      setMessages((prev) => prev.map(msg => ({
        ...msg,
        modelResponses: msg.modelResponses?.map(mr => 
          mr.id === responseId ? { ...mr, isLiked } : mr
        )
      })));
      await chatService.feedback(chatId, responseId, isLiked);
    } catch (err: any) {
      toast.error("Failed to submit feedback");
      fetchChat(); // Revert on failure
    }
  };

  const handleModelTabChange = (messageId: number, modelId: number) => {
    setActiveModelTabs((prev) => ({ ...prev, [messageId]: modelId }));
  };

  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={messages}
        activeModelTabs={activeModelTabs}
        onModelTabChange={handleModelTabChange}
        onRegenerate={handleRegenerate}
        onFeedback={handleFeedback}
      />
      <ChatInput
        models={models}
        selectedModels={selectedModels}
        onModelChange={handleModelChange}
        maxModels={-1}
        onSend={(content, files, chatType) => sendMessage(content, undefined, chatType)}
        isSending={isSending}
      />
    </div>
  );
}
