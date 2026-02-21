"use client";

import { useState } from "react";
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
  Plus,
  MessageSquare,
  Folder,
  FolderPlus,
  Search,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronRight,
  Archive,
  Trash2,
  MoreHorizontal,
  Edit2,
  CornerUpRight,
  Share,
  Settings,
} from "lucide-react";
import { chatService, folderService } from "@/lib/services";
import { toast } from "react-toastify";

interface Chat {
  id: number;
  title: string | null;
  folderId: number | null;
  isArchived: boolean;
  updatedAt: string;
}

interface FolderItem {
  id: number;
  name: string;
}

interface SidebarProps {
  chats: Chat[];
  folders: FolderItem[];
  onRefresh: () => void;
  onMobileClose: () => void;
  onLogout: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function Sidebar({ chats, folders, onRefresh, onMobileClose, onLogout, hasMore, onLoadMore }: SidebarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderTarget, setRenameFolderTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<number | null>(null);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await folderService.create({ name: newFolderName.trim() });
      toast.success("Folder created");
      setNewFolderName("");
      setCreateFolderOpen(false);
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
    } catch { /* ignore */ }
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

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    setDeleting(true);
    try {
      await folderService.delete(deleteFolderTarget);
      toast.success("Folder deleted");
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

  const filteredChats = chats.filter((c) =>
    !c.isArchived && (c.title?.toLowerCase().includes(search.toLowerCase()) || !search)
  );

  const unfoldered = filteredChats.filter((c) => !c.folderId);

  return (
    <div className="h-full flex flex-col bg-[#ffffff80] dark:bg-[#00000080] text-sidebar-foreground">
      {/* Logos */}
      <div className="px-5 pt-5 pb-2">
        <Image src="/black.webp" alt="AI Colab" width={100} height={28} className="dark:hidden opacity-90 h-auto" priority />
        <Image src="/white.webp" alt="AI Colab" width={100} height={28} className="hidden dark:block opacity-90 h-auto" priority />
      </div>

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
        <Button variant="ghost" size="icon" className="flex-shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer shrink-0" onClick={() => setCreateFolderOpen(true)} title="New Folder">
          <FolderPlus className="w-5 h-5" />
        </Button>
      </div>

      <Separator className="opacity-50" />

      {/* Chat List */}
      <ScrollArea className="flex-1 px-2 min-h-0">
        <div className="py-2 space-y-0.5">
          {/* Folders */}
          {folders.length > 0 && <div className="text-xs font-semibold text-muted-foreground px-3 py-2 mt-1 uppercase tracking-wider">Projects</div>}
          {folders.map((folder) => {
            const folderChats = filteredChats.filter((c) => c.folderId === folder.id);
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
                    folders={folders}
                    isActive={pathname === `/c/${chat.id}`}
                    onDelete={(e, id) => { e.stopPropagation(); e.preventDefault(); setDeleteTarget(id); }}
                    onArchive={handleArchiveChat}
                    onNavigate={onMobileClose}
                    onRename={handleRenameChat}
                    onMove={handleMoveChat}
                    onShare={handleShareChat}
                    indent
                  />
                ))}
              </div>
            );
          })}

          {/* Unfoldered chats */}
          {unfoldered.length > 0 && <div className="text-xs font-semibold text-muted-foreground px-3 py-2 mt-4 uppercase tracking-wider">Chats</div>}
          {unfoldered.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              folders={folders}
              isActive={pathname === `/c/${chat.id}`}
              onDelete={(e, id) => { e.stopPropagation(); e.preventDefault(); setDeleteTarget(id); }}
              onArchive={handleArchiveChat}
              onNavigate={onMobileClose}
              onRename={handleRenameChat}
              onMove={handleMoveChat}
              onShare={handleShareChat}
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

      <Separator className="opacity-50" />

      {/* Footer / User Profile */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2 px-2 text-sm cursor-pointer hover:bg-sidebar-accent overflow-hidden">
              <Avatar className="w-9 h-9 border border-border/50">
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
            <DropdownMenuItem onClick={() => { onMobileClose(); router.push("/profile"); }} className="gap-2 cursor-pointer">
              <Settings className="w-4 h-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="w-4 h-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Chat"
        description="This will permanently delete this chat and all its messages. This action cannot be undone."
        onConfirm={handleDeleteChat}
        loading={deleting}
      />

      {/* Create Folder Modal */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
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
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Rename Folder Modal */}
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
            <Button onClick={() => renameFolderTarget && handleRenameFolder(renameFolderTarget.id, renameFolderTarget.name)} disabled={!renameFolderTarget?.name.trim()}>Save Options</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirm */}
      <Dialog open={!!deleteFolderTarget} onOpenChange={(open) => !open && setDeleteFolderTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Are you sure you want to delete this project folder? The chats inside will not be deleted, they will simply be moved out of the folder.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFolderTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteFolder} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function ChatItem({
  chat,
  folders,
  isActive,
  onDelete,
  onArchive,
  onNavigate,
  onRename,
  onMove,
  onShare,
  indent,
}: {
  chat: Chat;
  folders: FolderItem[];
  isActive: boolean;
  onDelete: (e: React.MouseEvent, id: number) => void;
  onArchive: (e: React.MouseEvent, id: number) => void;
  onNavigate: () => void;
  onRename: (chatId: number, title: string) => void;
  onMove: (chatId: number, folderId: number | null) => void;
  onShare: (chatId: number) => void;
  indent?: boolean;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title || "");
  const [moveOpen, setMoveOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>(chat.folderId?.toString() || "none");

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-7 w-7 p-0 rounded text-muted-foreground transition-opacity hover:text-foreground hover:bg-sidebar-accent md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onShare(chat.id)} className="gap-2 cursor-pointer">
              <Share className="w-3.5 h-3.5" /> Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setNewTitle(chat.title || ""); setRenameOpen(true); }} className="gap-2 cursor-pointer">
              <Edit2 className="w-3.5 h-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSelectedFolder(chat.folderId?.toString() || "none"); setMoveOpen(true); }} className="gap-2 cursor-pointer">
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

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Move to Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
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
