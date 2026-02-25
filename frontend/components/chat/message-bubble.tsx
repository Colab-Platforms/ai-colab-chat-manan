"use client";

import { Bot, Copy, ThumbsUp, ThumbsDown, Share2, RefreshCw } from "lucide-react";
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
}

interface MessageBubbleProps {
  message: Message;
  activeModelTab?: number;
  onModelTabChange?: (modelId: number) => void;
}

export function MessageBubble({ message, activeModelTab, onModelTabChange }: MessageBubbleProps) {
  const isUser = message.role === "USER";
  const responses = message.modelResponses || [];
  const hasMultipleModels = responses.length > 1;
  const activeResponse = activeModelTab
    ? responses.find((r) => r.model.id === activeModelTab)
    : responses[0];

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
                {responses.map((resp) => (
                  <button
                    key={resp.model.id}
                    onClick={() => onModelTabChange?.(resp.model.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                      activeModelTab === resp.model.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {resp.model.name}
                    {resp.status === "PENDING" || resp.status === "STREAMING" ? (
                      <span className="ml-1.5 inline-flex">
                        <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1 h-1 bg-current rounded-full animate-bounce ml-0.5" style={{ animationDelay: "150ms" }} />
                        <span className="w-1 h-1 bg-current rounded-full animate-bounce ml-0.5" style={{ animationDelay: "300ms" }} />
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                {activeResponse?.model.name || "AI"}
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
            <div className="flex items-center gap-1 mt-0.5 opacity-70 hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-full" onClick={() => { navigator.clipboard.writeText(activeResponse.content!); toast.success("Copied to clipboard"); }} title="Copy message">
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-muted/80 rounded-full" onClick={() => toast.success("Feedback submitted. Thanks!")} title="Good response">
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-muted/80 rounded-full" onClick={() => toast.success("Feedback submitted. We'll improve.")} title="Bad response">
                <ThumbsDown className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-muted/80 rounded-full" onClick={async () => {
                if (navigator.share) {
                  try { await navigator.share({ title: "AI Colab Chat Response", text: activeResponse.content! }); } catch { /* ignore */ }
                } else {
                  navigator.clipboard.writeText(activeResponse.content!);
                  toast.success("Copied to clipboard for sharing");
                }
              }} title="Share directly">
                <Share2 className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-muted/80 rounded-full" onClick={() => toast.info("Regeneration will be available soon")} title="Try again">
                 <RefreshCw className="w-3.5 h-3.5" />
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
