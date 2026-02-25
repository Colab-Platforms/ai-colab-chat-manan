"use client";

import React from "react";
import { Bot, Copy, ThumbsUp, ThumbsDown, Share2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

interface Message {
  id: number;
  role: string;
  content: string;
  createdAt: string;
  attachments?: { id: number; fileName: string; fileUrl: string; mimeType: string }[];
  modelResponses?: ModelResponse[];
}

interface ModelResponse {
  id: number;
  content: string | null;
  status: string;
  tokensUsed: number | null;
  model: { id: number; name: string };
  isLiked?: boolean | null;
}

interface MessageBubbleProps {
  message: Message;
  activeModelTab?: number;
  onModelTabChange?: (modelId: number) => void;
  onRegenerate?: (messageId: number, modelId: number) => void;
  onFeedback?: (responseId: number, isLiked: boolean | null) => void;
}

export function MessageBubble({ message, activeModelTab, onModelTabChange, onRegenerate, onFeedback }: MessageBubbleProps) {
  const isUser = message.role === "USER";
  const responses = message.modelResponses || [];
  
  // Group responses by model
  const responsesByModel = responses.reduce((acc, resp) => {
    if (!acc[resp.model.id]) acc[resp.model.id] = [];
    acc[resp.model.id].push(resp);
    return acc;
  }, {} as Record<number, ModelResponse[]>);

  const uniqueModels = Object.values(responsesByModel).map(arr => arr[0].model);
  const hasMultipleModels = uniqueModels.length > 1;

  // Track the selected version index per model ID
  const [versionIndices, setVersionIndices] = React.useState<Record<number, number>>({});

  const targetModelId = activeModelTab || uniqueModels[0]?.id;
  const targetModelResponses = targetModelId ? responsesByModel[targetModelId] || [] : [];
  
  // The selected version index (default to the last/newest one if not set)
  const currentVersionIndex = versionIndices[targetModelId] ?? (targetModelResponses.length - 1);
  const activeResponse = targetModelResponses[currentVersionIndex] || targetModelResponses[0];

  const handleVersionChange = (modelId: number, dir: 1 | -1) => {
    const list = responsesByModel[modelId] || [];
    const current = versionIndices[modelId] ?? (list.length - 1);
    const next = Math.max(0, Math.min(list.length - 1, current + dir));
    setVersionIndices(prev => ({ ...prev, [modelId]: next }));
  };

  return (
    <div className={`px-4 py-3 transition-all animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ${isUser ? "flex justify-end" : ""}`}>
      {/* User message — right-aligned, capped width */}
      {isUser && (
        <div className="max-w-[95%] sm:max-w-[85%]">
          <div className="bg-primary dark:bg-muted dark:border dark:border-border/50 text-primary-foreground dark:text-foreground rounded-2xl rounded-br-md px-4 py-2.5">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      )}

      {/* Assistant message — full width with model label */}
      {!isUser && (
        <div className="w-full space-y-1.5">
          {/* Model name label + tabs */}
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary/70 flex-shrink-0" />
            {hasMultipleModels ? (
              <div className="flex gap-1 overflow-x-auto scrollbar-none">
                {uniqueModels.map((model) => {
                  const modelResps = responsesByModel[model.id];
                  const hasPending = modelResps.some(r => r.status === "PENDING" || r.status === "STREAMING");
                  return (
                    <button
                      key={model.id}
                      onClick={() => onModelTabChange?.(model.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                        activeModelTab === model.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {model.name}
                      {hasPending ? (
                        <span className="ml-1.5 inline-flex">
                          <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1 h-1 bg-current rounded-full animate-bounce ml-0.5" style={{ animationDelay: "150ms" }} />
                          <span className="w-1 h-1 bg-current rounded-full animate-bounce ml-0.5" style={{ animationDelay: "300ms" }} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs font-medium text-muted-foreground mr-2">
                {targetModelResponses[0]?.model.name || "AI"}
              </span>
            )}
          </div>

          {/* Response content — full width */}
          <div className="bg-muted/50 rounded-2xl rounded-tl-md px-4 py-2.5 transition-all">
            {activeResponse ? (
              activeResponse.content ? (
                <div className="text-sm">
                  <MarkdownRenderer content={activeResponse.content} />
                  {activeResponse.status === "STREAMING" && (
                    <span className="inline-block w-1.5 h-4 bg-foreground/70 ml-0.5 animate-pulse" />
                  )}
                  {activeResponse.status === "FAILED" && (
                    <span className="block mt-2 text-xs text-destructive/80 font-medium">
                      ⚠️ Stream interrupted. Partial response recovered.
                    </span>
                  )}
                </div>
              ) : activeResponse.status === "FAILED" ? (
                <p className="text-sm text-destructive">Response failed. Please try again.</p>
              ) : (
                <TypingIndicator />
              )
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
          </div>

          {/* Action buttons (only show if completed) */}
          {activeResponse?.status === "COMPLETED" && activeResponse.content && (
            <div className="flex items-center gap-0.5 mt-1 sm:mt-0.5 opacity-70 hover:opacity-100 transition-opacity">
              {/* Version Controls */}
              {targetModelResponses.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full mr-1">
                  <button
                    onClick={() => handleVersionChange(targetModelId, -1)}
                    disabled={currentVersionIndex === 0}
                    className="hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed px-1 flex items-center justify-center p-0.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-medium text-[11px] leading-none mb-[1px]">{currentVersionIndex + 1} / {targetModelResponses.length}</span>
                  <button
                    onClick={() => handleVersionChange(targetModelId, 1)}
                    disabled={currentVersionIndex === targetModelResponses.length - 1}
                    className="hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed px-1 flex items-center justify-center p-0.5"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-full" onClick={() => { navigator.clipboard.writeText(activeResponse.content!); toast.success("Copied to clipboard"); }} title="Copy message">
                <Copy className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-8 w-8 sm:h-7 sm:w-7 rounded-full ${activeResponse.isLiked === true ? "text-green-500 bg-green-500/10" : "text-muted-foreground hover:bg-muted/80"}`} 
                onClick={() => {
                  const newLiked = activeResponse.isLiked === true ? null : true;
                  onFeedback?.(activeResponse.id, newLiked);
                }} 
                title="Good response"
              >
                <ThumbsUp className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-8 w-8 sm:h-7 sm:w-7 rounded-full ${activeResponse.isLiked === false ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:bg-muted/80"}`} 
                onClick={() => {
                  const newLiked = activeResponse.isLiked === false ? null : false;
                  onFeedback?.(activeResponse.id, newLiked);
                }} 
                title="Bad response"
              >
                <ThumbsDown className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 text-muted-foreground hover:bg-muted/80 rounded-full" onClick={async () => {
                if (navigator.share) {
                  try { await navigator.share({ title: "AI Colab Chat Response", text: activeResponse.content! }); } catch { /* ignore */ }
                } else {
                  navigator.clipboard.writeText(activeResponse.content!);
                  toast.success("Copied to clipboard for sharing");
                }
              }} title="Share directly">
                <Share2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 sm:h-7 sm:w-7 text-muted-foreground hover:bg-muted/80 rounded-full" 
                onClick={() => {
                  setVersionIndices(prev => {
                    const next = { ...prev };
                    delete next[activeResponse.model.id];
                    return next;
                  });
                  onRegenerate?.(message.id, activeResponse.model.id);
                }} 
                title="Regenerate"
              >
                 <RefreshCw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Attachments */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {message.attachments.map((att) => (
            <a
              key={att.id}
              href={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}${att.fileUrl}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg text-xs hover:bg-muted/80 transition-colors"
            >
              📎 {att.fileName}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}
