"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Button } from "@/components/ui/button";
import { Menu, Settings, LogOut, Sun, Moon } from "lucide-react";
import { chatService, folderService } from "@/lib/services";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/context/theme-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Chat {
  id: number;
  title: string | null;
  folderId: number | null;
  isArchived: boolean;
  isPinned: boolean;
  updatedAt: string;
}

interface Folder {
  id: number;
  name: string;
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [chats, setChats] = useState<Chat[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Hydrate sidebar collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved === "true") setSidebarCollapsed(true);
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  const isProfileRoute = pathname.startsWith("/profile");

  const fetchChats = useCallback(async (pageNum = 1) => {
    try {
      const res = await chatService.list({ page: pageNum.toString(), pageSize: "10" });
      const fetched = res.data.data?.data || [];

      setChats(prev => {
        if (pageNum === 1) return fetched;
        const exists = new Set(prev.map((c: any) => c.id));
        return [...prev, ...fetched.filter((c: any) => !exists.has(c.id))];
      });

      setPage(pageNum);
      setHasMore(fetched.length === 10);
    } catch { /* ignore */ }
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await folderService.list();
      setFolders(res.data.data?.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      fetchChats(1);
      fetchFolders();
    }
  }, [user, isLoading, router, fetchChats, fetchFolders]);

  useEffect(() => {
    const handleRefresh = () => fetchChats(1);
    window.addEventListener("refresh-chats", handleRefresh);
    return () => window.removeEventListener("refresh-chats", handleRefresh);
  }, [fetchChats]);

  if (isLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  // On profile routes, skip the chat sidebar entirely — profile has its own layout
  if (isProfileRoute) {
    return (
      <div className="h-dvh flex bg-background overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0 relative z-[1]">
          {children}
        </main>
      </div>
    );
  }

  const sidebarContent = (
    <Sidebar
      chats={chats}
      folders={folders}
      onRefresh={() => { fetchChats(1); fetchFolders(); }}
      onMobileClose={() => setMobileOpen(false)}
      onLogout={handleLogout}
      hasMore={hasMore}
      onLoadMore={() => { if (hasMore) fetchChats(page + 1); }}
      collapsed={sidebarCollapsed}
      onToggleCollapse={toggleSidebarCollapsed}
    />
  );

  return (
    <div className="h-dvh flex bg-gradient-to-br from-purple-100 via-[#EACFEF] to-pink-100 dark:from-purple-950/40 dark:via-background dark:to-pink-950/40 overflow-hidden text-foreground">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-shrink-0 border-r border-border/50 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-[64px]" : "w-[280px]"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile top navigation bar — rendered first so sidebar (same z) sits on top via DOM order */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 z-50 flex items-center px-3 bg-background/80 backdrop-blur-md border-b border-border/50 justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer -ml-2 text-foreground"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <span className="font-semibold text-sm">AI Colab</span>
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full cursor-pointer hover:opacity-80 flex items-center justify-center p-0 overflow-hidden">
                <Avatar className="w-8 h-8 border border-border/50">
                  {user?.profileImage && <AvatarImage src={user.profileImage} alt={`${user?.firstName} ${user?.lastName}`} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {user?.firstName?.[0]?.toUpperCase()}{user?.lastName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <div className="px-2 py-1.5 border-b border-border/50 mb-1 flex flex-col items-start min-w-0">
                <span className="truncate w-full text-left font-medium text-sm leading-tight">{user?.firstName} {user?.lastName}</span>
                {user?.email && <span className="truncate w-full text-left text-xs text-muted-foreground leading-tight mt-0.5">{user?.email}</span>}
              </div>
              <DropdownMenuItem onClick={toggleTheme} className="gap-2 cursor-pointer">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/profile")} className="gap-2 cursor-pointer">
                <Settings className="w-4 h-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="w-4 h-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile overlay — below sidebar and top bar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar — z-50, rendered after top bar in DOM so it sits on top naturally */}
      <aside className={`
        md:hidden fixed z-50 h-full w-[280px] flex-shrink-0 border-r border-border/40
        bg-background flex flex-col transition-all duration-300 ease-in-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 md:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}
