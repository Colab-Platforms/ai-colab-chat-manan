"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Button } from "@/components/ui/button";
import { Menu, Settings, LogOut, Sun, Moon } from "lucide-react";
import { chatService, folderService, assistantService } from "@/lib/services";
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
  assistantId?: number | null;
  assistant?: { id: number; name: string; icon: string } | null;
}

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
  const [chatSearch, setChatSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [assistantsPage, setAssistantsPage] = useState(1);
  const [assistantsHasMore, setAssistantsHasMore] = useState(false);
  const [activeAssistantId, setActiveAssistantId] = useState<number | null>(null);
  const [activeAssistantTheme, setActiveAssistantTheme] = useState<Assistant | null>(
    null,
  );

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

  const fetchChats = useCallback(async (pageNum = 1, searchTerm = chatSearch) => {
    try {
      const res = await chatService.list({
        page: pageNum.toString(),
        pageSize: "6",
        isArchived: "false",
        ...(searchTerm ? { search: searchTerm } : {}),
      });
      const result = res.data.data;
      const fetched = result?.data || [];

      setChats(prev => {
        if (pageNum === 1) return fetched;
        const exists = new Set(prev.map((c: any) => c.id));
        return [...prev, ...fetched.filter((c: any) => !exists.has(c.id))];
      });

      setPage(pageNum);
      setHasMore(Boolean(result?.hasNextPage));
    } catch { /* ignore */ }
  }, [chatSearch]);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await folderService.list();
      setFolders(res.data.data?.data || []);
    } catch { /* ignore */ }
  }, []);

  const fetchAssistants = useCallback(async (pageNum = 1) => {
    try {
      const res = await assistantService.list({
        isActive: "true",
        page: pageNum.toString(),
        pageSize: "4",
      });
      const result = res.data.data;
      const fetched = result?.data || [];

      setAssistants((prev) => (pageNum === 1 ? fetched : [...prev, ...fetched]));
      setAssistantsPage(pageNum);
      setAssistantsHasMore(Boolean(result?.hasNextPage));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      fetchChats(1, chatSearch);
      fetchFolders();
      fetchAssistants(1);
    }
  }, [user, isLoading, router, fetchChats, fetchFolders, fetchAssistants, chatSearch]);

  useEffect(() => {
    const handleRefresh = () => fetchChats(1);
    window.addEventListener("refresh-chats", handleRefresh);
    return () => window.removeEventListener("refresh-chats", handleRefresh);
  }, [fetchChats]);

  useEffect(() => {
    const handleRefreshAssistants = () => fetchAssistants(1);
    window.addEventListener("refresh-assistants", handleRefreshAssistants);
    return () =>
      window.removeEventListener("refresh-assistants", handleRefreshAssistants);
  }, [fetchAssistants]);

  useEffect(() => {
    const handleAssistantSelected = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ assistant?: Assistant }>;
      const assistant = customEvt.detail?.assistant;
      const raw = localStorage.getItem("selectedAssistantId");
      const parsed = raw ? Number(raw) : NaN;
      setActiveAssistantId(Number.isNaN(parsed) ? null : parsed);
      if (assistant) {
        setActiveAssistantTheme(assistant);
      }
    };
    window.addEventListener("assistant-selected", handleAssistantSelected);
    return () =>
      window.removeEventListener("assistant-selected", handleAssistantSelected);
  }, []);

  useEffect(() => {
    if (!isProfileRoute && user) {
      fetchAssistants(1);
    }
  }, [pathname, isProfileRoute, user, fetchAssistants]);

  useEffect(() => {
    fetchChats(1, chatSearch);
  }, [chatSearch, fetchChats]);

  useEffect(() => {
    const resolveActiveAssistant = async () => {
      if (pathname === "/") {
        const raw = localStorage.getItem("selectedAssistantId");
        const parsed = raw ? Number(raw) : NaN;
        setActiveAssistantId(Number.isNaN(parsed) ? null : parsed);
        return;
      }

      if (pathname.startsWith("/c/")) {
        const match = pathname.match(/^\/c\/(\d+)/);
        const chatId = match ? Number(match[1]) : NaN;
        if (Number.isNaN(chatId)) {
          setActiveAssistantId(null);
          return;
        }

        const listChat = chats.find((c) => c.id === chatId);
        if (listChat) {
          setActiveAssistantId(listChat.assistantId ?? null);
          return;
        }

        try {
          const res = await chatService.getById(chatId);
          setActiveAssistantId(res.data.data?.assistantId ?? null);
        } catch {
          setActiveAssistantId(null);
        }
        return;
      }

      setActiveAssistantId(null);
    };

    resolveActiveAssistant();
  }, [pathname, chats]);

  useEffect(() => {
    if (!activeAssistantId) {
      setActiveAssistantTheme(null);
      return;
    }

    const listMatch = assistants.find((a) => a.id === activeAssistantId);
    if (listMatch) {
      setActiveAssistantTheme(listMatch);
      return;
    }

    assistantService
      .getById(activeAssistantId)
      .then((res) => setActiveAssistantTheme(res.data.data || null))
      .catch(() => setActiveAssistantTheme(null));
  }, [activeAssistantId, assistants]);

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
      assistants={assistants}
      onRefresh={() => { fetchChats(1, chatSearch); fetchFolders(); fetchAssistants(1); }}
      onMobileClose={() => setMobileOpen(false)}
      onLogout={handleLogout}
      hasMore={hasMore}
      onLoadMore={() => { if (hasMore) fetchChats(page + 1, chatSearch); }}
      searchQuery={chatSearch}
      onSearchChange={setChatSearch}
      assistantsHasMore={assistantsHasMore}
      onLoadMoreAssistants={() => { if (assistantsHasMore) fetchAssistants(assistantsPage + 1); }}
      collapsed={sidebarCollapsed}
      onToggleCollapse={toggleSidebarCollapsed}
    />
  );

  const resolvedGradient = activeAssistantTheme
    ? theme === "dark" &&
      activeAssistantTheme.bgFromDark &&
      activeAssistantTheme.bgToDark
      ? {
          from: activeAssistantTheme.bgFromDark,
          via:
            activeAssistantTheme.bgViaDark || activeAssistantTheme.bgFromDark,
          to: activeAssistantTheme.bgToDark,
        }
      : activeAssistantTheme.bgFrom && activeAssistantTheme.bgTo
        ? {
            from: activeAssistantTheme.bgFrom,
            via: activeAssistantTheme.bgVia || activeAssistantTheme.bgFrom,
            to: activeAssistantTheme.bgTo,
          }
        : null
    : null;
  const hasAssistantGradient = !!resolvedGradient;
  const dynamicBackgroundStyle = resolvedGradient
    ? {
        background: `linear-gradient(135deg, ${resolvedGradient.from}, ${resolvedGradient.via}, ${resolvedGradient.to})`,
      }
    : undefined;

  return (
    <div
      className={`h-dvh flex overflow-hidden text-foreground ${
        hasAssistantGradient
          ? "bg-background"
          : "bg-gradient-to-br from-purple-100 via-[#EACFEF] to-pink-100 dark:from-purple-950/40 dark:via-background dark:to-pink-950/40"
      }`}
      style={dynamicBackgroundStyle}
    >
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
        <span className="font-semibold text-sm">
          {activeAssistantTheme?.name || "AI Colab"}
        </span>
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
