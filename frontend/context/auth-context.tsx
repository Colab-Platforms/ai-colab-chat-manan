"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import api from "@/lib/api";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  profileImage?: string;
  timezone: string;
  userRoles: { role: { id: number; name: string } }[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const saveAuth = (userData: User, tokenData: string) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem("token", tokenData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const { user: userData, token: tokenData } = res.data.data;
    saveAuth(userData, tokenData);
  };

  const register = async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    await api.post("/auth/register", data);
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  const hasRole = useCallback(
    (role: string) => {
      if (!user) return false;
      const normalize = (r: string) => r.replace(/_/g, "").toUpperCase();
      const target = normalize(role);
      return user.userRoles.some((ur) => normalize(ur.role.name) === target);
    },
    [user]
  );

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get("/users/profile");
      const userData = res.data.data;
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch {
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, hasRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
