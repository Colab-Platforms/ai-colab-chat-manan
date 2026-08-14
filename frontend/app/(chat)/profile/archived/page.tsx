"use client";

import { useState, useEffect, useCallback } from "react";
import { chatService } from "@/lib/services";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArchiveRestore, MessageSquare, Archive } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface ArchivedChat {
  id: number;
  title: string | null;
  updatedAt: string;
  createdAt: string;
}

export default function ArchivedChatsPage() {
  const [chats, setChats] = useState<ArchivedChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [unarchivingId, setUnarchivingId] = useState<number | null>(null);

  const fetchArchivedChats = useCallback(async () => {
    try {
      const res = await chatService.list({ isArchived: "true" });
      setChats(res.data.data?.data || []);
    } catch {
      toast.error("Failed to load archived chats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchivedChats();
  }, [fetchArchivedChats]);

  const handleUnarchive = async (chatId: number) => {
    setUnarchivingId(chatId);
    try {
      await chatService.archive(chatId);
      toast.success("Chat unarchived");
      setChats((prev) => prev.filter((c) => c.id !== chatId));
    } catch {
      toast.error("Failed to unarchive chat");
    } finally {
      setUnarchivingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Archived Chats</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          View and restore your archived conversations.
        </p>
      </div>

      {chats.length === 0 ? (
        <Card className="border-dashed bg-card/90 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-10 sm:py-12 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Archive className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg mb-1">No archived chats</h3>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-sm">
              Chats you archive from the sidebar will appear here. You can unarchive them anytime.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-card/90 backdrop-blur-sm border border-border/30 rounded-xl divide-y divide-border/20">
          {chats.map((chat) => (
            <div key={chat.id} className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm break-words">
                    {chat.title || "Untitled Chat"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(chat.updatedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 flex-shrink-0 h-8"
                onClick={() => handleUnarchive(chat.id)}
                disabled={unarchivingId === chat.id}
              >
                {unarchivingId === chat.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArchiveRestore className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Unarchive</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
