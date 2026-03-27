"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { NewChatPage } from "@/components/chat/NewChatPage";

export default function ChatHomePage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const rawFolderId = searchParams.get("folderId");
    const prevFolderId = localStorage.getItem("pending_new_chat_folder_id");
    const nextFolderId = rawFolderId && rawFolderId.trim() !== "" ? rawFolderId : null;

    if (nextFolderId) {
      localStorage.setItem("pending_new_chat_folder_id", nextFolderId);
    } else {
      localStorage.removeItem("pending_new_chat_folder_id");
    }

    // Avoid emitting sidebar refresh events when folder scope didn't change.
    if ((prevFolderId ?? null) === nextFolderId) return;

    window.dispatchEvent(
      new CustomEvent("pending-new-chat-folder-updated", {
        detail: { folderId: nextFolderId ? Number(nextFolderId) : null },
      }),
    );
  }, [searchParams]);

  return <NewChatPage />;
}
