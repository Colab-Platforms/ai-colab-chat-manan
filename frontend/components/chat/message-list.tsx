"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";

interface Message {
  id: number;
  role: string;
  content: string;
  createdAt: string;
  attachments?: any[];
  modelResponses?: any[];
}

interface MessageListProps {
  messages: Message[];
  activeModelTabs: Record<number, number>;
  onModelTabChange: (messageId: number, modelId: number) => void;
  onRegenerate?: (messageId: number, modelId: number) => void;
  onFeedback?: (responseId: number, isLiked: boolean | null) => void;
}

export function MessageList({ messages, activeModelTabs, onModelTabChange, onRegenerate, onFeedback }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isStreaming = messages.some(m => m.modelResponses?.some(mr => mr.status === "STREAMING"));

  // Scroll when new messages are added, or when a stream finishes
  useEffect(() => {
    if (!isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isStreaming]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            activeModelTab={activeModelTabs[message.id]}
            onModelTabChange={(modelId) => onModelTabChange(message.id, modelId)}
            onRegenerate={onRegenerate}
            onFeedback={onFeedback}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
