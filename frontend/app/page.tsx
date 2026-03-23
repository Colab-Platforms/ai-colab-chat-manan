"use client";

import { useAuth } from "@/context/auth-context";
import { LandingPage } from "@/components/landing/LandingPage";
import { NewChatPage } from "@/components/chat/NewChatPage";
import { ChatLayoutView } from "@/components/chat/ChatLayoutView";

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <ChatLayoutView>
        <NewChatPage />
      </ChatLayoutView>
    );
  }

  return <LandingPage />;
}

