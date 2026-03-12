"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
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
  login: (email: string, password: string) => Promise<{ requiresEmailVerification: boolean; email?: string }>;
  register: (data: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  verifyEmailOtp: (email: string, otp: string) => Promise<void>;
  resendEmailOtp: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return null;
    return storedToken;
  });
  const isLoading = false;

  const saveAuth = (userData: User, tokenData: string) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem("token", tokenData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const data = res.data.data;
    if (data?.requiresEmailVerification) {
      return { requiresEmailVerification: true, email: data.email || email };
    }
    const { user: userData, token: tokenData } = data;
    saveAuth(userData, tokenData);
    return { requiresEmailVerification: false };
  };

  const register = async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    await api.post("/auth/register", data);
  };

  const verifyEmailOtp = async (email: string, otp: string) => {
    await api.post("/auth/verify-email-otp", { email, otp });
  };

  const resendEmailOtp = async (email: string) => {
    await api.post("/auth/resend-email-otp", { email });
  };

  const forgotPassword = async (email: string) => {
    await api.post("/auth/forgot-password", { email });
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    await api.post("/auth/reset-password", { email, otp, newPassword });
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
    <AuthContext.Provider value={{ user, token, isLoading, login, register, verifyEmailOtp, resendEmailOtp, forgotPassword, resetPassword, logout, hasRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
