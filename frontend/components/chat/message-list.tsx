"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { SelectionContextTooltip } from "./selection-context-tooltip";

interface Message {
  id: number;
  role: string;
  content: string;
  createdAt: string;
  editedFromId?: number | null;
  attachments?: any[];
  modelResponses?: any[];
}

interface MessageListProps {
  messages: Message[];
  activeModelTabs: Record<number, number>;
  onModelTabChange: (messageId: number, modelId: number) => void;
  onRegenerate?: (messageId: number, modelId: number) => void;
  onFeedback?: (responseId: number, isLiked: boolean | null) => void;
  onEditMessage?: (messageId: number, newContent: string) => void;
  editVersionIndices?: Record<number, number>;
  onEditVersionChange?: (rootMessageId: number, versionIndex: number) => void;
  onFollowUpClick?: (question: string) => void;
}

/**
 * Processes messages into a display list that handles edit versioning.
 * 
 * Each user message that has siblings (same editedFromId root) gets grouped.
 * Only the active version and its paired assistant response are shown.
 */
function processMessagesWithVersions(
  messages: Message[],
  editVersionIndices: Record<number, number>
) {
  // Step 1: Build version groups (rootId → ordered user messages)
  const versionGroups: Record<number, Message[]> = {};
  
  for (const msg of messages) {
    if (msg.role !== "USER") continue;
    const rootId = msg.editedFromId || msg.id;
    if (!versionGroups[rootId]) versionGroups[rootId] = [];
    versionGroups[rootId].push(msg);
  }
  
  // Sort each group by createdAt
  for (const key of Object.keys(versionGroups)) {
    versionGroups[Number(key)].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  // Step 2: Build a map of userId → next assistant message
  const userToAssistant: Record<number, Message> = {};
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "USER" && i + 1 < messages.length && messages[i + 1].role === "ASSISTANT") {
      userToAssistant[messages[i].id] = messages[i + 1];
    }
  }

  // Step 3: Build display list
  const processedRoots = new Set<number>();
  const skipIds = new Set<number>(); // IDs to skip (non-active versions + their assistants)
  const result: {
    message: Message;
    editVersions?: Message[];
    editVersionIndex?: number;
  }[] = [];

  for (const msg of messages) {
    if (skipIds.has(msg.id)) continue;

    if (msg.role === "USER") {
      const rootId = msg.editedFromId || msg.id;
      
      if (processedRoots.has(rootId)) continue;
      processedRoots.add(rootId);
      
      const versions = versionGroups[rootId] || [msg];
      const activeIdx = Math.max(0, Math.min(
        versions.length - 1,
        editVersionIndices[rootId] ?? (versions.length - 1)
      ));
      const activeVersion = versions[activeIdx];
      
      // Mark ALL assistants for this version group to be skipped later in the main loop
      // and mark non-active versions as skip
      for (const v of versions) {
        const pairedAssistant = userToAssistant[v.id];
        if (pairedAssistant) skipIds.add(pairedAssistant.id);

        if (v.id !== activeVersion.id) {
          skipIds.add(v.id);
        }
      }
      
      // Add the active user version
      result.push({
        message: activeVersion,
        editVersions: versions.length > 1 ? versions : undefined,
        editVersionIndex: versions.length > 1 ? activeIdx : undefined,
      });
      
      // Add the active version's paired assistant
      const activeAssistant = userToAssistant[activeVersion.id];
      if (activeAssistant) {
        result.push({ message: activeAssistant });
      }
    } else {
      // Standalone assistant (not paired with any versioned user)
      result.push({ message: msg });
    }
  }
  
  return result;
}

export function MessageList({
  messages, activeModelTabs, onModelTabChange, onRegenerate, onFeedback,
  onEditMessage, editVersionIndices = {}, onEditVersionChange, onFollowUpClick
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isStreaming = messages.some(m => m.modelResponses?.some(mr => mr.status === "STREAMING"));

  useEffect(() => {
    // Scroll to bottom when a new message is sent OR when streaming finishes
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isStreaming]);

  const processed = processMessagesWithVersions(messages, editVersionIndices);

  return (
    <>
      <SelectionContextTooltip />
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-4">
          {processed.map((item, idx) => (
            <MessageBubble
              key={item.message.id}
              message={item.message}
              activeModelTab={activeModelTabs[item.message.id]}
              onModelTabChange={(modelId) => onModelTabChange(item.message.id, modelId)}
              onRegenerate={onRegenerate}
              onFeedback={onFeedback}
              onEditMessage={onEditMessage}
              editVersions={item.editVersions}
              editVersionIndex={item.editVersionIndex}
              onEditVersionChange={onEditVersionChange}
              isLastMessage={idx === processed.length - 1}
              onFollowUpClick={onFollowUpClick}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </>
  );
}
