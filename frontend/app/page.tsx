"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { LandingPage } from "@/components/landing/LandingPage";
import { NewChatPage } from "@/components/chat/NewChatPage";

function HomeFolderScopeSync() {
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

    if ((prevFolderId ?? null) === nextFolderId) return;

    window.dispatchEvent(
      new CustomEvent("pending-new-chat-folder-updated", {
        detail: { folderId: nextFolderId ? Number(nextFolderId) : null },
      }),
    );
  }, [searchParams]);

  return null;
}

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
      <>
        <Suspense fallback={null}>
          <HomeFolderScopeSync />
        </Suspense>
        <NewChatPage />
      </>
    );
  }

  return <LandingPage />;
}
