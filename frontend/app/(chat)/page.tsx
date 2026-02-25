"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { chatService } from "@/lib/services";
import { modelService } from "@/lib/services";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageSquare, Sparkles } from "lucide-react";

interface Model {
  id: number;
  name: string;
  description: string | null;
}

export default function NewChatPage() {
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<number[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);

  const SUGGESTED_PROMPTS = [
    { text: "Brainstorm ideas for...", value: "Brainstorm ideas for ", icon: Sparkles, className: "w-3.5 h-3.5 inline mr-2" },
    { text: "Help me write a...", value: "Help me write a ", icon: MessageSquare, className: "w-3.5 h-3.5 inline mr-2" },
    { text: "Explain how...", value: "Explain how ", icon: MessageSquare, className: "w-3.5 h-3.5 inline mr-2 inline-block transform scale-x-[-1]" },
  ];

  const fetchModels = useCallback(async () => {
    try {
      const res = await modelService.list();
      const allModels = res.data.data?.data || [];
      const activeModels = allModels.filter((m: any) => m.isActive);
      setModels(activeModels);
      
      if (activeModels.length > 0) {
        // Hard reset on New Chat: always ignore cache and fallback to 4.1/gpt-4
        const fallbackModel = activeModels.find((m: any) => m.name.toLowerCase().includes("4.1") || m.name.toLowerCase().includes("gpt-4")) || activeModels[0];
        setSelectedModels([fallbackModel.id]);
        
        // Immediately overwrite the global storage with this reset
        localStorage.setItem("preferredModelId", String(fallbackModel.id));
      }
    } catch { /* ignore */ }
  }, []);

  const handleModelChange = (ids: number[]) => {
    setSelectedModels(ids);
    if (ids.length > 0) {
      localStorage.setItem("preferredModelId", String(ids[0]));
    }
  };

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleSend = async (content: string) => {
    if (isSending) return;
    setIsSending(true);

    try {
      const chatRes = await chatService.create({ title: content.substring(0, 50) });
      const chatId = chatRes.data.data.id;
      window.dispatchEvent(new Event('refresh-chats'));
      router.push(`/c/${chatId}?firstMessage=${encodeURIComponent(content)}&models=${selectedModels.join(",")}`);
    } catch {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Center hero */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AI Colab Chat</h1>
          <p className="text-muted-foreground text-sm">
            Start a conversation with one or multiple AI models. Select your models below and type a message.
          </p>
          <div className="flex flex-col items-center gap-2 pt-2">
            {/* Top row (1 prompt) */}
            <div className="flex justify-center w-full">
              <button
                onClick={() => setInitialPrompt(SUGGESTED_PROMPTS[0].value)}
                className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-xl transition-colors text-muted-foreground hover:text-foreground border border-border/40 shadow-sm"
              >
                {(() => {
                  const TopIcon = SUGGESTED_PROMPTS[0].icon;
                  return <TopIcon className={SUGGESTED_PROMPTS[0].className} />;
                })()}
                {SUGGESTED_PROMPTS[0].text}
              </button>
            </div>
            
            {/* Bottom row (2 prompts) */}
            <div className="flex justify-center gap-2 w-full">
              {SUGGESTED_PROMPTS.slice(1, 3).map((prompt, index) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={index}
                    onClick={() => setInitialPrompt(prompt.value)}
                    className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-xl transition-colors text-muted-foreground hover:text-foreground border border-border/40 shadow-sm"
                  >
                    <Icon className={prompt.className} />
                    {prompt.text}
                  </button>
                );
              })}
            </div>
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
        isSending={isSending}
        forceReset={true}
        initialPrompt={initialPrompt}
        onPromptClear={() => setInitialPrompt(undefined)}
      />
    </div>
  );
}
