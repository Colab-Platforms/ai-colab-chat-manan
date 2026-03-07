"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Loader2, ArrowUp, Search, X, Globe, ChevronDown, Check, Sparkles, Image as ImageIcon, MessageSquare,
  FileText, File
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getModelIcon } from "@/lib/model-icons";
import { attachmentService } from "@/lib/services";
import { toast } from "react-toastify";

// Dynamically imported so react-speech-recognition never runs on the server
const MicButton = dynamic(
  () => import("@/components/chat/mic-button").then((m) => ({ default: m.MicButton })),
  { ssr: false, loading: () => null }
);

interface Model {
  id: number;
  name: string;
  description: string | null;
  capabilities?: string[];
  externalId?: string;
  defaultForCapabilities?: string[];
}

/** A file that has been uploaded to the backend (Cloudinary) */
interface UploadedAttachment {
  id: number;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  /** local object URL for image thumbnail preview (before upload completes) */
  previewUrl?: string;
  uploading?: boolean;
}

interface ChatInputProps {
  models: Model[];
  selectedModels: number[];
  onModelChange: (ids: number[]) => void;
  maxModels: number;
  onSend: (content: string, attachmentIds?: number[], chatType?: ChatType, attachmentObjects?: UploadedAttachment[]) => void;
  onEnhancePrompt?: (content: string) => Promise<{
    enhancedPrompt: string;
  }>;
  isSending: boolean;
  forceReset?: boolean;
  initialPrompt?: string;
  onPromptClear?: () => void;
}

type ChatType = "STANDARD" | "DEEP_RESEARCH" | "IMAGE_GENERATION" | "WEB_SEARCH";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const ACCEPT_TYPES = "image/*,.pdf,.doc,.docx,.txt,.md,.ppt,.pptx";

function getAttachmentCategory(fileName: string, mimeType: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const lowerMime = mimeType.toLowerCase();
  if (lowerMime.startsWith("image/")) return "image";
  if (lowerMime === "application/pdf" || ext === "pdf") return "pdf";
  if (
    lowerMime.includes("msword") ||
    lowerMime.includes("wordprocessingml") ||
    ext === "doc" ||
    ext === "docx"
  ) {
    return "word";
  }
  if (
    lowerMime.includes("powerpoint") ||
    lowerMime.includes("presentationml") ||
    ext === "ppt" ||
    ext === "pptx"
  ) {
    return "presentation";
  }
  if (lowerMime === "text/markdown" || lowerMime === "text/x-markdown" || ext === "md") {
    return "markdown";
  }
  if (lowerMime.startsWith("text/") || ext === "txt") return "text";
  return "other";
}

function getAttachmentVisual(fileName: string, mimeType: string) {
  const category = getAttachmentCategory(fileName, mimeType);
  switch (category) {
    case "image":
      return {
        icon: <ImageIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />,
        chipClass:
          "bg-violet-50/90 border-violet-200/80 text-violet-900 dark:bg-violet-500/10 dark:border-violet-400/30 dark:text-violet-100",
        iconWrapClass: "bg-violet-100/80 dark:bg-violet-500/20",
      };
    case "pdf":
      return {
        icon: <FileText className="w-4 h-4 text-pink-700 dark:text-pink-300" />,
        chipClass:
          "bg-pink-50/90 border-pink-200/80 text-pink-900 dark:bg-pink-500/10 dark:border-pink-400/30 dark:text-pink-100",
        iconWrapClass: "bg-pink-100/90 dark:bg-pink-500/20",
      };
    case "word":
      return {
        icon: <span className="text-[10px] font-extrabold leading-none text-black dark:text-white">W</span>,
        chipClass:
          "bg-slate-100/90 border-slate-300/80 text-slate-900 dark:bg-slate-800/50 dark:border-slate-600/50 dark:text-slate-100",
        iconWrapClass: "bg-white border border-black/20 dark:bg-black dark:border-white/25",
      };
    case "presentation":
      return {
        icon: <span className="text-[10px] font-extrabold leading-none text-black dark:text-white">P</span>,
        chipClass:
          "bg-fuchsia-50/90 border-fuchsia-200/80 text-fuchsia-900 dark:bg-fuchsia-500/10 dark:border-fuchsia-400/30 dark:text-fuchsia-100",
        iconWrapClass: "bg-white border border-black/20 dark:bg-black dark:border-white/25",
      };
    case "markdown":
      return {
        icon: <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        chipClass:
          "bg-emerald-50/90 border-emerald-200/80 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-400/30 dark:text-emerald-100",
        iconWrapClass: "bg-emerald-100/80 dark:bg-emerald-500/20",
      };
    case "text":
      return {
        icon: <FileText className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />,
        chipClass:
          "bg-cyan-50/90 border-cyan-200/80 text-cyan-900 dark:bg-cyan-500/10 dark:border-cyan-400/30 dark:text-cyan-100",
        iconWrapClass: "bg-cyan-100/80 dark:bg-cyan-500/20",
      };
    default:
      return {
        icon: <File className="w-4 h-4 text-muted-foreground" />,
        chipClass: "bg-muted border-border/50 text-foreground",
        iconWrapClass: "bg-background/70 dark:bg-muted-foreground/10",
      };
  }
}

export function ChatInput({
  models,
  selectedModels,
  onModelChange,
  maxModels,
  onSend,
  onEnhancePrompt,
  isSending,
  forceReset,
  initialPrompt,
  onPromptClear,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [chatType, setChatType] = useState<ChatType>("STANDARD");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");

  // Speech-to-text: track the text that existed before mic was started
  const preExistingTextRef = useRef("");

  const handleSpeechResult = useCallback((transcript: string) => {
    // transcript is the cumulative session text from MicButton
    // Combine with any text that was in the box before recording started
    const prefix = preExistingTextRef.current;
    const separator = prefix && !prefix.endsWith(" ") ? " " : "";
    setContent(prefix + separator + transcript);
  }, []);

  const handleMicStart = useCallback(() => {
    // Save what's in the box right now so speech appends after it
    preExistingTextRef.current = content;
  }, [content]);

  const handleMicStop = useCallback(() => {
    // Nothing needed — content is already set by handleSpeechResult
  }, []);
  
  // Hydrate chat type from local storage
  useEffect(() => {
    if (forceReset) {
      setChatType("STANDARD");
      localStorage.setItem("preferredChatType", "STANDARD");
    } else {
      const savedType = localStorage.getItem("preferredChatType") as ChatType | null;
      if (savedType && ["STANDARD", "DEEP_RESEARCH", "IMAGE_GENERATION", "WEB_SEARCH"].includes(savedType)) {
        setChatType(savedType);
      }
    }
  }, [forceReset]);

  // Save chat type changes
  const handleChatTypeChange = (type: ChatType) => {
    setChatType(type);
    localStorage.setItem("preferredChatType", type);

    // Only keep models that support the new type
    const validModels = models.filter(m => !m.capabilities || m.capabilities.length === 0 || m.capabilities.includes(type));
    
    // Try to auto-switch to the default model for this capability
    const defaultForType = validModels.filter(m => m.defaultForCapabilities?.includes(type));
    if (defaultForType.length > 0) {
      onModelChange(defaultForType.map(m => m.id));
      return;
    }
    
    // Otherwise keep valid selections, or fall back to first valid
    const newSelectedModels = selectedModels.filter(id => validModels.some(m => m.id === id));
    if (newSelectedModels.length === 0 && validModels.length > 0) {
      onModelChange([validModels[0].id]);
    } else if (newSelectedModels.length !== selectedModels.length) {
      onModelChange(newSelectedModels);
    }
  };

  // Automatically enforce VISION capability if image files are attached
  useEffect(() => {
    const hasImageAttachment = attachments.some(a => a.mimeType.startsWith('image/'));

    if (hasImageAttachment) {
      const validSelectedModels = selectedModels.filter((id) => {
        const m = models.find((m) => m.id === id);
        return m?.capabilities?.includes("VISION");
      });

      if (validSelectedModels.length !== selectedModels.length) {
        if (validSelectedModels.length > 0) {
          onModelChange(validSelectedModels);
        } else {
          // Fallback to the first VISION-capable model
          const fallback = models.find((m) => m.capabilities?.includes("VISION"));
          if (fallback) {
            onModelChange([fallback.id]);
            toast.info(`Switched to ${fallback.name} because it supports reading file attachments.`);
          } else {
            toast.warning("No models found that explicitly support file attachments (VISION capability).");
          }
        }
      }
    }
  }, [attachments.length, selectedModels, models, onModelChange]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  useEffect(() => {
    if (initialPrompt) {
      setContent(initialPrompt);
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Move cursor to end
        const len = initialPrompt.length;
        textareaRef.current.setSelectionRange(len, len);
      }
      onPromptClear?.();
    }
  }, [initialPrompt, onPromptClear]);

  const wasSendingRef = useRef(isSending);
  useEffect(() => {
    if (wasSendingRef.current && !isSending) {
      // Focus input after streaming/sending finishes
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
    wasSendingRef.current = isSending;
  }, [isSending]);

  const handleSubmit = () => {
    if (!content.trim() || isSending) return;
    // Only pass IDs of fully uploaded attachments
    const uploadedIds = attachments
      .filter(a => !a.uploading)
      .map(a => a.id);
    onSend(content.trim(), uploadedIds.length > 0 ? uploadedIds : undefined, chatType, attachments.filter(a => !a.uploading));
    setContent("");
    setEnhancedPrompt("");
    // Revoke any object URLs to avoid memory leaks
    attachments.forEach(a => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl); });
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleEnhance = async () => {
    if (!onEnhancePrompt || !content.trim() || isSending || isEnhancing || hasUploadingFiles) return;

    try {
      setIsEnhancing(true);
      const result = await onEnhancePrompt(content.trim());
      const enhanced = result?.enhancedPrompt?.trim();
      if (!enhanced) {
        toast.error("No enhanced prompt returned");
        return;
      }
      setEnhancedPrompt(enhanced);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to enhance prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  const applyEnhancedPrompt = () => {
    if (!enhancedPrompt.trim()) return;
    setContent(enhancedPrompt);
    setEnhancedPrompt("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const discardEnhancedPrompt = () => {
    setEnhancedPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    e.target.value = "";

    if (attachments.length + newFiles.length > 5) {
      toast.error("You can only attach up to 5 files per message constraint.");
      return;
    }

    for (const file of newFiles) {
      const tempId = Date.now() + Math.random();
      const previewUrl = IMAGE_TYPES.includes(file.type) ? URL.createObjectURL(file) : undefined;

      const placeholder: UploadedAttachment = {
        id: tempId as any,
        fileName: file.name,
        fileUrl: "",
        mimeType: file.type,
        previewUrl,
        uploading: true,
      };

      setAttachments(prev => [...prev, placeholder]);

      try {
        const res = await attachmentService.presend(file);
        const data = res.data.data;
        setAttachments(prev =>
          prev.map(a =>
            a.id === (tempId as any)
              ? { ...a, id: data.id, fileUrl: data.fileUrl, uploading: false }
              : a
          )
        );
      } catch (err: any) {
        toast.error(`Failed to upload ${file.name}: ${err?.response?.data?.message || err.message}`);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setAttachments(prev => prev.filter(a => a.id !== (tempId as any)));
      }
    }
  };

  const removeAttachment = (id: number) => {
    const found = attachments.find(a => a.id === id);
    if (!found) return;

    if (found.previewUrl) URL.revokeObjectURL(found.previewUrl);

    if (!found.uploading && typeof found.id === "number") {
      attachmentService.delete(found.id).catch(err => {
        console.error("Failed to delete attachment from server", err);
      });
    }

    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const isSingle = maxModels === 1;
  const toggleModel = (modelId: number) => {
    if (isSingle) {
      onModelChange([modelId]);
    } else if (selectedModels.includes(modelId)) {
      if (selectedModels.length > 1) {
        onModelChange(selectedModels.filter((id) => id !== modelId));
      }
    } else if (maxModels === -1 || selectedModels.length < maxModels) {
      onModelChange([...selectedModels, modelId]);
    }
  };

  const selectedModelNames = models
    .filter((m) => selectedModels.includes(m.id))
    .map((m) => m.name)
    .join(", ");

  const typeLabels: Record<ChatType, string> = {
    STANDARD: "Standard",
    DEEP_RESEARCH: "Deep research",
    IMAGE_GENERATION: "Image generation",
    WEB_SEARCH: "Web search",
  };

  const hasUploadingFiles = attachments.some(a => a.uploading);

  return (
    <div className="pt-2 pb-6 px-4 w-full">
      <div className="max-w-3xl mx-auto">
        <div className="relative border border-border/60 rounded-[28px] bg-background dark:bg-muted/40 shadow-sm flex flex-col pt-3 pb-3 px-3 focus-within:ring-1 focus-within:ring-primary/20 transition-all">

          {/* Top Row: Chat Type Pill */}
          {chatType !== "STANDARD" && (
            <div className="flex items-center mb-1 px-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                {chatType === "WEB_SEARCH" && <Search className="w-3.5 h-3.5" />}
                {chatType === "DEEP_RESEARCH" && <Sparkles className="w-3.5 h-3.5" />}
                {chatType === "IMAGE_GENERATION" && <ImageIcon className="w-3.5 h-3.5" />}
                {typeLabels[chatType]}
                <button 
                  onClick={() => handleChatTypeChange("STANDARD")} 
                  className="ml-1 opacity-70 hover:opacity-100 hover:text-primary transition-opacity"
                  title="Clear type"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Multi-model selection chips */}
          {selectedModels.length > 1 && (
            <div className="flex flex-wrap gap-1.5 px-2 mb-1 mt-1">
              {models
                .filter((m) => selectedModels.includes(m.id))
                .map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20 animate-in fade-in-0 slide-in-from-left-1 duration-200"
                  >
                    {model.externalId && getModelIcon(model.externalId) ? (
                      <img src={getModelIcon(model.externalId)!} alt="" className="w-3.5 h-3.5 rounded-sm object-contain" />
                    ) : null}
                    <span className="max-w-[120px] truncate">{model.name}</span>
                    {selectedModels.length > 1 && (
                      <button
                        onClick={() => onModelChange(selectedModels.filter((id) => id !== model.id))}
                        className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                        title={`Remove ${model.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-5 rounded-full bg-muted text-muted-foreground">
                {selectedModels.length} models
              </Badge>
            </div>
          )}

          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2 mb-2 mt-1">
              {attachments.map((att) => {
                const visual = getAttachmentVisual(att.fileName, att.mimeType);
                return (
                <div
                  key={att.id}
                  className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs border group max-w-[200px] ${visual.chipClass}`}
                >
                  {/* Image thumbnail or icon */}
                  {att.previewUrl ? (
                    <img
                      src={att.previewUrl}
                      alt={att.fileName}
                      className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className={`flex-shrink-0 rounded-md p-1 ${visual.iconWrapClass}`}>
                      {visual.icon}
                    </div>
                  )}

                  <div className="flex flex-col min-w-0">
                    <span className="truncate max-w-[120px] font-medium leading-tight">{att.fileName}</span>
                    {att.uploading && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Uploading…
                      </span>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="absolute -top-1.5 -right-1.5 z-10 h-5 w-5 rounded-full border border-white/30 bg-black text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm dark:border-white/40 dark:bg-black dark:text-white"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )})}
            </div>
          )}

          {enhancedPrompt && (
            <div className="mx-2 mb-2 mt-1 rounded-2xl border border-primary/20 bg-primary/5 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary">Enhanced prompt preview</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">{enhancedPrompt}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-full px-3"
                  onClick={applyEnhancedPrompt}
                >
                  Use this prompt
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-full px-3"
                  onClick={discardEnhancedPrompt}
                >
                  Keep original
                </Button>
              </div>
            </div>
          )}

          {/* Middle Row: input & actions */}
          <div className="flex items-end gap-2 relative pb-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_TYPES}
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-10 w-10 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full ml-1 mb-0.5"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
              disabled={isSending}
            >
              <Plus className="w-5 h-5" />
            </Button>

            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none bg-transparent dark:bg-transparent resize-none p-0 flex-1 min-h-[40px] max-h-[200px] leading-relaxed py-2.5 text-[15px] self-center"
            />

            <div className="flex items-center gap-0.5 flex-shrink-0 mb-0.5 mr-1">
              <div className="h-6 w-px bg-border/60 mr-1 hidden sm:block" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 rounded-full px-2 text-xs font-medium"
                onClick={handleEnhance}
                disabled={!content.trim() || isSending || isEnhancing || hasUploadingFiles || !onEnhancePrompt}
                title={hasUploadingFiles ? "Wait for files to finish uploading" : "Enhance prompt with GPT-4.1"}
              >
                {isEnhancing ? (
                  <Loader2 className="h-3.5 w-3.5 sm:mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 sm:mr-1.5" />
                )}
                <span className="hidden sm:inline">Enhance</span>
              </Button>
              {/* MicButton is dynamically imported with ssr:false — handles all speech logic */}
              <MicButton
                onResult={handleSpeechResult}
                onStart={handleMicStart}
                onStop={handleMicStop}
                hasText={!!content.trim()}
              />

              <Button
                size="icon"
                className={`h-10 w-10 rounded-full transition-all duration-200 ${
                  content.trim() && !isSending && !hasUploadingFiles
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md scale-100"
                    : "bg-muted text-muted-foreground scale-95"
                }`}
                onClick={handleSubmit}
                disabled={!content.trim() || isSending || hasUploadingFiles}
                title={hasUploadingFiles ? "Wait for files to finish uploading" : "Send message"}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Bottom Row: Model & Chat Type Selector Dropdown */}
          <div className="flex items-center mt-2 px-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted/60 outline-none">
                {(() => {
                  const singleModel = selectedModels.length === 1
                    ? models.find(m => m.id === selectedModels[0])
                    : null;
                  const icon = singleModel?.externalId ? getModelIcon(singleModel.externalId) : null;
                  return icon
                    ? <img src={icon} alt="" className="w-4 h-4 rounded-sm object-contain opacity-80" />
                    : <Globe className="w-4 h-4 opacity-70" />;
                })()}
                <span className="truncate max-w-[200px] sm:max-w-[300px]">
                  {chatType !== "STANDARD" ? `${typeLabels[chatType]} only` : "Standard chat"} 
                  {" • "} 
                  {selectedModels.length > 1 ? `${selectedModels.length} models` : (selectedModelNames || "Select a model")}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[300px] p-2 rounded-xl">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1 px-2">Capabilities</DropdownMenuLabel>
                <DropdownMenuItem className="gap-2 focus:bg-muted cursor-pointer rounded-md py-2" onClick={() => handleChatTypeChange("STANDARD")}>
                  <div className="w-4 flex justify-center">{chatType === "STANDARD" && <Check className="w-3 h-3 text-primary" />}</div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground mr-1" />
                    <span>Standard Chat</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 focus:bg-muted cursor-pointer rounded-md py-2" onClick={() => handleChatTypeChange("WEB_SEARCH")}>
                  <div className="w-4 flex justify-center">{chatType === "WEB_SEARCH" && <Check className="w-3 h-3 text-primary" />}</div>
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground mr-1" />
                    <span>Web Search</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 focus:bg-muted cursor-pointer rounded-md py-2" onClick={() => handleChatTypeChange("DEEP_RESEARCH")}>
                  <div className="w-4 flex justify-center">{chatType === "DEEP_RESEARCH" && <Check className="w-3 h-3 text-primary" />}</div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-muted-foreground mr-1" />
                    <span>Deep Research</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 focus:bg-muted cursor-pointer rounded-md py-2" onClick={() => handleChatTypeChange("IMAGE_GENERATION")}>
                  <div className="w-4 flex justify-center">{chatType === "IMAGE_GENERATION" && <Check className="w-3 h-3 text-primary" />}</div>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-muted-foreground mr-1" />
                    <span>Image Generation</span>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="my-2" />
                
                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1 px-2 flex justify-between items-center">
                  <span>Models</span>
                  {!isSingle && selectedModels.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 rounded-md">{selectedModels.length} selected</Badge>}
                </DropdownMenuLabel>
                
                <div className="max-h-[250px] overflow-y-auto scrollbar-thin">
                  {models
                    .filter(m => !m.capabilities || m.capabilities.length === 0 || m.capabilities.includes(chatType))
                    .filter(m => {
                      const hasImage = attachments.some(a => a.mimeType.startsWith('image/'));
                      return !hasImage || (m.capabilities && m.capabilities.includes("VISION"));
                    })
                    .map((model) => (
                    <DropdownMenuItem 
                      key={model.id} 
                      className="gap-2 focus:bg-muted cursor-pointer rounded-md py-2 items-start"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleModel(model.id);
                      }}
                    >
                      <div className="w-4 flex justify-center mt-0.5">{selectedModels.includes(model.id) && <Check className="w-3 h-3 text-primary" />}</div>
                      <div className="flex items-center gap-2 flex-1">
                        {model.externalId && getModelIcon(model.externalId)
                          ? <img src={getModelIcon(model.externalId)!} alt="" className="w-4 h-4 rounded-sm object-contain flex-shrink-0" />
                          : <div className="w-4 h-4" />}
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[13px] leading-tight">{model.name}</span>
                          {model.description && <span className="text-[11px] text-muted-foreground leading-tight line-clamp-2">{model.description}</span>}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
        </div>
      </div>
    </div>
  );
}
