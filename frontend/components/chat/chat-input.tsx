"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Loader2, ArrowUp, Search, X, Globe, ChevronDown, Check, Sparkles, Image as ImageIcon, MessageSquare
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

interface ChatInputProps {
  models: Model[];
  selectedModels: number[];
  onModelChange: (ids: number[]) => void;
  maxModels: number;
  onSend: (content: string, files?: File[], chatType?: ChatType) => void;
  isSending: boolean;
  forceReset?: boolean;
  initialPrompt?: string;
  onPromptClear?: () => void;
}

type ChatType = "STANDARD" | "DEEP_RESEARCH" | "IMAGE_GENERATION" | "WEB_SEARCH";

export function ChatInput({
  models,
  selectedModels,
  onModelChange,
  maxModels,
  onSend,
  isSending,
  forceReset,
  initialPrompt,
  onPromptClear,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [chatType, setChatType] = useState<ChatType>("STANDARD");

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

  const handleSubmit = () => {
    if (!content.trim() || isSending) return;
    onSend(content.trim(), files.length > 0 ? files : undefined, chatType);
    setContent("");
    setFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
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

  return (
    <div className="pt-2 pb-6 px-4 w-full">
      <div className="max-w-3xl mx-auto">
        <div className="relative border border-border/60 rounded-[28px] bg-background dark:bg-muted/40 shadow-sm flex flex-col pt-3 pb-2 px-3 focus-within:ring-1 focus-within:ring-primary/20 transition-all">

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

          {/* File previews */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2 mb-2 mt-1">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-lg text-xs border border-border/50">
                  📎 <span className="max-w-[150px] truncate">{file.name}</span>
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Middle Row: input & actions */}
          <div className="flex items-end gap-2 relative">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-10 w-10 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full ml-1 mb-0.5"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
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

            <div className="flex items-center gap-2 flex-shrink-0 mb-0.5 mr-1">
              <div className="h-6 w-px bg-border/60 mr-1 hidden sm:block" />
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
                  content.trim() && !isSending
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md scale-100"
                    : "bg-muted text-muted-foreground scale-95"
                }`}
                onClick={handleSubmit}
                disabled={!content.trim() || isSending}
                title="Send message"
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
                  {selectedModelNames || "Select a model"}
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
