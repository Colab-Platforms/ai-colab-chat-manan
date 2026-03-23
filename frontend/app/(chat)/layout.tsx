"use client";

import { ChatLayoutView } from "@/components/chat/ChatLayoutView";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatLayoutView>
      {children}
    </ChatLayoutView>
  );
}

