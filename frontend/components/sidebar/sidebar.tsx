"use client";

import { useState, ReactNode, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import * as LucideIcons from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ContextModal } from "@/components/contexts/ContextModal";
import { ContextViewDialog } from "@/components/contexts/ContextViewDialog";
import {
  Plus,
  MessageSquare,
  Folder,
  FolderPlus,
  Search,
  Sun,
  Moon,
  LogOut,
  Settings,
  ChevronRight,
  Archive,
  Trash2,
  MoreHorizontal,
  Edit2,
  CornerUpRight,
  Share,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Pin,
  PinOff,
  Star,
  Bot,
  Brain,
  Eye,
} from "lucide-react";
import { chatService, contextService, folderService } from "@/lib/services";
import { getRouteUiSnapshot, subscribeRouteUi, useIsChatActive, useIsStarredRoute } from "@/lib/route-ui-store";
import { toast } from "react-toastify";

// ─────────────────────────────────────────────────────────────────────────────
// Shared Types
// ─────────────────────────────────────────────────────────────────────────────

interface Assistant {
  id: number;
  name: string;
  description?: string | null;
  icon: string;
  bgFrom?: string | null;
  bgVia?: string | null;
  bgTo?: string | null;
  bgFromDark?: string | null;
  bgViaDark?: string | null;
  bgToDark?: string | null;
  isActive: boolean;
}

interface Chat {
  id: number;
  title: string | null;
  folderId: number | null;
  isArchived: boolean;
  isPinned: boolean;
  updatedAt: string;
  assistantId?: number | null;
  assistant?: { id: number; name: string; icon: string } | null;
}

interface FolderItem {
  id: number;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AppSidebar – Unified shell used by both chat and settings variants
// ─────────────────────────────────────────────────────────────────────────────

interface AppSidebarProps {
  /** "chat"     → footer shows Settings link
   *  "settings" → footer shows Go to Chat link */
  variant: "chat" | "settings";
  /** Scrollable inner content rendered between header and footer */
  children: ReactNode;
  /** Optional icon buttons shown inside the 64-px collapsed sidebar */
  collapsedIcons?: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Called when a mobile-overlay action should close the sheet */
  onMobileClose?: () => void;
  /** Called on logout; if omitted the component calls logout() directly */
  onLogout?: () => void;
}

export function AppSidebar({
  variant,
  children,
  collapsedIcons,
  collapsed,
  onToggleCollapse,
  onMobileClose,
  onLogout,
}: AppSidebarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const handleClose = () => onMobileClose?.();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
      router.replace("/login");
    }
  };

  // ─── Collapsed icon-only sidebar (desktop) ───────────────────────────────
  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="h-full flex flex-col items-center bg-[#ffffff80] dark:bg-[#00000080] text-sidebar-foreground w-[64px] min-w-[64px] py-3 gap-1">
          {/* Logo */}
          <div className="mb-1">
            <Image src="/black.webp" alt="AI Colab" width={30} height={30} className="dark:hidden opacity-90 h-auto" priority />
            <Image src="/white.webp" alt="AI Colab" width={30} height={30} className="hidden dark:block opacity-90 h-auto" priority />
          </div>

          {/* Expand toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg cursor-pointer"
                onClick={onToggleCollapse}
              >
                <PanelLeftOpen className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>

          {/* Variant-specific collapsed icons */}
          {collapsedIcons}

          <div className="flex-1" />

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full cursor-pointer p-0">
                <Avatar className="w-8 h-8 border border-border/50">
                  {user?.profileImage && <AvatarImage src={user.profileImage} alt="Profile" className="object-cover" />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-[200px]">
              <div className="px-2 py-1.5 border-b border-border/50 mb-1">
                <span className="font-medium text-sm">{user?.firstName} {user?.lastName}</span>
                {user?.email && <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>}
              </div>
              <DropdownMenuItem onClick={toggleTheme} className="gap-2 cursor-pointer">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>
              {variant === "chat" ? (
                <DropdownMenuItem onClick={() => { handleClose(); router.push("/profile"); }} className="gap-2 cursor-pointer">
                  <Settings className="w-4 h-4" /> Settings
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    handleClose();
                    try {
                      localStorage.removeItem("pending_new_chat_context_ids");
                      localStorage.removeItem("pending_new_chat_folder_id");
                    } catch {
                      // ignore localStorage issues
                    }
                    router.push("/");
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" /> Go to Chat
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="w-4 h-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>
    );
  }

  // ─── Full expanded sidebar ────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-[#ffffff80] dark:bg-[#00000080] text-sidebar-foreground w-full">
      {/* Logo & collapse toggle */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div>
          <Image src="/black.webp" alt="AI Colab" width={70} height={28} className="dark:hidden opacity-90 h-auto" priority />
          <Image src="/white.webp" alt="AI Colab" width={70} height={28} className="hidden dark:block opacity-90 h-auto" priority />
        </div>
        <div className="flex items-center gap-1">
          {/* Mobile close button — same role as Sheet's built-in X */}
          {onMobileClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md cursor-pointer md:hidden"
              onClick={onMobileClose}
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          {/* Desktop collapse button */}
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md cursor-pointer hidden md:flex"
              onClick={onToggleCollapse}
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Inner content (scrollable area, nav links, etc.) */}
      {children}

      <Separator className="opacity-50" />

      {/* Footer / User Profile */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2 px-2 text-sm cursor-pointer hover:bg-sidebar-accent overflow-hidden">
              <Avatar className="w-9 h-9 border border-border/50">
                {user?.profileImage && <AvatarImage src={user.profileImage} alt="Profile" className="object-cover" />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="truncate w-full text-left font-medium text-sm leading-tight">{user?.firstName} {user?.lastName}</span>
                {user?.email && <span className="truncate w-full text-left text-xs text-muted-foreground leading-tight mt-0.5">{user?.email}</span>}
              </div>
              <MoreHorizontal className="w-4 h-4 ml-auto text-muted-foreground flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[240px]">
            <DropdownMenuItem onClick={toggleTheme} className="gap-2 cursor-pointer">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </DropdownMenuItem>
            {variant === "chat" ? (
              <DropdownMenuItem onClick={() => { handleClose(); router.push("/profile"); }} className="gap-2 cursor-pointer">
                <Settings className="w-4 h-4" /> Settings
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => {
                  handleClose();
                  try {
                    localStorage.removeItem("pending_new_chat_context_ids");
                    localStorage.removeItem("pending_new_chat_folder_id");
                  } catch {
                    // ignore localStorage issues
                  }
                  router.push("/");
                }}
                className="gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" /> Go to Chat
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="w-4 h-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar – Chat sidebar (wraps AppSidebar with chat-specific children)
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarProps {
  chats: Chat[];
  folders: FolderItem[];
  assistants: Assistant[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  assistantsHasMore?: boolean;
  onLoadMoreAssistants?: () => void;
  onRefresh: () => void;
  onMobileClose: () => void;
  onLogout?: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar section chrome (aligned action column + chevron column)
// ─────────────────────────────────────────────────────────────────────────────


const SIDEBAR_SECTION_HEADER_ROW =
  "w-full flex items-center gap-1 rounded-md border border-border/25 bg-background shadow-xs hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 w-full justify-start gap-2 border-border/50 hover:bg-sidebar-accent transition-colors cursor-pointer my-2.5";
const SIDEBAR_SECTION_TITLE =
  "text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90";

function ContextSidebarItem({
  ctx,
  isSelected,
  onToggle,
  onView,
  onEdit,
  onDelete,
}: {
  ctx: { id: number; title?: string; memory?: string; isAutoGenerated?: boolean };
  isSelected: boolean;
  onToggle: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isSystemContext = Boolean(ctx.isAutoGenerated);
  return (
    <div
      className={`group relative flex w-full min-w-0 items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-sidebar-accent ${
        isSystemContext ? "cursor-not-allowed opacity-80" : "cursor-pointer"
      }`}
      role="checkbox"
      aria-checked={isSelected}
      aria-disabled={isSystemContext}
      tabIndex={0}
      onClick={() => {
        if (isSystemContext) return;
        onToggle();
      }}
      onKeyDown={(e) => {
        if (isSystemContext) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        disabled={isSystemContext}
        onClick={(e) => {
          // Avoid double-toggle: checkbox click already triggers `onChange`,
          // and then bubbles to the row `onClick`.
          e.stopPropagation();
        }}
        className="h-3.5 w-3.5 shrink-0 accent-primary cursor-pointer"
      />
      <span
        className="min-w-0 flex-1 truncate pr-10 text-xs text-foreground"
        title={ctx.title || ctx.memory}
      >
        {ctx.title || "Untitled context"}
      </span>
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-7 w-7 rounded p-0 text-muted-foreground transition-opacity hover:bg-sidebar-accent hover:text-foreground focus:opacity-100 data-[state=open]:opacity-100 md:opacity-0 md:group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={onView}>
              <Eye className="h-3.5 w-3.5" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={(e) => {
                if (isSystemContext) {
                  e.preventDefault();
                  return;
                }
                onEdit();
              }}
              disabled={isSystemContext}
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              className={`gap-2 ${isSystemContext ? "" : "cursor-pointer"}`}
              disabled={isSystemContext}
              title={
                isSystemContext
                  ? "Cannot delete system generated context"
                  : undefined
              }
              onSelect={(e) => {
                if (isSystemContext) {
                  e.preventDefault();
                  return;
                }
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FolderGroup – Handles its own chat fetching and local pagination
// ─────────────────────────────────────────────────────────────────────────────

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
}: {
  folder: FolderItem;
  isExpanded: boolean;
  onToggleFolder: (folderId: number) => void;
  onRefresh: () => void;
  onMobileClose: () => void;
  handleArchiveChat: any;
  handlePinChat: any;
  handleRenameChat: any;
  handleMoveChat: any;
  handleShareChat: any;
  handleOpenCreateFolderForMove: any;
  localFolders: FolderItem[];
  pendingMoveForChat: number | null;
  pendingMoveNewFolderId: number | null;
  setPendingMoveForChat: any;
  setPendingMoveNewFolderId: any;
  setRenameFolderTarget: any;
  setDeleteFolderTarget: any;
  setDeleteTarget: any;
  searchQuery: string;
  globalChats: Chat[];
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
      // Folder rows should not refetch on every chat send.
      if (!ce.detail?.refreshFolders) return;
      if (!searchQuery && isExpanded) fetchFolderChats(1);
    };
    window.addEventListener("refresh-chats", handleRefresh as EventListener);
    return () => window.removeEventListener("refresh-chats", handleRefresh as EventListener);
  }, [searchQuery, isExpanded, fetchFolderChats]);

  // When searching, use chats from parent
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
        {/* Make the whole row clickable (padding is on this container). */}
        <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <Folder className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground">
          <ChevronRight
            className={`h-3 w-3 transition-transform ${isExpanded || searchQuery ? "rotate-90" : ""}`}
          />
        </div>
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center"
        >
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

const AssistantsSection = memo(function AssistantsSection({
  assistants,
  assistantsExpanded,
  setAssistantsExpanded,
  assistantsHasMore,
  onLoadMoreAssistants,
  onAssistantSelected,
}: {
  assistants: Assistant[];
  assistantsExpanded: boolean;
  setAssistantsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  assistantsHasMore?: boolean;
  onLoadMoreAssistants?: () => void;
  onAssistantSelected: (assistant: Assistant) => void;
}) {
  if (assistants.length === 0) return null;

  return (
    <>
      <div className={`${SIDEBAR_SECTION_HEADER_ROW}`}>
        <button
          type="button"
          className="min-w-0 flex-1 py-2.5 px-3 text-left"
          onClick={() => setAssistantsExpanded((p) => !p)}
        >
          <span className={`block w-full text-left ${SIDEBAR_SECTION_TITLE}`}>Assistants</span>
        </button>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/80"
          onClick={() => setAssistantsExpanded((p) => !p)}
          aria-expanded={assistantsExpanded}
          aria-label={assistantsExpanded ? "Collapse assistants" : "Expand assistants"}
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${assistantsExpanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>
      {assistantsExpanded && assistants.map((assistant) => {
        const IconComponent = (LucideIcons as any)[assistant.icon] as React.ElementType || Bot;

        return (
          <button
            key={assistant.id}
            onClick={() => onAssistantSelected(assistant)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer hover:bg-sidebar-accent text-foreground"
            title={assistant.description || assistant.name}
          >
            <IconComponent className="w-4 h-4 flex-shrink-0 text-primary" />
            <span className="truncate flex-1 text-left">{assistant.name}</span>
          </button>
        );
      })}
      {assistantsExpanded && assistantsHasMore && (
        <Button
          variant="ghost"
          className="w-full mt-1 text-xs text-muted-foreground hover:text-foreground h-8 cursor-pointer"
          onClick={onLoadMoreAssistants}
        >
          Load More Assistants
        </Button>
      )}
    </>
  );
}, (prev, next) => {
  if (prev.assistantsExpanded !== next.assistantsExpanded) return false;
  if (Boolean(prev.assistantsHasMore) !== Boolean(next.assistantsHasMore)) return false;
  if (prev.onLoadMoreAssistants !== next.onLoadMoreAssistants) return false;
  if (prev.onAssistantSelected !== next.onAssistantSelected) return false;
  if (prev.assistants.length !== next.assistants.length) return false;

  for (let i = 0; i < prev.assistants.length; i += 1) {
    const a = prev.assistants[i];
    const b = next.assistants[i];
    if (
      a.id !== b.id ||
      a.name !== b.name ||
      a.icon !== b.icon ||
      a.description !== b.description ||
      a.isActive !== b.isActive
    ) {
      return false;
    }
  }
  return true;
});

const ProjectsSection = memo(function ProjectsSection({
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
}: any) {
  return (
    <>
      <div className={`${SIDEBAR_SECTION_HEADER_ROW}`}>
        <button
          type="button"
          className="min-w-0 flex-1 py-2.5 px-3 text-left"
          onClick={() => setProjectsExpanded((p: boolean) => !p)}
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
          onClick={() => setProjectsExpanded((p: boolean) => !p)}
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
        safeFolders.map((folder: FolderItem) => (
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
  for (const id of prev.expandedFolders as Set<number>) {
    if (!(next.expandedFolders as Set<number>).has(id)) {
      return false;
    }
  }
  return true;
});

const ContextsSection = memo(function ContextsSection({
  contextsExpanded,
  setContextsExpanded,
  savingContexts,
  openCreateContextModal,
  loadingContexts,
  allContexts,
  selectedContextIds,
  handleToggleContext,
  openViewContextModal,
  openEditContextModal,
  setContextDeleteTarget,
}: any) {
  return (
    <>
      <div className={`${SIDEBAR_SECTION_HEADER_ROW}`}>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 py-2.5 px-3 text-left"
          onClick={() => setContextsExpanded((p: boolean) => !p)}
        >
          <span className={`min-w-0 flex-1 text-left ${SIDEBAR_SECTION_TITLE}`}>Contexts</span>
          {savingContexts && (
            <span className="shrink-0 text-[10px] font-medium normal-case text-muted-foreground/80">
              saving...
            </span>
          )}
        </button>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              openCreateContextModal();
            }}
            title="Add context"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/80"
          onClick={() => setContextsExpanded((p: boolean) => !p)}
          aria-expanded={contextsExpanded}
          aria-label={contextsExpanded ? "Collapse contexts" : "Expand contexts"}
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${contextsExpanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      {contextsExpanded && (
        <>
          {loadingContexts ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Loading contexts...
            </div>
          ) : (
            <>
              {allContexts.length === 0 ? (
                <div className="px-3 py-1 text-xs text-muted-foreground/70">
                  No items
                </div>
              ) : (
                allContexts.map((ctx: any) => {
                  const isSelected = selectedContextIds.includes(ctx.id);
                  return (
                    <ContextSidebarItem
                      key={ctx.id}
                      ctx={ctx}
                      isSelected={isSelected}
                      onToggle={() => handleToggleContext(ctx.id)}
                      onView={() => openViewContextModal(ctx)}
                      onEdit={() => openEditContextModal(ctx)}
                      onDelete={() => {
                        if (ctx?.isAutoGenerated) return;
                        setContextDeleteTarget(ctx);
                      }}
                    />
                  );
                })
              )}
            </>
          )}
        </>
      )}
    </>
  );
});

function ContextsSectionContainer({
  contextsExpanded,
  setContextsExpanded,
  localFolders,
  activeChatIdRef,
  pendingNewChatFolderIdKey,
  pendingNewChatContextsKey,
}: {
  contextsExpanded: boolean;
  setContextsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  localFolders: FolderItem[];
  activeChatIdRef: React.MutableRefObject<number | null>;
  pendingNewChatFolderIdKey: string;
  pendingNewChatContextsKey: string;
}) {
  const [sidebarContexts, setSidebarContexts] = useState<{
    globalContexts: any[];
    folderContexts: any[];
    customContexts: any[];
  }>({ globalContexts: [], folderContexts: [], customContexts: [] });
  const [selectedContextIds, setSelectedContextIds] = useState<number[]>([]);
  const [loadingContexts, setLoadingContexts] = useState(false);
  const [savingContexts, setSavingContexts] = useState(false);
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [contextModalMode, setContextModalMode] = useState<"create" | "edit">("create");
  const [activeContext, setActiveContext] = useState<any | null>(null);
  const [contextDetailView, setContextDetailView] = useState<any | null>(null);
  const [savingContextModal, setSavingContextModal] = useState(false);
  const [contextDeleteTarget, setContextDeleteTarget] = useState<any | null>(null);
  const [deletingContext, setDeletingContext] = useState(false);
  const contextFetchInFlightRef = useRef(false);
  const lastContextFetchKeyRef = useRef<string>("");
  const lastSidebarFolderKeyRef = useRef<string | null>(null);
  const sidebarAvailablePayloadRef = useRef<{
    globalContexts: any[];
    folderContexts: any[];
    customContexts: any[];
  } | null>(null);
  const chatsRef = useRef<Chat[]>([]);

  const getFolderDisplayName = useCallback(
    (folderId: number) => localFolders.find((f) => f.id === folderId)?.name || "Unknown Folder",
    [localFolders],
  );

  const refreshSidebarContexts = useCallback(
    async (chatId?: number | null, folderIdHint?: number | null, force = false) => {
      let folderId = folderIdHint ?? null;
      if (chatId && folderId === null) {
        const activeChat =
          chatsRef.current.find((chat) => chat.id === chatId) ||
          (await chatService.getById(chatId)).data.data;
        folderId = activeChat?.folderId ?? null;
      }

      const folderKey = `${folderId ?? "none"}`;
      const requestKey = `${chatId ?? "new"}:${folderKey}`;
      const cached = sidebarAvailablePayloadRef.current;
      const canReuseAvailable =
        !force && lastSidebarFolderKeyRef.current === folderKey && cached != null;

      if (canReuseAvailable) {
        if (!force && lastContextFetchKeyRef.current === requestKey) return;
        try {
          if (chatId) {
            const selectedRes = await chatService.getContexts(chatId);
            setSelectedContextIds(selectedRes.data?.data?.contextIds || []);
          } else {
            const payload = cached;
            const defaultGlobalIds = folderId
              ? (payload.globalContexts || [])
                  .filter((ctx: any) => ctx.isAutoSelected)
                  .map((ctx: any) => ctx.id)
              : (payload.globalContexts || []).map((ctx: any) => ctx.id);
            const defaultFolderIds = folderId
              ? (payload.folderContexts || []).map((ctx: any) => ctx.id)
              : [];
            const defaultContextIds = [...defaultGlobalIds, ...defaultFolderIds];
            const stored = localStorage.getItem(pendingNewChatContextsKey);
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                setSelectedContextIds(
                  Array.isArray(parsed)
                    ? parsed.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
                    : defaultContextIds,
                );
              } catch {
                setSelectedContextIds(defaultContextIds);
              }
            } else {
              setSelectedContextIds(defaultContextIds);
            }
          }
          lastContextFetchKeyRef.current = requestKey;
        } catch {
          setSelectedContextIds([]);
        }
        return;
      }

      if (!force && (contextFetchInFlightRef.current || lastContextFetchKeyRef.current === requestKey)) {
        return;
      }

      contextFetchInFlightRef.current = true;
      lastContextFetchKeyRef.current = requestKey;
      setLoadingContexts(true);
      try {
        const availableRes = await contextService.getSidebar(
          folderId ? { folderId: String(folderId) } : undefined,
        );
        const payload = availableRes.data?.data || {
          globalContexts: [],
          folderContexts: [],
          customContexts: [],
        };
        lastSidebarFolderKeyRef.current = folderKey;
        sidebarAvailablePayloadRef.current = payload;
        setSidebarContexts(payload);

        if (chatId) {
          const selectedRes = await chatService.getContexts(chatId);
          setSelectedContextIds(selectedRes.data?.data?.contextIds || []);
        } else {
          const defaultGlobalIds = folderId
            ? (payload.globalContexts || [])
                .filter((ctx: any) => ctx.isAutoSelected)
                .map((ctx: any) => ctx.id)
            : (payload.globalContexts || []).map((ctx: any) => ctx.id);
          const defaultFolderIds = folderId
            ? (payload.folderContexts || []).map((ctx: any) => ctx.id)
            : [];
          const defaultContextIds = [...defaultGlobalIds, ...defaultFolderIds];
          const stored = localStorage.getItem(pendingNewChatContextsKey);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setSelectedContextIds(
                Array.isArray(parsed)
                  ? parsed.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
                  : defaultContextIds,
              );
            } catch {
              setSelectedContextIds(defaultContextIds);
            }
          } else {
            setSelectedContextIds(defaultContextIds);
          }
        }
      } catch {
        lastSidebarFolderKeyRef.current = null;
        sidebarAvailablePayloadRef.current = null;
        setSidebarContexts({ globalContexts: [], folderContexts: [], customContexts: [] });
        setSelectedContextIds([]);
      } finally {
        contextFetchInFlightRef.current = false;
        setLoadingContexts(false);
      }
    },
    [pendingNewChatContextsKey],
  );

  const getNewChatFolderIdHint = useCallback(() => {
    try {
      const raw = localStorage.getItem(pendingNewChatFolderIdKey);
      const parsed = raw ? Number(raw) : NaN;
      if (!Number.isNaN(parsed)) return parsed;
    } catch {
      // ignore localStorage issues
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("folderId");
      if (!raw) return null;
      const parsed = Number(raw);
      return Number.isNaN(parsed) ? null : parsed;
    } catch {
      return null;
    }
  }, [pendingNewChatFolderIdKey]);

  useEffect(() => {
    const initialChatId = activeChatIdRef.current;
    const folderIdHint = initialChatId ? undefined : getNewChatFolderIdHint();
    refreshSidebarContexts(initialChatId, folderIdHint);
  }, [activeChatIdRef, getNewChatFolderIdHint, refreshSidebarContexts]);

  useEffect(() => {
    const handler = (evt: Event) => {
      if (activeChatIdRef.current) return;
      const customEvt = evt as CustomEvent<{ folderId?: number | null }>;
      const folderIdFromEvent =
        customEvt.detail && "folderId" in customEvt.detail
          ? customEvt.detail.folderId ?? null
          : undefined;
      const folderIdHint =
        folderIdFromEvent !== undefined ? folderIdFromEvent : getNewChatFolderIdHint();
      void refreshSidebarContexts(null, folderIdHint, true);
    };
    window.addEventListener("pending-new-chat-folder-updated", handler as EventListener);
    return () =>
      window.removeEventListener("pending-new-chat-folder-updated", handler as EventListener);
  }, [activeChatIdRef, getNewChatFolderIdHint, refreshSidebarContexts]);

  const handleToggleContext = useCallback(
    async (contextId: number) => {
      if (savingContexts) return;
      const next = selectedContextIds.includes(contextId)
        ? selectedContextIds.filter((id) => id !== contextId)
        : [...selectedContextIds, contextId];

      setSelectedContextIds(next);
      if (!activeChatIdRef.current) {
        localStorage.setItem(pendingNewChatContextsKey, JSON.stringify(next));
        return;
      }
      setSavingContexts(true);
      try {
        await chatService.replaceContexts(activeChatIdRef.current, next);
      } catch {
        toast.error("Failed to update chat contexts");
        await refreshSidebarContexts(activeChatIdRef.current);
      } finally {
        setSavingContexts(false);
      }
    },
    [activeChatIdRef, pendingNewChatContextsKey, refreshSidebarContexts, savingContexts, selectedContextIds],
  );

  const allContexts = useMemo(() => {
    const seen = new Set<number>();
    const merged = [
      ...sidebarContexts.globalContexts,
      ...sidebarContexts.folderContexts,
      ...sidebarContexts.customContexts,
    ].filter((ctx: any) => {
      if (!ctx?.id || seen.has(ctx.id)) return false;
      seen.add(ctx.id);
      return true;
    });
    return merged.sort((a: any, b: any) => {
      const aSelected = selectedContextIds.includes(a.id) ? 1 : 0;
      const bSelected = selectedContextIds.includes(b.id) ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }, [sidebarContexts, selectedContextIds]);

  const openCreateContextModal = useCallback(() => {
    setActiveContext(null);
    setContextModalMode("create");
    setContextModalOpen(true);
  }, []);
  const openViewContextModal = useCallback((context: any) => setContextDetailView(context), []);
  const openEditContextModal = useCallback((context: any) => {
    setActiveContext(context);
    setContextModalMode("edit");
    setContextModalOpen(true);
  }, []);

  const handleSaveContext = async (data: any) => {
    setSavingContextModal(true);
    try {
      if (contextModalMode === "edit" && activeContext?.id) {
        await contextService.update(activeContext.id, {
          ...data,
          isAutoSelected: data.type === "GLOBAL" ? data.isAutoSelected : false,
        });
        toast.success("Context updated");
      } else {
        const created = await contextService.create({
          ...data,
          isAutoSelected: data.type === "GLOBAL" ? data.isAutoSelected : false,
        });
        const createdContextId = created.data?.data?.id;
        if (activeChatIdRef.current && createdContextId) {
          const nextIds = Array.from(new Set([...selectedContextIds, createdContextId]));
          setSelectedContextIds(nextIds);
          await chatService.replaceContexts(activeChatIdRef.current, nextIds);
        }
        toast.success("Context created");
      }
      setContextModalOpen(false);
      await refreshSidebarContexts(activeChatIdRef.current, undefined, true);
    } catch {
      toast.error("Failed to save context");
    } finally {
      setSavingContextModal(false);
    }
  };

  const handleDeleteContext = async () => {
    if (!contextDeleteTarget?.id || contextDeleteTarget.isAutoGenerated) {
      if (contextDeleteTarget?.isAutoGenerated) {
        toast.error("This is system generated context, cannot be deleted");
        setContextDeleteTarget(null);
      }
      return;
    }
    setDeletingContext(true);
    try {
      await contextService.delete(contextDeleteTarget.id);
      toast.success("Context deleted");
      setContextDeleteTarget(null);
      await refreshSidebarContexts(activeChatIdRef.current, undefined, true);
    } catch {
      toast.error("Failed to delete context");
    } finally {
      setDeletingContext(false);
    }
  };

  return (
    <>
      <ContextsSection
        contextsExpanded={contextsExpanded}
        setContextsExpanded={setContextsExpanded}
        savingContexts={savingContexts}
        openCreateContextModal={openCreateContextModal}
        loadingContexts={loadingContexts}
        allContexts={allContexts}
        selectedContextIds={selectedContextIds}
        handleToggleContext={handleToggleContext}
        openViewContextModal={openViewContextModal}
        openEditContextModal={openEditContextModal}
        setContextDeleteTarget={setContextDeleteTarget}
      />

      <ContextModal
        isOpen={contextModalOpen}
        onClose={() => setContextModalOpen(false)}
        onSave={handleSaveContext}
        initialData={activeContext}
        folders={localFolders}
        isSaving={savingContextModal}
        mode={contextModalMode}
      />

      <ContextViewDialog
        open={!!contextDetailView}
        onOpenChange={(open) => !open && setContextDetailView(null)}
        context={contextDetailView}
        getFolderName={getFolderDisplayName}
      />

      <ConfirmDialog
        open={!!contextDeleteTarget}
        onOpenChange={(open) => {
          if (!open && !deletingContext) setContextDeleteTarget(null);
        }}
        title="Delete Context"
        description={`Are you sure you want to delete "${contextDeleteTarget?.title || "this context"}"? This action cannot be undone.`}
        onConfirm={handleDeleteContext}
        loading={deletingContext}
      />
    </>
  );
}

const ChatsSection = memo(function ChatsSection({
  chatsExpanded,
  setChatsExpanded,
  onMobileClose,
  router,
  unfoldered,
  localFolders,
  setDeleteTarget,
  handleArchiveChat,
  handlePinChat,
  handleRenameChat,
  handleMoveChat,
  handleShareChat,
  handleOpenCreateFolderForMove,
  pendingMoveForChat,
  pendingMoveNewFolderId,
  setPendingMoveForChat,
  setPendingMoveNewFolderId,
  hasMore,
  onLoadMore,
}: any) {
  const isStarredRoute = useIsStarredRoute();
  return (
    <>
      <div className={`${SIDEBAR_SECTION_HEADER_ROW}`}>
        <button
          type="button"
          className="min-w-0 flex-1 py-2.5 px-3 text-left"
          onClick={() => setChatsExpanded((p: boolean) => !p)}
        >
          <span className={`block w-full text-left ${SIDEBAR_SECTION_TITLE}`}>Chats</span>
        </button>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/80"
          onClick={() => setChatsExpanded((p: boolean) => !p)}
          aria-expanded={chatsExpanded}
          aria-label={chatsExpanded ? "Collapse chats" : "Expand chats"}
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${chatsExpanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>
      {chatsExpanded && (
        <>
          <button
            onClick={() => { onMobileClose(); router.push("/starred"); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
              isStarredRoute
                ? "bg-gradient-to-r from-yellow-500/20 to-yellow-500/10 text-foreground font-medium"
                : "text-foreground hover:bg-sidebar-accent"
            }`}
          >
            <Star className={`w-4 h-4 ${isStarredRoute ? "fill-current text-yellow-500" : "text-muted-foreground"}`} />
            <span>Starred Messages</span>
          </button>
          {unfoldered.map((chat: Chat) => (
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
            />
          ))}

          {hasMore && (
            <Button
              variant="ghost"
              className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground h-8 cursor-pointer"
              onClick={onLoadMore}
            >
              Load More Chats
            </Button>
          )}
        </>
      )}
    </>
  );
}, (prev, next) => {
  if (prev.chatsExpanded !== next.chatsExpanded) return false;
  if (Boolean(prev.hasMore) !== Boolean(next.hasMore)) return false;
  if (prev.pendingMoveForChat !== next.pendingMoveForChat) return false;
  if (prev.pendingMoveNewFolderId !== next.pendingMoveNewFolderId) return false;
  if (prev.unfoldered.length !== next.unfoldered.length) return false;
  if (prev.localFolders.length !== next.localFolders.length) return false;

  for (let i = 0; i < prev.unfoldered.length; i += 1) {
    const a = prev.unfoldered[i];
    const b = next.unfoldered[i];
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
  return true;
});

function SidebarInner({
  chats,
  folders = [],
  assistants,
  searchQuery,
  onSearchChange,
  assistantsHasMore,
  onLoadMoreAssistants,
  onRefresh,
  onMobileClose,
  onLogout,
  hasMore,
  onLoadMore,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const router = useRouter();
  const activeChatIdForRender = getRouteUiSnapshot().activeChatId;
  const activeChatIdRef = useRef<number | null>(getRouteUiSnapshot().activeChatId);
  const routeUiRef = useRef(getRouteUiSnapshot());

  useEffect(() => {
    const unsub = subscribeRouteUi(() => {
      const snapshot = getRouteUiSnapshot();
      routeUiRef.current = snapshot;
      activeChatIdRef.current = snapshot.activeChatId;
    });
    // sync once
    routeUiRef.current = getRouteUiSnapshot();
    activeChatIdRef.current = routeUiRef.current.activeChatId;
    return unsub;
  }, []);
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
  const [search, setSearch] = useState(searchQuery);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  const getDraftFolderScope = () => {
    const arr = Array.from(expandedFolders);
    if (arr.length === 1) return arr[0];
    return null;
  };
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [contextsExpanded, setContextsExpanded] = useState(false);
  const [assistantsExpanded, setAssistantsExpanded] = useState(true);
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Persist ONLY top-level accordions (Assistants/Chats/Projects/Contexts).
  // Do NOT persist nested accordions (like Projects -> folder -> chats).
  const TOP_ACCORDION_STORAGE_KEY = "sidebarTopAccordionState_v1";
  const [hasHydratedTopAccordion, setHasHydratedTopAccordion] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TOP_ACCORDION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        projectsExpanded: boolean;
        contextsExpanded: boolean;
        assistantsExpanded: boolean;
        chatsExpanded: boolean;
      }>;

      if (typeof parsed.projectsExpanded === "boolean") setProjectsExpanded(parsed.projectsExpanded);
      if (typeof parsed.contextsExpanded === "boolean") setContextsExpanded(parsed.contextsExpanded);
      if (typeof parsed.assistantsExpanded === "boolean") setAssistantsExpanded(parsed.assistantsExpanded);
      if (typeof parsed.chatsExpanded === "boolean") setChatsExpanded(parsed.chatsExpanded);
    } catch {
      // ignore invalid localStorage payload
    } finally {
      setHasHydratedTopAccordion(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasHydratedTopAccordion) return;
    try {
      localStorage.setItem(
        TOP_ACCORDION_STORAGE_KEY,
        JSON.stringify({
          projectsExpanded,
          contextsExpanded,
          assistantsExpanded,
          chatsExpanded,
        }),
      );
    } catch {
      // ignore quota / private browsing errors
    }
  }, [hasHydratedTopAccordion, projectsExpanded, contextsExpanded, assistantsExpanded, chatsExpanded]);

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderTarget, setRenameFolderTarget] = useState<{ id: number; name: string } | null>(null);

  // Folder deletion – needs choice of what to do with contained chats
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<number | null>(null);

  // Folder created from move dialog – holds the new folder id to pre-select
  const [pendingMoveForChat, setPendingMoveForChat] = useState<number | null>(null);
  const [pendingMoveNewFolderId, setPendingMoveNewFolderId] = useState<number | null>(null);
  const sidebarRenderCountRef = useRef(0);
  const chatFolderByIdRef = useRef<Map<number, number | null>>(new Map());
  const pendingNewChatContextsKey = "pending_new_chat_context_ids";
  const pendingNewChatFolderIdKey = "pending_new_chat_folder_id";

  // ─── Local folder list maintained after creation from move dialog ──────────
  const safeFolders = useMemo(() => (Array.isArray(folders) ? folders : []), [folders]);
  const [localFolders, setLocalFolders] = useState<FolderItem[]>(safeFolders);
  // Keep localFolders in sync when parent refreshes (but not during an active move flow)
  useEffect(() => {
    if (!pendingMoveForChat) {
      setLocalFolders(safeFolders);
    }
  }, [safeFolders, pendingMoveForChat]);

  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const next = new Map<number, number | null>();
    for (const c of chats) {
      next.set(c.id, c.folderId ?? null);
    }
    chatFolderByIdRef.current = next;
  }, [chats]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    sidebarRenderCountRef.current += 1;
    const snap = getRouteUiSnapshot();
    console.debug("[SidebarInner render]", {
      count: sidebarRenderCountRef.current,
      activeChatId: snap.activeChatId,
      isDraftRoute: snap.isDraftRoute,
      isStarredRoute: snap.isStarredRoute,
      chats: chats.length,
      folders: localFolders.length,
      assistants: assistants.length,
    });
  });

  const handleCreateFolder = async (
    opts?: { forChatId?: number }
  ) => {
    if (!newFolderName.trim()) return;
    try {
      const res = await folderService.create({ name: newFolderName.trim() });
      const created: FolderItem = { id: res.data.data.id, name: newFolderName.trim() };
      toast.success("Folder created");
      setNewFolderName("");
      setCreateFolderOpen(false);

      if (opts?.forChatId !== undefined) {
        // Came from move dialog — update local folder list and pre-select
        setLocalFolders(prev => [created, ...prev]);
        setPendingMoveNewFolderId(created.id);
        setPendingMoveForChat(opts.forChatId);
      }
      onRefresh();
    } catch {
      toast.error("Failed to create folder");
    }
  };

  const handleNewChat = (folderId?: number | null) => {
    const nextFolderId = folderId && folderId > 0 ? folderId : null;

    onMobileClose();
    localStorage.removeItem("selectedAssistantId");
    localStorage.removeItem(pendingNewChatContextsKey);
    localStorage.removeItem(pendingNewChatFolderIdKey);
    if (nextFolderId) {
      localStorage.setItem(pendingNewChatFolderIdKey, String(nextFolderId));
    }
    window.dispatchEvent(new Event("assistant-selected"));

    // Home (`/`) is the new-chat draft route; `/new` is an alias.
    // We intentionally do NOT include `folderId` in the URL (only localStorage),
    // so the UI/UX stays clean.
    window.dispatchEvent(
      new CustomEvent("pending-new-chat-folder-updated", {
        detail: { folderId: nextFolderId },
      }),
    );
    if (routeUiRef.current.isDraftRoute) {
      return;
    }
    router.push("/");
  };

  const handleDeleteChat = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await chatService.delete(deleteTarget);
      toast.success("Chat deleted");
      onRefresh();
      if (activeChatIdRef.current === deleteTarget) {
        router.push("/");
      }
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete chat");
    } finally {
      setDeleting(false);
    }
  };

  const handleArchiveChat = async (e: React.MouseEvent, chatId: number) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await chatService.archive(chatId);
      onRefresh();
      if (activeChatIdRef.current === chatId) {
        router.push("/");
      }
    } catch { /* ignore */ }
  };

  const handlePinChat = async (chatId: number) => {
    try {
      await chatService.pin(chatId);
      onRefresh();
    } catch {
      toast.error("Failed to update pin");
    }
  };

  const handleRenameChat = async (chatId: number, newTitle: string) => {
    try {
      await chatService.update(chatId, { title: newTitle });
      toast.success("Chat renamed");
      onRefresh();
    } catch {
      toast.error("Failed to rename chat");
    }
  };

  const handleRenameFolder = async (folderId: number, newName: string) => {
    try {
      await folderService.update(folderId, { name: newName });
      toast.success("Folder renamed");
      onRefresh();
      setRenameFolderTarget(null);
    } catch {
      toast.error("Failed to rename folder");
    }
  };

  const handleDeleteFolder = async (deleteChats: boolean) => {
    if (!deleteFolderTarget) return;
    setDeleting(true);
    try {
      await folderService.delete(deleteFolderTarget, deleteChats);
      toast.success(deleteChats ? "Folder and chats deleted" : "Folder deleted, chats moved out");
      onRefresh();
      setDeleteFolderTarget(null);
    } catch {
      toast.error("Failed to delete folder");
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveChat = async (chatId: number, folderId: number | null) => {
    try {
      await chatService.update(chatId, { folderId });
      toast.success("Chat moved");
      onRefresh();
    } catch {
      toast.error("Failed to move chat");
    }
  };

  const handleShareChat = async (chatId: number) => {
    try {
      const res = await chatService.share(chatId);
      const shareUrl = `${window.location.origin}/share/${res.data.data.shareId}`;
      const chatTitle = chats.find((chat) => chat.id === chatId)?.title || "AI Colab Chat";

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: chatTitle,
            text: "Check out this chat on AI Colab",
            url: shareUrl,
          });
          toast.success("Chat shared successfully!");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        }
      }

      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    } catch {
      toast.error("Failed to share chat");
    }
  };

  const syncDraftFolderScope = (nextFolderId: number | null) => {
    // Draft route is `/` (Home) and `/new` (alias). When the user opens/closes a
    // folder while drafting, we want the pending chat to use that folder's
    // default contexts and create under that folder only if they still have
    // the folder open when they send.
    try {
      if (nextFolderId && nextFolderId > 0) {
        localStorage.setItem(pendingNewChatFolderIdKey, String(nextFolderId));
      } else {
        localStorage.removeItem(pendingNewChatFolderIdKey);
      }
    } catch {
      // localStorage can fail in some environments; accordion must still work.
    }

    // When the folder scope changes, we clear any manual context selection so
    // the UI + backend default contexts match the new scope.
    try {
      localStorage.removeItem(pendingNewChatContextsKey);
    } catch {
      // ignore
    }

    window.dispatchEvent(
      new CustomEvent("pending-new-chat-folder-updated", {
        detail: { folderId: nextFolderId },
      }),
    );
  };

  const toggleFolder = (folderId: number) => {
    const isCurrentlyExpanded = expandedFolders.has(folderId);

    // Must run before syncDraftFolderScope: its event listener also sets
    // expandedFolders; if that runs first in the same batch, this update would
    // see prev.has(folderId) and collapse on `/` or `/new`.
    setExpandedFolders((prev) => {
      const next = new Set<number>();
      if (prev.has(folderId)) return next; // collapse
      next.add(folderId); // open (single-folder scope)
      return next;
    });

    if (routeUiRef.current.isDraftRoute) {
      syncDraftFolderScope(isCurrentlyExpanded ? null : folderId);
    }
  };

  // If Projects accordion is collapsed while drafting, clear any pending
  // folder scoping so new chat is created outside the folder.
  useEffect(() => {
    if (projectsExpanded) return;
    setExpandedFolders(new Set());
    if (routeUiRef.current.isDraftRoute) {
      syncDraftFolderScope(null);
    }
  }, [projectsExpanded]);

  // Opens create-folder dialog and remembers which chat we're doing a "move" for
  const handleOpenCreateFolderForMove = (chatId: number) => {
    setPendingMoveForChat(chatId);
    setPendingMoveNewFolderId(null);
    setCreateFolderOpen(true);
  };

  const handleAssistantSelected = useCallback((assistant: Assistant) => {
    onMobileClose();
    localStorage.setItem("selectedAssistantId", String(assistant.id));
    window.dispatchEvent(
      new CustomEvent("assistant-selected", {
        detail: { assistant },
      }),
    );
    routerRef.current.push("/");
  }, [onMobileClose]);

  const filteredChats = useMemo(() => chats.filter((c: Chat) => !c.isArchived), [chats]);

  // If the active chat is inside a project folder, ensure that folder is
  // expanded in the sidebar.
  // Pinned chats float to the top of their respective group
  const unfoldered = useMemo(() => {
    const sortByPin = (a: Chat, b: Chat) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
    return filteredChats.filter((c: Chat) => !c.folderId).slice().sort(sortByPin);
  }, [filteredChats]);

  // ─── Collapsed icon-only icons for chat variant ───
  const collapsedIcons = (
    <>
      {/* New Chat */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg cursor-pointer"
            onClick={() => handleNewChat(getDraftFolderScope())}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">New Chat</TooltipContent>
      </Tooltip>

      {/* Search */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg cursor-pointer"
            onClick={() => { if (onToggleCollapse) onToggleCollapse(); }}
          >
            <Search className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Search chats</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-lg cursor-pointer ${
              routeUiRef.current.isStarredRoute
                ? "text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/15"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            }`}
            onClick={() => { onMobileClose(); router.push("/starred"); }}
          >
            <Star className={`w-4 h-4 ${routeUiRef.current.isStarredRoute ? "fill-current" : ""}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Starred Messages</TooltipContent>
      </Tooltip>
    </>
  );

  return (
    <AppSidebar
      variant="chat"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onMobileClose={onMobileClose}
      onLogout={onLogout}
      collapsedIcons={collapsedIcons}
    >
      {/* New Chat & Folders */}
      <div className="p-3 pb-2 space-y-2">
        <Button
          onClick={() => handleNewChat(getDraftFolderScope())}
          variant="outline"
          className="w-full justify-start gap-2 h-10 border-border/50 hover:bg-sidebar-accent transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              onSearchChange(value);
            }}
            className="h-9 border-none bg-sidebar-accent/50 pl-9 text-sm"
          />
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* Chat List */}
      <ScrollArea className="flex-1 px-2 min-h-0">
        <div className="py-2 space-y-0.5">


          <ProjectsSection
            projectsExpanded={projectsExpanded}
            setProjectsExpanded={setProjectsExpanded}
            safeFolders={safeFolders}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            search={search}
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
            filteredChats={filteredChats}
            setCreateFolderOpen={setCreateFolderOpen}
          />

          

          <ContextsSectionContainer
            contextsExpanded={contextsExpanded}
            setContextsExpanded={setContextsExpanded}
            localFolders={localFolders}
            activeChatIdRef={activeChatIdRef}
            pendingNewChatFolderIdKey={pendingNewChatFolderIdKey}
            pendingNewChatContextsKey={pendingNewChatContextsKey}
          />

          <AssistantsSection
            assistants={assistants}
            assistantsExpanded={assistantsExpanded}
            setAssistantsExpanded={setAssistantsExpanded}
            assistantsHasMore={assistantsHasMore}
            onLoadMoreAssistants={onLoadMoreAssistants}
            onAssistantSelected={handleAssistantSelected}
          />

          <ChatsSection
            chatsExpanded={chatsExpanded}
            setChatsExpanded={setChatsExpanded}
            onMobileClose={onMobileClose}
            router={router}
            unfoldered={unfoldered}
            localFolders={localFolders}
             setDeleteTarget={setDeleteTarget}
            handleArchiveChat={handleArchiveChat}
            handlePinChat={handlePinChat}
            handleRenameChat={handleRenameChat}
            handleMoveChat={handleMoveChat}
            handleShareChat={handleShareChat}
            handleOpenCreateFolderForMove={handleOpenCreateFolderForMove}
            pendingMoveForChat={pendingMoveForChat}
            pendingMoveNewFolderId={pendingMoveNewFolderId}
            setPendingMoveForChat={setPendingMoveForChat}
            setPendingMoveNewFolderId={setPendingMoveNewFolderId}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
          />
        </div>
      </ScrollArea>

      {/* Delete chat confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Chat"
        description="This will permanently delete this chat and all its messages. This action cannot be undone."
        onConfirm={handleDeleteChat}
        loading={deleting}
      />

      {/* ── Create Folder Modal ────────────────────────────────────────── */}
      <Dialog open={createFolderOpen} onOpenChange={(open) => { setCreateFolderOpen(open); if (!open && !pendingMoveNewFolderId) setPendingMoveForChat(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g. Marketing Campaign"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(pendingMoveForChat !== null ? { forChatId: pendingMoveForChat } : undefined); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateFolderOpen(false); setPendingMoveForChat(null); }}>Cancel</Button>
            <Button
              onClick={() => handleCreateFolder(pendingMoveForChat !== null ? { forChatId: pendingMoveForChat } : undefined)}
              disabled={!newFolderName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rename Folder Modal ───────────────────────────────────────── */}
      <Dialog open={!!renameFolderTarget} onOpenChange={(open) => !open && setRenameFolderTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameFolderTarget?.name || ""}
              onChange={(e) => setRenameFolderTarget(prev => prev ? { ...prev, name: e.target.value } : null)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && renameFolderTarget) handleRenameFolder(renameFolderTarget.id, renameFolderTarget.name); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolderTarget(null)}>Cancel</Button>
            <Button onClick={() => renameFolderTarget && handleRenameFolder(renameFolderTarget.id, renameFolderTarget.name)} disabled={!renameFolderTarget?.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Folder – Choice Dialog ────────────────────────────── */}
      <Dialog open={!!deleteFolderTarget} onOpenChange={(open) => !open && setDeleteFolderTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-muted-foreground">
            What would you like to do with the chats inside this project?
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteFolderTarget(null)} disabled={deleting} className="sm:mr-auto">
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDeleteFolder(false)}
              disabled={deleting}
              className="border-primary/40 text-primary hover:bg-primary/5"
            >
              {deleting ? "Moving..." : "Move chats out"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteFolder(true)}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete chats too"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppSidebar>
  );
}

export const Sidebar = memo(SidebarInner, (prev, next) => {
  const keys = Object.keys(next) as (keyof typeof next)[];
  let same = true;
  for (const key of keys) {
    if (prev[key] !== next[key]) {
      if (process.env.NODE_ENV === "development") {
        console.debug(`[Sidebar memo] prop "${key}" changed`, { prev: prev[key], next: next[key] });
      }
      same = false;
    }
  }
  return same;
});

// ─────────────────────────────────────────────────────────────────────────────
// ChatItem
// ─────────────────────────────────────────────────────────────────────────────

const ChatItem = memo(function ChatItem({
  chat,
  folders,
  isActive: isActiveProp,
  onDelete,
  onArchive,
  onPin,
  onNavigate,
  onRename,
  onMove,
  onShare,
  onCreateFolderForMove,
  pendingMoveNewFolderId,
  onPendingMoveConsumed,
  indent,
}: {
  chat: Chat;
  folders: FolderItem[];
  isActive: boolean;
  onDelete: (e: React.MouseEvent, id: number) => void;
  onArchive: (e: React.MouseEvent, id: number) => void;
  onPin: (id: number) => void;
  onNavigate: () => void;
  onRename: (chatId: number, title: string) => void;
  onMove: (chatId: number, folderId: number | null) => void;
  onShare: (chatId: number) => void;
  onCreateFolderForMove: (chatId: number) => void;
  pendingMoveNewFolderId: number | null;
  onPendingMoveConsumed: () => void;
  indent?: boolean;
}) {
  const isActiveFromRoute = useIsChatActive(chat.id);
  const isActive = isActiveProp || isActiveFromRoute;
  const [renameOpen, setRenameOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title || "");
  const [moveOpen, setMoveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>(chat.folderId?.toString() || "none");
  const chatItemRenderCountRef = useRef(0);

  // When Sidebar creates a folder specifically for this chat's move,
  // open the move dialog with the new folder pre-selected.
  useEffect(() => {
    if (pendingMoveNewFolderId !== null) {
      setSelectedFolder(pendingMoveNewFolderId.toString());
      setMoveOpen(true);
      onPendingMoveConsumed();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMoveNewFolderId]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    chatItemRenderCountRef.current += 1;
    console.debug("[ChatItem render]", {
      chatId: chat.id,
      count: chatItemRenderCountRef.current,
      isActive,
    });
  });

  const handleMoveClick = () => {
    if (folders.length === 0) {
      // No folders — open create folder dialog directly
      onCreateFolderForMove(chat.id);
    } else {
      setSelectedFolder(chat.folderId?.toString() || "none");
      setMoveOpen(true);
    }
  };

  return (
    <div className="group relative w-full">
      <Link
        href={`/c/${chat.id}`}
        onClick={() => {
          try {
            if (chat.folderId && chat.folderId > 0) {
              localStorage.setItem("sidebar_active_chat_hint_id", String(chat.id));
              localStorage.setItem("sidebar_active_chat_hint_folder_id", String(chat.folderId));
            } else {
              localStorage.removeItem("sidebar_active_chat_hint_id");
              localStorage.removeItem("sidebar_active_chat_hint_folder_id");
            }
          } catch {
            // ignore localStorage issues
          }
          onNavigate();
        }}
        className={`flex w-full min-w-0 items-center gap-2 py-2 pr-10 rounded-lg text-sm transition-colors cursor-pointer ${
          indent ? "pl-9" : "pl-3"
        } ${
          isActive
            ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-medium"
            : "hover:bg-sidebar-accent text-foreground"
        }`}
      >
        {/* Always use MessageSquare for chat history */}
        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
        <span className="truncate flex-1" title={chat.title || "New Chat"}>
          {(chat.title || "New Chat").length > 15
            ? (chat.title || "New Chat").substring(0, 15) + "..."
            : (chat.title || "New Chat")}
        </span>
      </Link>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
        {/* Pin button: always visible when pinned, grey, sits at far-right at rest.
            On hover the ⋯ wrapper expands (w-0→w-7) and pin slides left. */}
        {chat.isPinned && (
          <Button
            variant="ghost"
            className="h-7 w-7 p-0 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-sidebar-accent"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPin(chat.id); }}
            title="Unpin"
          >
            <Pin className="w-3 h-3" />
          </Button>
        )}
        {/* ⋯ wrapper – zero width at rest, expands on hover OR when menu is open */}
        <div className={chat.isPinned ? `overflow-hidden transition-[width] duration-150 ${menuOpen ? "w-7" : "w-7 md:w-0 md:group-hover:w-7"}` : ""}>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0 rounded text-muted-foreground transition-opacity hover:text-foreground hover:bg-sidebar-accent md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onShare(chat.id)} className="gap-2 cursor-pointer">
                <Share className="w-3.5 h-3.5" /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPin(chat.id)} className="gap-2 cursor-pointer">
                {chat.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                {chat.isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setNewTitle(chat.title || ""); setRenameOpen(true); }} className="gap-2 cursor-pointer">
                <Edit2 className="w-3.5 h-3.5" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMoveClick} className="gap-2 cursor-pointer">
                <CornerUpRight className="w-3.5 h-3.5" /> Move to project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); onArchive(e as any, chat.id); }} className="gap-2 cursor-pointer">
                <Archive className="w-3.5 h-3.5" /> Archive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); onDelete(e as any, chat.id); }} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Chat title" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={() => { onRename(chat.id, newTitle); setRenameOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to project dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Move to Project</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project</SelectItem>
                {folders.map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 border border-dashed border-border/50"
              onClick={() => { setMoveOpen(false); onCreateFolderForMove(chat.id); }}
            >
              <FolderPlus className="w-3.5 h-3.5" /> Create new folder
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>Cancel</Button>
            <Button onClick={() => { onMove(chat.id, selectedFolder === "none" ? null : parseInt(selectedFolder)); setMoveOpen(false); }}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}, (prev, next) => {
  if (prev.isActive !== next.isActive) return false;
  if (prev.pendingMoveNewFolderId !== next.pendingMoveNewFolderId) return false;
  if (prev.indent !== next.indent) return false;
  if (prev.chat.id !== next.chat.id) return false;
  if (prev.chat.title !== next.chat.title) return false;
  if (prev.chat.folderId !== next.chat.folderId) return false;
  if (prev.chat.isPinned !== next.chat.isPinned) return false;
  if (prev.chat.isArchived !== next.chat.isArchived) return false;
  if (prev.chat.updatedAt !== next.chat.updatedAt) return false;
  if (prev.folders.length !== next.folders.length) return false;
  for (let i = 0; i < prev.folders.length; i += 1) {
    if (
      prev.folders[i].id !== next.folders[i].id ||
      prev.folders[i].name !== next.folders[i].name
    ) {
      return false;
    }
  }
  return true;
});
