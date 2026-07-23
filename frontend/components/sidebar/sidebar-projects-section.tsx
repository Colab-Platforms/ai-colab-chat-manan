"use client";

import {
  memo,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
} from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Folder,
  FolderPlus,
  ChevronRight,
  MoreHorizontal,
  Edit2,
  Trash2,
  Plus,
} from "lucide-react";
import { chatService } from "@/lib/services";
import { ChatItem } from "@/components/sidebar/sidebar-chat-item";
import { SIDEBAR_SECTION_HEADER_ROW, SIDEBAR_SECTION_TITLE } from "@/components/sidebar/sidebar-section-styles";
import type { Chat, FolderItem } from "@/components/sidebar/sidebar-types";

function FolderGroup({
  folder,
  isExpanded,
  onToggleFolder,
  onRefresh,
  onMobileClose,
  handleArchiveChat,
  handlePinChat,
  handleRenameChat,
  handleMoveChat,
  handleShareChat,
  handleOpenCreateFolderForMove,
  localFolders,
  pendingMoveForChat,
  pendingMoveNewFolderId,
  setPendingMoveForChat,
  setPendingMoveNewFolderId,
  setRenameFolderTarget,
  setDeleteFolderTarget,
  setDeleteTarget,
  searchQuery,
  globalChats,
  onNewChatInFolder,
}: {
  folder: FolderItem;
  isExpanded: boolean;
  onToggleFolder: (folderId: number) => void;
  onRefresh: () => void;
  onMobileClose: () => void;
  handleArchiveChat: (e: MouseEvent, chatId: number) => void;
  handlePinChat: (chatId: number) => void;
  handleRenameChat: (chatId: number, newTitle: string) => void;
  handleMoveChat: (chatId: number, folderId: number | null) => void;
  handleShareChat: (chatId: number) => void;
  handleOpenCreateFolderForMove: (chatId: number) => void;
  localFolders: FolderItem[];
  pendingMoveForChat: number | null;
  pendingMoveNewFolderId: number | null;
  setPendingMoveForChat: Dispatch<SetStateAction<number | null>>;
  setPendingMoveNewFolderId: Dispatch<SetStateAction<number | null>>;
  setRenameFolderTarget: Dispatch<SetStateAction<{ id: number; name: string } | null>>;
  setDeleteFolderTarget: Dispatch<SetStateAction<number | null>>;
  setDeleteTarget: Dispatch<SetStateAction<number | null>>;
  searchQuery: string;
  globalChats: Chat[];
  onNewChatInFolder: (folderId: number) => void;
}) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchFolderChats = useCallback(async (pageNum = 1) => {
    if (searchQuery) return;
    setLoading(true);
    try {
      const res = await chatService.list({
        folderId: folder.id.toString(),
        page: pageNum.toString(),
        pageSize: "8",
        isArchived: "false",
      });
      const result = res.data.data;
      const fetched = result?.data || [];
      setChats((prev: Chat[]) => {
        if (pageNum === 1) {
          if (prev.length === fetched.length &&
              fetched.every((fc: Chat, i: number) => {
                const pc = prev[i];
                return pc && pc.id === fc.id && pc.title === fc.title &&
                       pc.isPinned === fc.isPinned && pc.isArchived === fc.isArchived;
              })) {
            return prev;
          }
          return fetched;
        }
        const exists = new Set(prev.map((c: Chat) => c.id));
        return [...prev, ...fetched.filter((c: Chat) => !exists.has(c.id))];
      });
      setPage(pageNum);
      setHasMore(Boolean(result?.hasNextPage));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [folder.id, searchQuery]);

  useEffect(() => {
    if (isExpanded && !searchQuery && chats.length === 0) {
      fetchFolderChats(1);
    }
  }, [isExpanded, searchQuery, chats.length, fetchFolderChats]);

  useEffect(() => {
    const handleRefresh = (evt: Event) => {
      const ce = evt as CustomEvent<{ refreshFolders?: boolean }>;
      if (!ce.detail?.refreshFolders) return;
      if (searchQuery) return;
      if (isExpanded) {
        void fetchFolderChats(1);
      } else {
        // Drop cached rows so the next expand refetches (otherwise chats.length > 0 skips fetch).
        setChats([]);
        setPage(1);
        setHasMore(false);
      }
    };
    window.addEventListener("refresh-chats", handleRefresh as EventListener);
    return () => window.removeEventListener("refresh-chats", handleRefresh as EventListener);
  }, [searchQuery, isExpanded, fetchFolderChats]);

  const displayChats = searchQuery
    ? globalChats.filter((c: Chat) => c.folderId === folder.id)
    : chats;

  const sortByPin = (a: Chat, b: Chat) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
  const sortedChats = useMemo(
    () => [...displayChats].sort(sortByPin),
    [displayChats],
  );

  if (searchQuery && displayChats.length === 0) return null;

  return (
    <div key={folder.id}>
      <div
        className="group flex w-full items-center justify-between rounded-lg text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent cursor-pointer px-3 py-2"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded || !!searchQuery}
        aria-label={isExpanded || searchQuery ? "Collapse project" : "Expand project"}
        onClick={() => onToggleFolder(folder.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleFolder(folder.id);
          }
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <Folder className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center">
          <Button
            variant="ghost"
            className="h-7 w-7 rounded p-0 text-muted-foreground transition-opacity hover:bg-sidebar-accent hover:text-foreground focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onNewChatInFolder(folder.id);
            }}
            title={`New chat in ${folder.name}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground">
          <ChevronRight
            className={`h-3 w-3 transition-transform ${isExpanded || searchQuery ? "rotate-90" : ""}`}
          />
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-7 w-7 rounded p-0 text-muted-foreground transition-opacity hover:bg-sidebar-accent hover:text-foreground focus:opacity-100 data-[state=open]:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setRenameFolderTarget({ id: folder.id, name: folder.name });
                }}
              >
                <Edit2 className="mr-2 h-4 w-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteFolderTarget(folder.id);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {(isExpanded || searchQuery) && (
        <div className="space-y-0.5">
          {sortedChats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              folders={localFolders}
              isActive={false}
              onDelete={(e, id) => { e.stopPropagation(); e.preventDefault(); setDeleteTarget(id); }}
              onArchive={handleArchiveChat}
              onPin={handlePinChat}
              onNavigate={onMobileClose}
              onRename={handleRenameChat}
              onMove={handleMoveChat}
              onShare={handleShareChat}
              onCreateFolderForMove={handleOpenCreateFolderForMove}
              pendingMoveNewFolderId={pendingMoveForChat === chat.id ? pendingMoveNewFolderId : null}
              onPendingMoveConsumed={() => { setPendingMoveForChat(null); setPendingMoveNewFolderId(null); }}
              indent
            />
          ))}
          {!searchQuery && hasMore && (
            <Button
              variant="ghost"
              className="w-[calc(100%-24px)] ml-6 mt-1 text-[10px] text-muted-foreground hover:text-foreground h-6 cursor-pointer py-0 justify-start"
              onClick={() => fetchFolderChats(page + 1)}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load More"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export const ProjectsSection = memo(function ProjectsSection({
  projectsExpanded,
  setProjectsExpanded,
  safeFolders,
  expandedFolders,
  toggleFolder,
  search,
  onRefresh,
  onMobileClose,
  handleArchiveChat,
  handlePinChat,
  handleRenameChat,
  handleMoveChat,
  handleShareChat,
  handleOpenCreateFolderForMove,
  localFolders,
  pendingMoveForChat,
  pendingMoveNewFolderId,
  setPendingMoveForChat,
  setPendingMoveNewFolderId,
  setRenameFolderTarget,
  setDeleteFolderTarget,
  setDeleteTarget,
  filteredChats,
  setCreateFolderOpen,
  onNewChatInFolder,
}: {
  projectsExpanded: boolean;
  setProjectsExpanded: Dispatch<SetStateAction<boolean>>;
  safeFolders: FolderItem[];
  expandedFolders: Set<number>;
  toggleFolder: (folderId: number) => void;
  search: string;
  onRefresh: () => void;
  onMobileClose: () => void;
  handleArchiveChat: (e: MouseEvent, chatId: number) => void;
  handlePinChat: (chatId: number) => void;
  handleRenameChat: (chatId: number, newTitle: string) => void;
  handleMoveChat: (chatId: number, folderId: number | null) => void;
  handleShareChat: (chatId: number) => void;
  handleOpenCreateFolderForMove: (chatId: number) => void;
  localFolders: FolderItem[];
  pendingMoveForChat: number | null;
  pendingMoveNewFolderId: number | null;
  setPendingMoveForChat: Dispatch<SetStateAction<number | null>>;
  setPendingMoveNewFolderId: Dispatch<SetStateAction<number | null>>;
  setRenameFolderTarget: Dispatch<SetStateAction<{ id: number; name: string } | null>>;
  setDeleteFolderTarget: Dispatch<SetStateAction<number | null>>;
  setDeleteTarget: Dispatch<SetStateAction<number | null>>;
  filteredChats: Chat[];
  setCreateFolderOpen: Dispatch<SetStateAction<boolean>>;
  onNewChatInFolder: (folderId: number) => void;
}) {
  return (
    <>
      <div className={`${SIDEBAR_SECTION_HEADER_ROW}`}>
        <button
          type="button"
          className="min-w-0 flex-1 py-2.5 px-3 text-left"
          onClick={() => setProjectsExpanded((p) => !p)}
        >
          <span className={`block w-full text-left ${SIDEBAR_SECTION_TITLE}`}>Projects</span>
        </button>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setPendingMoveForChat(null);
              setCreateFolderOpen(true);
            }}
            title="New project folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/80"
          onClick={() => setProjectsExpanded((p) => !p)}
          aria-expanded={projectsExpanded}
          aria-label={projectsExpanded ? "Collapse projects" : "Expand projects"}
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${projectsExpanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>
      {projectsExpanded && safeFolders.length === 0 && !search.trim() && (
        <div className="px-3 py-2 text-xs text-muted-foreground/80">No project folders yet.</div>
      )}
      {projectsExpanded &&
        safeFolders.map((folder) => (
          <FolderGroup
            key={folder.id}
            folder={folder}
            isExpanded={expandedFolders.has(folder.id)}
            onToggleFolder={toggleFolder}
            onRefresh={onRefresh}
            onMobileClose={onMobileClose}
            handleArchiveChat={handleArchiveChat}
            handlePinChat={handlePinChat}
            handleRenameChat={handleRenameChat}
            handleMoveChat={handleMoveChat}
            handleShareChat={handleShareChat}
            handleOpenCreateFolderForMove={handleOpenCreateFolderForMove}
            localFolders={localFolders}
            pendingMoveForChat={pendingMoveForChat}
            pendingMoveNewFolderId={pendingMoveNewFolderId}
            setPendingMoveForChat={setPendingMoveForChat}
            setPendingMoveNewFolderId={setPendingMoveNewFolderId}
            setRenameFolderTarget={setRenameFolderTarget}
            setDeleteFolderTarget={setDeleteFolderTarget}
            setDeleteTarget={setDeleteTarget}
            searchQuery={search}
            globalChats={filteredChats}
            onNewChatInFolder={onNewChatInFolder}
          />
        ))}
    </>
  );
}, (prev, next) => {
  if (prev.projectsExpanded !== next.projectsExpanded) return false;
  if (prev.search !== next.search) return false;
  if (prev.pendingMoveForChat !== next.pendingMoveForChat) return false;
  if (prev.pendingMoveNewFolderId !== next.pendingMoveNewFolderId) return false;
  if (prev.safeFolders.length !== next.safeFolders.length) return false;
  if (prev.filteredChats.length !== next.filteredChats.length) return false;
  if (prev.localFolders.length !== next.localFolders.length) return false;
  if (prev.expandedFolders.size !== next.expandedFolders.size) return false;

  for (let i = 0; i < prev.safeFolders.length; i += 1) {
    if (
      prev.safeFolders[i].id !== next.safeFolders[i].id ||
      prev.safeFolders[i].name !== next.safeFolders[i].name
    ) {
      return false;
    }
  }
  for (let i = 0; i < prev.filteredChats.length; i += 1) {
    const a = prev.filteredChats[i];
    const b = next.filteredChats[i];
    if (
      a.id !== b.id ||
      a.title !== b.title ||
      a.folderId !== b.folderId ||
      a.isPinned !== b.isPinned ||
      a.isArchived !== b.isArchived
    ) {
      return false;
    }
  }
  for (let i = 0; i < prev.localFolders.length; i += 1) {
    if (
      prev.localFolders[i].id !== next.localFolders[i].id ||
      prev.localFolders[i].name !== next.localFolders[i].name
    ) {
      return false;
    }
  }
  for (const id of prev.expandedFolders) {
    if (!next.expandedFolders.has(id)) {
      return false;
    }
  }
  return true;
});
