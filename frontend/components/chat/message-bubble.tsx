"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Bot, Copy, ThumbsUp, ThumbsDown, Share2, RefreshCw,
  ChevronLeft, ChevronRight, Check, Loader2, Pencil, X
} from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import useEmblaCarousel from "embla-carousel-react";

interface ModelResponse {
  id: number;
  content: string | null;
  status: string;
  tokensUsed: number | null;
  model: { id: number; name: string };
  isLiked?: boolean | null;
}

function parseFollowUpQuestions(text: string): { cleanText: string; questions: string[] } {
  if (!text) return { cleanText: "", questions: [] };
  const jsonBlockRegex = /```json\s*(\[\s*[\s\S]*?\s*\])\s*```[\s]*$/i;
  const match = text.match(jsonBlockRegex);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        return {
          cleanText: text.replace(match[0], "").trimEnd(),
          questions: parsed.filter(q => typeof q === "string").slice(0, 3)
        };
      }
    } catch (e) {}
  }
  return { cleanText: text, questions: [] };
}

function FollowUpTabs({ questions, onClick }: { questions: string[], onClick: (q: string) => void }) {
  if (!questions || questions.length === 0) return null;
  return (
    <>
      <p className="text-xs text-muted-foreground px-2 pt-2">Suggested follow-up questions:</p>
      <div className="flex flex-wrap gap-2 mt-4 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onClick(q)}
          className="group relative flex items-center gap-2 text-xs px-4 py-2 rounded-2xl border border-border/90 bg-muted/30 text-foreground/70 hover:text-foreground transition-colors duration-200 text-left cursor-pointer"
        >
          <span className="flex-1 truncate max-w-[280px] sm:max-w-[400px]">
            {q}
          </span>
          <ChevronRight className="w-3.5 h-3.5 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200 flex-shrink-0" />
        </button>
      ))}
    </div>
    </>
  );
}

interface Message {
  id: number;
  role: string;
  content: string;
  createdAt: string;
  editedFromId?: number | null;
  attachments?: { id: number; fileName: string; fileUrl: string; mimeType: string }[];
  modelResponses?: ModelResponse[];
}

interface MessageBubbleProps {
  message: Message;
  activeModelTab?: number;
  onModelTabChange?: (modelId: number) => void;
  onRegenerate?: (messageId: number, modelId: number) => void;
  onFeedback?: (responseId: number, isLiked: boolean | null) => void;
  onEditMessage?: (messageId: number, newContent: string) => void;
  // Version navigation props
  editVersions?: Message[];
  editVersionIndex?: number;
  onEditVersionChange?: (rootMessageId: number, versionIndex: number) => void;
  isLastMessage?: boolean;
  onFollowUpClick?: (question: string) => void;
}

export function MessageBubble({
  message, activeModelTab, onModelTabChange, onRegenerate, onFeedback,
  onEditMessage, editVersions, editVersionIndex, onEditVersionChange,
  isLastMessage, onFollowUpClick
}: MessageBubbleProps) {
  const isUser = message.role === "USER";
  const responses = message.modelResponses || [];

  // Group responses by model
  const responsesByModel = responses.reduce((acc, resp) => {
    if (!acc[resp.model.id]) acc[resp.model.id] = [];
    acc[resp.model.id].push(resp);
    return acc;
  }, {} as Record<number, ModelResponse[]>);

  const uniqueModels = Object.values(responsesByModel).map(arr => arr[0].model);
  const isMultiModel = uniqueModels.length > 1;

  // Version navigation per model
  const [versionIndices, setVersionIndices] = useState<Record<number, number>>({});
  const handleVersionChange = (modelId: number, dir: 1 | -1) => {
    const list = responsesByModel[modelId] || [];
    const cur = versionIndices[modelId] ?? (list.length - 1);
    setVersionIndices(prev => ({ ...prev, [modelId]: Math.max(0, Math.min(list.length - 1, cur + dir)) }));
  };

  // Edit state — two-phase for smooth open/close
  const [showEdit, setShowEdit] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editText, setEditText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEditing = () => {
    setEditText(message.content);
    setIsClosing(false);
    setShowEdit(true);
  };

  const cancelEditing = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowEdit(false);
      setIsClosing(false);
      setEditText("");
    }, 200);
  };

  const saveEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.content) {
      cancelEditing();
      return;
    }
    onEditMessage?.(message.id, trimmed);
    setShowEdit(false);
    setIsClosing(false);
    setEditText("");
  };

  // Auto-resize textarea
  useEffect(() => {
    if (showEdit && !isClosing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      textareaRef.current.focus();
    }
  }, [showEdit, isClosing, editText]);

  // Handle Ctrl+Enter to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === "Escape") {
      cancelEditing();
    }
  };

  // Embla setup
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    dragFree: false,
    containScroll: "trimSnaps",
  });

  const [activeTab, setActiveTab] = useState<number>(uniqueModels[0]?.id ?? 0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    
    const selectedSnap = emblaApi.selectedScrollSnap();
    const responsesByModel = responses.reduce((acc, resp) => {
      if (!acc[resp.model.id]) acc[resp.model.id] = [];
      acc[resp.model.id].push(resp);
      return acc;
    }, {} as Record<number, ModelResponse[]>);
    const uModels = Object.values(responsesByModel).map(arr => arr[0].model);
    
    const activeModel = uModels[selectedSnap];
    if (activeModel) {
      setActiveTab(activeModel.id);
    }
  }, [emblaApi, responses]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const scrollToCard = useCallback((modelId: number) => {
    if (!emblaApi) return;
    const index = uniqueModels.findIndex(m => m.id === modelId);
    if (index !== -1) {
      emblaApi.scrollTo(index);
    }
  }, [emblaApi, uniqueModels]);

  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tabsRef.current) return;
    const activeEl = tabsRef.current.querySelector(`[data-model="${activeTab}"]`) as HTMLElement | null;
    activeEl?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeTab]);

  // Single model setup
  const singleResps = !isMultiModel && uniqueModels[0] ? responsesByModel[uniqueModels[0].id] || [] : [];
  const singleVerIdx = !isMultiModel && uniqueModels[0] ? (versionIndices[uniqueModels[0].id] ?? (singleResps.length - 1)) : 0;
  const singleResp = singleResps[singleVerIdx] || singleResps[0];
  const parsedSingle = parseFollowUpQuestions(singleResp?.content || "");

  // Version info
  const hasVersions = editVersions && editVersions.length > 1;
  const versionCount = editVersions?.length || 1;
  const currentVersionIdx = editVersionIndex ?? 0;

  // ── User message ─────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className={`px-4 py-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 sm:-mb-3 ${showEdit ? "flex" : "flex justify-end"}`}>
        <div className={showEdit ? "w-full" : "max-w-[95%] sm:max-w-[85%]"}>
          {showEdit ? (
            // Edit mode
            <div className={`bg-muted dark:bg-muted rounded-2xl rounded-br-md px-4 py-3 border border-border/50 space-y-2 transition-all duration-200 ${
              isClosing
                ? "opacity-0 scale-95 translate-x-2"
                : "opacity-100 scale-100 translate-x-0 animate-in fade-in-0 zoom-in-95 slide-in-from-right-2 duration-200"
            }`}>
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-sm text-foreground resize-none outline-none min-h-[60px] max-h-[300px] transition-all duration-200"
                rows={1}
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditing}
                  className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={!editText.trim() || editText.trim() === message.content}
                  className="h-7 px-3 text-xs"
                >
                  Send
                </Button>
              </div>
            </div>
          ) : (
            // Display mode
            <div className="group/user relative">
              <div className="bg-primary dark:bg-muted dark:border dark:border-border/50 text-primary-foreground dark:text-foreground rounded-2xl rounded-br-md px-4 py-2.5 break-words">
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              
              {/* Action buttons below the message - left aligned */}
              <div className="flex items-center gap-1 mt-1 justify-end">
                {/* Version navigation */}
                {hasVersions && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full mr-1 opacity-100 sm:opacity-0 group-hover/user:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditVersionChange?.(editVersions![0].editedFromId || editVersions![0].id, currentVersionIdx - 1)}
                      disabled={currentVersionIdx === 0}
                      className="hover:text-foreground disabled:opacity-30 p-0.5"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-medium tabular-nums">{currentVersionIdx + 1}/{versionCount}</span>
                    <button
                      onClick={() => onEditVersionChange?.(editVersions![0].editedFromId || editVersions![0].id, currentVersionIdx + 1)}
                      disabled={currentVersionIdx === versionCount - 1}
                      className="hover:text-foreground disabled:opacity-30 p-0.5"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Copy button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/80 opacity-100 sm:opacity-0 group-hover/user:opacity-100 transition-opacity"
                  onClick={() => { navigator.clipboard.writeText(message.content); toast.success("Copied"); }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>

                {/* Edit button */}
                {onEditMessage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/80 opacity-100 sm:opacity-0 group-hover/user:opacity-100 transition-opacity"
                    onClick={startEditing}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Assistant: single model ───────────────────────────────────────────────
  if (!isMultiModel) {
    return (
      <div className="px-4 py-3 w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <div className="w-full space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary/70 flex-shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">{uniqueModels[0]?.name || "AI"}</span>
          </div>

          {/* break-words and overflow-hidden prevent horizontal scrolling on long continuous strings */}
          <div className="bg-muted/50 rounded-2xl rounded-tl-md px-4 py-2.5 break-words overflow-hidden w-full">
            {singleResp ? (
              parsedSingle.cleanText ? (
                <div className="text-sm w-full max-w-full prose-pre:max-w-full prose-pre:overflow-x-auto">
                  <MarkdownRenderer content={parsedSingle.cleanText} />
                  {singleResp.status === "STREAMING" && <span className="inline-block w-1.5 h-4 bg-foreground/70 ml-0.5 animate-pulse" />}
                </div>
              ) : singleResp.status === "FAILED" ? (
                <p className="text-sm text-destructive">Response failed. Please try again.</p>
              ) : (
                <TypingIndicator isImageMode={typeof window !== "undefined" && localStorage.getItem("preferredChatType") === "IMAGE_GENERATION"} />
              )
            ) : (
              <p className="text-sm whitespace-pre-wrap">{parsedSingle.cleanText || message.content}</p>
            )}
          </div>

          {isLastMessage && singleResp?.status === "COMPLETED" && parsedSingle.questions.length > 0 && onFollowUpClick && (
            <FollowUpTabs questions={parsedSingle.questions} onClick={onFollowUpClick} />
          )}

          {singleResp?.status === "COMPLETED" && singleResp.content && (
            <CardActions
              resp={singleResp}
              modelId={uniqueModels[0]?.id}
              messageId={message.id}
              modelResps={singleResps}
              verIdx={singleVerIdx}
              onVersionChange={(d) => uniqueModels[0] && handleVersionChange(uniqueModels[0].id, d)}
              onFeedback={onFeedback}
              onRegenerate={(msgId, mid) => {
                setVersionIndices(prev => { const n = { ...prev }; delete n[mid]; return n; });
                onRegenerate?.(msgId, mid);
              }}
            />
          )}
        </div>
        <Attachments message={message} />
      </div>
    );
  }

  // ── Assistant: multi-model ───────────────────────────────────────────────
  return (
    <div className="px-4 py-3 w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300 min-w-0">
      <div className="w-full space-y-2 min-w-0">

        {/* Tab bar — scrollable, click jumps to card */}
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-4 h-4 text-primary/70 flex-shrink-0" />
          <div className="relative flex-1 min-w-0">
            {/* Fade hint on right */}
            <div
              ref={tabsRef}
              className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5"
            >
              {uniqueModels.map((model) => {
                const isActive = activeTab === model.id;
                const mResps = responsesByModel[model.id] || [];
                const latest = mResps[mResps.length - 1];
                const isStreaming = latest?.status === "STREAMING" || latest?.status === "PENDING";
                const isDone = latest?.status === "COMPLETED";

                return (
                  <button
                    key={model.id}
                    data-model={model.id}
                    onClick={() => scrollToCard(model.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all duration-150 ${
                      isActive
                        ? "bg-foreground text-background"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="truncate max-w-[90px]">{model.name}</span>
                    {isStreaming && <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />}
                    {isDone && !isStreaming && <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Carousel Container */}
        <div className="relative group w-full min-w-0">
          
          {/* Desktop Prev Button */}
          {canScrollPrev && (
            <button 
              onClick={() => emblaApi?.scrollPrev()}
              className="hidden sm:flex absolute left-[-16px] top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full border border-border/50 bg-background/80 hover:bg-background backdrop-blur text-foreground shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Embla Viewport (Hides native scrollbar) */}
          <div className="overflow-hidden w-full" ref={emblaRef}>
            <div className="flex -ml-3 touch-pan-y">
              {uniqueModels.map((model) => {
                const mResps = responsesByModel[model.id] || [];
                const verIdx = versionIndices[model.id] ?? (mResps.length - 1);
                const resp = mResps[verIdx] || mResps[0];
                const parsedMulti = parseFollowUpQuestions(resp?.content || "");

                return (
                  <div
                    key={model.id}
                    className="flex-[0_0_85%] sm:flex-[0_0_85%] md:flex-[0_0_85%] min-w-0 pl-3 "
                  >
                    <div className="flex flex-col h-full rounded-xl border border-border/40 bg-muted/30 overflow-hidden break-words min-w-0 bg-muted/40">
                      {/* Card header */}
                      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b border-border/30  min-w-0">
                        <span className="text-xs font-semibold text-foreground/80 truncate flex-1 min-w-0">{model.name}</span>
                        {resp?.status === "STREAMING" && <Loader2 className="w-3 h-3 animate-spin text-primary flex-shrink-0" />}
                        {resp?.status === "COMPLETED" && resp.content && <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                      </div>

                      {/* Card content */}
                      <div className="flex-1 px-3 py-2.5 text-sm overflow-y-auto max-h-[360px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 w-full min-w-0 max-w-full prose-pre:max-w-full prose-pre:overflow-x-auto">
                        {parsedMulti.cleanText ? (
                          <>
                            <MarkdownRenderer content={parsedMulti.cleanText} />
                            {resp.status === "STREAMING" && <span className="inline-block w-1.5 h-4 bg-foreground/70 ml-0.5 animate-pulse" />}
                          </>
                        ) : resp ? (
                          <TypingIndicator />
                        ) : null}
                      </div>

                      {isLastMessage && resp?.status === "COMPLETED" && parsedMulti.questions.length > 0 && onFollowUpClick && (
                        <div className="px-3 pb-2 pt-1">
                          <FollowUpTabs questions={parsedMulti.questions} onClick={onFollowUpClick} />
                        </div>
                      )}

                      {/* Card actions */}
                      {resp?.status === "COMPLETED" && resp.content && (
                        <div className="px-2 py-1.5 border-t border-border/20 bg-muted/10 mt-auto">
                          <CardActions
                            resp={resp}
                            modelId={model.id}
                            messageId={message.id}
                            modelResps={mResps}
                            verIdx={verIdx}
                            onVersionChange={(d) => handleVersionChange(model.id, d)}
                            onFeedback={onFeedback}
                            onRegenerate={(msgId, mid) => {
                              setVersionIndices(prev => { const n = { ...prev }; delete n[mid]; return n; });
                              onRegenerate?.(msgId, mid);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop Next Button */}
          {canScrollNext && (
            <button 
              onClick={() => emblaApi?.scrollNext()}
              className="hidden sm:flex absolute right-[-16px] top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full border border-border/50 bg-background/80 hover:bg-background backdrop-blur text-foreground shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile Dot Indicator */}
        {uniqueModels.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-1 sm:hidden">
            {uniqueModels.map((model, idx) => (
              <button
                key={model.id}
                onClick={() => scrollToCard(model.id)}
                className={`rounded-full transition-all duration-200 ${
                  activeTab === model.id
                    ? "w-4 h-1.5 bg-foreground/60"
                    : "w-1.5 h-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <Attachments message={message} />
    </div>
  );
}

// ── Shared action bar ────────────────────────────────────────────────────────
function CardActions({
  resp, modelId, messageId, modelResps, verIdx, onVersionChange, onFeedback, onRegenerate,
}: {
  resp: ModelResponse;
  modelId: number;
  messageId: number;
  modelResps: ModelResponse[];
  verIdx: number;
  onVersionChange: (dir: 1 | -1) => void;
  onFeedback?: (responseId: number, isLiked: boolean | null) => void;
  onRegenerate?: (messageId: number, modelId: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {modelResps.length > 1 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full mr-1">
          <button onClick={() => onVersionChange(-1)} disabled={verIdx === 0} className="hover:text-foreground disabled:opacity-30 p-0.5">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-medium tabular-nums">{verIdx + 1}/{modelResps.length}</span>
          <button onClick={() => onVersionChange(1)} disabled={verIdx === modelResps.length - 1} className="hover:text-foreground disabled:opacity-30 p-0.5">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/80"
        onClick={() => { navigator.clipboard.writeText(resp.content!); toast.success("Copied"); }}>
        <Copy className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon"
        className={`h-7 w-7 rounded-full ${resp.isLiked === true ? "text-green-500 bg-green-500/10" : "text-muted-foreground hover:bg-muted/80"}`}
        onClick={() => onFeedback?.(resp.id, resp.isLiked === true ? null : true)}>
        <ThumbsUp className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon"
        className={`h-7 w-7 rounded-full ${resp.isLiked === false ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:bg-muted/80"}`}
        onClick={() => onFeedback?.(resp.id, resp.isLiked === false ? null : false)}>
        <ThumbsDown className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/80"
        onClick={async () => {
          if (navigator.share) { try { await navigator.share({ title: "AI Colab", text: resp.content! }); } catch { /**/ } }
          else { navigator.clipboard.writeText(resp.content!); toast.success("Copied for sharing"); }
        }}>
        <Share2 className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/80"
        onClick={() => onRegenerate?.(messageId, modelId)}>
        <RefreshCw className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── Attachments ──────────────────────────────────────────────────────────────
function Attachments({ message }: { message: Message }) {
  if (!message.attachments?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2 px-0">
      {message.attachments.map((att) => (
        <a key={att.id}
          href={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}${att.fileUrl}`}
          target="_blank" rel="noopener"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg text-xs hover:bg-muted/80 transition-colors">
          📎 {att.fileName}
        </a>
      ))}
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator({ isImageMode }: { isImageMode?: boolean }) {
  if (isImageMode) {
    return (
      <div className="w-full h-40 bg-muted-foreground/10 rounded-xl flex items-center justify-center border border-dashed border-muted-foreground/20 my-1">
        <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-sm font-medium">Generating image…</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 150, 300].map((delay) => (
        <div key={delay} className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </div>
  );
}
