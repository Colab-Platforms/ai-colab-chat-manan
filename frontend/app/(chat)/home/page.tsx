"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { NewChatPage } from "@/components/chat/NewChatPage";

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

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  // Unauthenticated visitors belong on the landing page, not the chat home.
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
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

  return (
    <>
      <Suspense fallback={null}>
        <HomeFolderScopeSync />
      </Suspense>
      <NewChatPage />
    </>
  );
}
