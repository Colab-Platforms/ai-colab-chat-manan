"use client";

import { useState, ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
} from "lucide-react";
import { chatService, folderService } from "@/lib/services";
import { toast } from "react-toastify";

// ─────────────────────────────────────────────────────────────────────────────
// Shared Types
// ─────────────────────────────────────────────────────────────────────────────

interface Chat {
  id: number;
  title: string | null;
  folderId: number | null;
  isArchived: boolean;
  isPinned: boolean;
  updatedAt: string;
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
            <Image src="/black.webp" alt="AI Colab" width={28} height={28} className="dark:hidden opacity-90 h-auto" priority />
            <Image src="/white.webp" alt="AI Colab" width={28} height={28} className="hidden dark:block opacity-90 h-auto" priority />
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
                <DropdownMenuItem onClick={() => { handleClose(); router.push("/"); }} className="gap-2 cursor-pointer">
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
          <Image src="/black.webp" alt="AI Colab" width={100} height={28} className="dark:hidden opacity-90 h-auto" priority />
          <Image src="/white.webp" alt="AI Colab" width={100} height={28} className="hidden dark:block opacity-90 h-auto" priority />
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
              <DropdownMenuItem onClick={() => { handleClose(); router.push("/"); }} className="gap-2 cursor-pointer">
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
  onRefresh: () => void;
  onMobileClose: () => void;
  onLogout: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ chats, folders, onRefresh, onMobileClose, onLogout, hasMore, onLoadMore, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderTarget, setRenameFolderTarget] = useState<{ id: number; name: string } | null>(null);

  // Folder deletion – needs choice of what to do with contained chats
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<number | null>(null);

  // Folder created from move dialog – holds the new folder id to pre-select
  const [pendingMoveForChat, setPendingMoveForChat] = useState<number | null>(null);
  const [pendingMoveNewFolderId, setPendingMoveNewFolderId] = useState<number | null>(null);

  // ─── Local folder list maintained after creation from move dialog ──────────
  const [localFolders, setLocalFolders] = useState<FolderItem[]>(folders);
  // Keep localFolders in sync when parent refreshes (but not during an active move flow)
  useEffect(() => {
    if (!pendingMoveForChat) {
      setLocalFolders(folders);
    }
  }, [folders, pendingMoveForChat]);

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

  const handleNewChat = () => {
    onMobileClose();
    router.push("/");
  };

  const handleDeleteChat = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await chatService.delete(deleteTarget);
      toast.success("Chat deleted");
      onRefresh();
      if (pathname === `/c/${deleteTarget}`) {
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
      if (pathname === `/c/${chatId}`) {
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

  const toggleFolder = (folderId: number) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  // Opens create-folder dialog and remembers which chat we're doing a "move" for
  const handleOpenCreateFolderForMove = (chatId: number) => {
    setPendingMoveForChat(chatId);
    setPendingMoveNewFolderId(null);
    setCreateFolderOpen(true);
  };

  const filteredChats = chats.filter((c) =>
    !c.isArchived && (c.title?.toLowerCase().includes(search.toLowerCase()) || !search)
  );
  const isStarredRoute = pathname === "/starred";

  // Pinned chats float to the top of their respective group
  const sortByPin = (a: Chat, b: Chat) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
  const unfoldered = filteredChats.filter((c) => !c.folderId).sort(sortByPin);

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
            onClick={handleNewChat}
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
              isStarredRoute
                ? "text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/15"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            }`}
            onClick={() => { onMobileClose(); router.push("/starred"); }}
          >
            <Star className={`w-4 h-4 ${isStarredRoute ? "fill-current" : ""}`} />
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
          onClick={handleNewChat}
          variant="outline"
          className="w-full justify-start gap-2 h-10 border-border/50 hover:bg-sidebar-accent transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* Search and Folders Create row */}
      <div className="px-3 pb-2 flex gap-1">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-sidebar-accent/50 border-none text-sm"
          />
        </div>
        <Button variant="ghost" size="icon" className="flex-shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer shrink-0" onClick={() => { setPendingMoveForChat(null); setCreateFolderOpen(true); }} title="New Folder">
          <FolderPlus className="w-5 h-5" />
        </Button>
      </div>

      <Separator className="opacity-50" />

      {/* Chat List */}
      <ScrollArea className="flex-1 px-2 min-h-0">
        <div className="py-2 space-y-0.5">


          {folders.length > 0 && <div className="text-xs font-semibold text-muted-foreground px-3 py-2 mt-1 uppercase tracking-wider">Projects</div>}
          {folders.map((folder) => {
            const folderChats = filteredChats.filter((c) => c.folderId === folder.id).sort(sortByPin);
            const isExpanded = expandedFolders.has(folder.id);

            return (
              <div key={folder.id}>
                <div className="group relative w-full flex items-center">
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-sidebar-accent transition-colors text-muted-foreground cursor-pointer pr-10"
                  >
                    <Folder className="w-4 h-4" />
                    <span className="truncate flex-1 text-left">{folder.name}</span>
                    <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-7 w-7 p-0 rounded text-muted-foreground transition-opacity hover:text-foreground hover:bg-sidebar-accent md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenameFolderTarget({ id: folder.id, name: folder.name }); }}>
                          <Edit2 className="w-4 h-4 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setDeleteFolderTarget(folder.id); }}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {isExpanded && folderChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    folders={localFolders}
                    isActive={pathname === `/c/${chat.id}`}
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
              </div>
            );
          })}

          

          {/* Unfoldered chats */}
          {unfoldered.length > 0 && <div className="text-xs font-semibold text-muted-foreground px-3 py-2 mt-4 uppercase tracking-wider">Chats</div>}
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
          {unfoldered.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              folders={localFolders}
              isActive={pathname === `/c/${chat.id}`}
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
              Load More
            </Button>
          )}
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

// ─────────────────────────────────────────────────────────────────────────────
// ChatItem
// ─────────────────────────────────────────────────────────────────────────────

function ChatItem({
  chat,
  folders,
  isActive,
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
  const [renameOpen, setRenameOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title || "");
  const [moveOpen, setMoveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>(chat.folderId?.toString() || "none");

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
    <div className="group relative">
      <Link
        href={`/c/${chat.id}`}
        onClick={onNavigate}
        className={`flex items-center gap-2 px-3 py-2 pr-10 rounded-lg text-sm transition-colors min-w-0 cursor-pointer ${indent ? "ml-4" : ""} ${
          isActive
            ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-medium"
            : "hover:bg-sidebar-accent text-foreground"
        }`}
      >
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
}
