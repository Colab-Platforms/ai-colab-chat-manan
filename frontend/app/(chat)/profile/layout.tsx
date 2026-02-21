"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import {
  LayoutDashboard, Wallet, CreditCard, BarChart3,
  UserCircle, Users, Bot, Building, CreditCard as PlansIcon,
  ArrowLeft, Menu, X, Sun, Moon, LogOut, MessageSquare, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/context/theme-context";
import { useRouter } from "next/navigation";

const userNav = [
  { label: "Dashboard", href: "/profile", icon: LayoutDashboard },
  { label: "Wallet", href: "/profile/wallet", icon: Wallet },
  { label: "Subscription", href: "/profile/subscription", icon: CreditCard },
  { label: "Usage", href: "/profile/usage", icon: BarChart3 },
  { label: "My Account", href: "/profile/account", icon: UserCircle },
];

const adminNav = [
  { label: "Users", href: "/profile/users", icon: Users },
  { label: "Plans", href: "/profile/plans", icon: PlansIcon },
  { label: "Models", href: "/profile/models", icon: Bot },
  { label: "Providers", href: "/profile/providers", icon: Building },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, hasRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = hasRole("ADMIN") || hasRole("SUPER_ADMIN");
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <div className="p-4 border-b border-border/30">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground w-full justify-start cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Button>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">General</p>
        {userNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer
                ${isActive
                  ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1">
              <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
            </div>
            {adminNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer
                    ${isActive
                      ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </>
  );

  return (
    <div className="flex h-full">
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-3 left-3 z-50 cursor-pointer"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-40 h-full w-[280px] flex-shrink-0 border-r border-border/40
        bg-background md:bg-gradient-to-b md:from-muted/30 md:via-background md:to-muted/20 flex flex-col
        transition-transform duration-200
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {navContent}

        {/* User profile */}
        <div className="p-3 mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2 px-2 text-sm cursor-pointer hover:bg-muted overflow-hidden">
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
              <DropdownMenuItem onClick={() => { setMobileOpen(false); router.push("/"); }} className="gap-2 cursor-pointer">
                <MessageSquare className="w-4 h-4" /> Go to Chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { logout(); router.replace("/login"); }} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="w-4 h-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-6 pt-14 md:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
