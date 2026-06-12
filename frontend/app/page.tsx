"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { LandingPage } from "@/components/landing/LandingPage";
import { NewChatPage } from "@/components/chat/NewChatPage";
import { HoverBlurSurface } from "@/components/landing/components/HoverBlurSurface";

function HomeFolderScopeSync() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const rawFolderId = searchParams.get("folderId");
    const prevFolderId = localStorage.getItem("pending_new_chat_folder_id");
    const nextFolderId =
      rawFolderId && rawFolderId.trim() !== "" ? rawFolderId : null;

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
  const { theme } = useTheme();

  if (isLoading) {
    const ringBase =
      theme === "dark" ? "border-[#f2bfdc]/25" : "border-landing-primary/20";

    const ringTop =
      theme === "dark" ? "border-t-[#f2bfdc]" : "border-t-landing-primary";

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="relative h-9 w-9">
          <div
            className={`absolute inset-0 rounded-full border-2 ${ringBase}`}
          />
          <div
            className={`absolute inset-0 rounded-full border-2 border-transparent ${ringTop} animate-spin`}
          />
        </div>
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
