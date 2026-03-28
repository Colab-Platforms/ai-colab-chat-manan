"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { chatService, messageService, modelService, assistantService } from "@/lib/services";
import * as LucideIcons from "lucide-react";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageSquare, Sparkles } from "lucide-react";

interface Model {
  id: number;
  name: string;
  description: string | null;
  externalId?: string;
  isDefault?: boolean;
  defaultForCapabilities?: string[];
}

export function NewChatPage() {
  const router = useRouter();

  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<number[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);

  const [assistant, setAssistant] = useState<any | null>(null);

  const SUGGESTED_PROMPTS = [
    { text: "Brainstorm ideas for...", value: "Brainstorm ideas for ", icon: Sparkles, className: "w-3.5 h-3.5 inline mr-2" },
    { text: "Help me write a...", value: "Help me write a ", icon: MessageSquare, className: "w-3.5 h-3.5 inline mr-2" },
    { text: "Explain how...", value: "Explain how ", icon: MessageSquare, className: "w-3.5 h-3.5 inline mr-2 inline-block transform scale-x-[-1]" },
  ];

  const handleModelChange = (ids: number[]) => {
    setSelectedModels(ids);
    if (ids.length > 0) {
      localStorage.setItem("preferredModelId", String(ids[0]));
    }
  };

  const loadAssistantAndModels = useCallback(async () => {
    let ast: any = null;

    try {
      const savedAssistantId = localStorage.getItem("selectedAssistantId");
      const parsedAssistantId = savedAssistantId ? Number(savedAssistantId) : NaN;
      if (!Number.isNaN(parsedAssistantId)) {
        const res = await assistantService.getById(parsedAssistantId);
        ast = res.data.data;
      }
      setAssistant(ast);

      const modelsCacheKey = "models_cache_v1";
      const modelsCacheTtlMs = 60_000;
      const cachedRaw = sessionStorage.getItem(modelsCacheKey);
      let allModels: any[] = [];
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          if (
            cached &&
            Array.isArray(cached.data) &&
            typeof cached.ts === "number" &&
            Date.now() - cached.ts < modelsCacheTtlMs
          ) {
            allModels = cached.data;
          }
        } catch {
          // ignore malformed cache
        }
      }
      if (allModels.length === 0) {
        const res = await modelService.list({ pageSize: "100" });
        allModels = res.data.data?.data || [];
        sessionStorage.setItem(modelsCacheKey, JSON.stringify({ ts: Date.now(), data: allModels }));
      }
      const activeModels = allModels.filter((m: any) => m.isActive);
      setModels(activeModels);
      
      if (activeModels.length > 0) {
        // If assistant has a default model, use it
        if (ast?.defaultModelId) {
          const m = activeModels.find((model: any) => model.id === ast.defaultModelId);
          if (m) {
            setSelectedModels([m.id]);
            return;
          }
        }

        // New chat: select models that are default for STANDARD capability
        const defaultModels = activeModels.filter((m: any) => m.defaultForCapabilities?.includes("STANDARD"));
        if (defaultModels.length > 0) {
          setSelectedModels(defaultModels.map((m: any) => m.id));
          localStorage.setItem("preferredModelId", String(defaultModels[0].id));
        } else {
          setSelectedModels([activeModels[0].id]);
          localStorage.setItem("preferredModelId", String(activeModels[0].id));
        }
      }
    } catch {
      setAssistant(null);
    }
  }, []);

  useEffect(() => {
    loadAssistantAndModels();
  }, [loadAssistantAndModels]);

  useEffect(() => {
    const handleAssistantSelected = () => {
      loadAssistantAndModels();
    };
    window.addEventListener("assistant-selected", handleAssistantSelected);
    return () =>
      window.removeEventListener("assistant-selected", handleAssistantSelected);
  }, [loadAssistantAndModels]);

  const handleSend = async (content: string, attachmentIds?: number[], chatType?: string, attachmentObjects?: any[]) => {
    if (isSending) return;
    setIsSending(true);

    try {
      // Optional folder-scoped new chat support.
      const rawPendingFolderId = localStorage.getItem("pending_new_chat_folder_id");
      const pendingFolderId = rawPendingFolderId ? Number(rawPendingFolderId) : null;
      const validPendingFolderId = pendingFolderId && !Number.isNaN(pendingFolderId) ? pendingFolderId : null;

      const payload: any = { 
        title: content.substring(0, 50),
        modelIds: selectedModels,
        capability: chatType || "STANDARD",
      };
      if (validPendingFolderId) {
        payload.folderId = validPendingFolderId;
      }
      if (assistant?.id) {
        payload.assistantId = assistant.id;
      }
      const chatRes = await chatService.create(payload);
      const chatId = chatRes.data.data.id;
      const createdInFolder = Boolean(validPendingFolderId);
      localStorage.removeItem("pending_new_chat_folder_id");
      // Context IDs stay in localStorage; chat page applies them right before the first
      // pending message so navigation is not blocked on replaceContexts.
      window.dispatchEvent(
        new CustomEvent("refresh-chats", {
          detail: { immediate: true, refreshFolders: createdInFolder },
        }),
      );
      // Store pending first message in sessionStorage — never in URL params
      sessionStorage.setItem(
        `pending_chat_${chatId}`,
        JSON.stringify({ content, modelIds: selectedModels, chatType: chatType || "STANDARD", attachmentIds, attachmentObjects })
      );
      router.push(`/c/${chatId}`);
    } catch {
      setIsSending(false);
    }
  };

  const handleEnhancePrompt = async (prompt: string) => {
    const res = await messageService.enhancePrompt(prompt);
    return res.data.data;
  };

  let welcomeTitle = "AI Colab Chat";
  let welcomeSubtitle = "Start a conversation with one or multiple AI models. Select your models below and type a message.";
  let ActiveIcon: React.ElementType = Sparkles;
  let activePrompts = SUGGESTED_PROMPTS;

  if (assistant) {
    welcomeTitle = assistant.name;
    welcomeSubtitle = assistant.description || "How can I help you today?";
    const IconComponent = (LucideIcons as any)[assistant.icon] as React.ElementType;
    if (IconComponent) ActiveIcon = IconComponent;
    
    if (assistant.suggestedPrompts && assistant.suggestedPrompts.length > 0) {
      activePrompts = assistant.suggestedPrompts.map((p: string, i: number) => ({
        text: p,
        value: p,
        icon: MessageSquare,
        className: "w-3.5 h-3.5 inline mr-2",
      }));
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Center hero */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-xl">
          <div className={`mx-auto w-16 h-16 ${assistant ? "bg-primary/10" : "bg-gradient-to-br from-primary/20 to-primary/5"} rounded-2xl flex items-center justify-center shadow-sm`}>
            <ActiveIcon className={`w-8 h-8 ${assistant ? "text-primary/80" : "text-primary"}`} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{welcomeTitle}</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto text-balance">{welcomeSubtitle}</p>
          <div className="flex flex-col items-center gap-2 pt-2">
            {activePrompts.length > 0 && (
              <div className="flex justify-center w-full">
                <button
                  onClick={() => setInitialPrompt(activePrompts[0].value)}
                  className="px-4 py-2 text-sm bg-background/80 hover:bg-background/90 rounded-xl transition-colors text-muted-foreground hover:text-foreground border border-border/40 shadow-sm"
                >
                  {(() => {
                     const TopIcon = activePrompts[0].icon;
                     return <TopIcon className={activePrompts[0].className} />;
                  })()}
                  {activePrompts[0].text}
                </button>
              </div>
            )}
            
            {activePrompts.length > 1 && (
              <div className="flex justify-center gap-2 w-full flex-wrap">
                {activePrompts.slice(1, 3).map((prompt, index) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => setInitialPrompt(prompt.value)}
                      className="px-4 py-2 text-sm bg-background/80 hover:bg-background/90 rounded-xl transition-colors text-muted-foreground hover:text-foreground border border-border/40 shadow-sm"
                    >
                      <Icon className={prompt.className} />
                      {prompt.text}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input */}
      <ChatInput
        models={models}
        selectedModels={selectedModels}
        onModelChange={handleModelChange}
        maxModels={-1}
        onSend={handleSend}
        onEnhancePrompt={handleEnhancePrompt}
        isSending={isSending}
        forceReset={true}
        initialPrompt={initialPrompt}
        onPromptClear={() => setInitialPrompt(undefined)}
        draftStorageKey="chat_draft_new"
      />
    </div>
  );
}
