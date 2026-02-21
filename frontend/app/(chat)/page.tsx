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
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {["Explain quantum computing", "Write a Python script", "Compare React vs Vue"].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSend(suggestion)}
                className="px-3 py-2 text-xs bg-muted hover:bg-muted/80 rounded-xl transition-colors text-muted-foreground hover:text-foreground"
              >
                <MessageSquare className="w-3 h-3 inline mr-1.5" />
                {suggestion}
              </button>
            ))}
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
      />
    </div>
  );
}
