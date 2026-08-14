"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Toast, Toaster as ArkToaster, createToaster } from "@ark-ui/react/toast";
import { Portal } from "@ark-ui/react/portal";
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared toaster store. `duration` and `placement` mirror the react-toastify
 * setup this replaced (`autoClose={3000}`, `position="top-right"`), so existing
 * `toast.*` calls behave exactly as before.
 */
export const toaster = createToaster({
  placement: "top-end",
  gap: 12,
  overlap: true,
  duration: 3000,
  offsets: "1rem",
});

type ToastKind = "success" | "error" | "warning" | "info";

const VARIANTS: Record<
  ToastKind,
  { Icon: LucideIcon; root: string; icon: string }
> = {
  success: {
    Icon: CheckCircle,
    root: "bg-green-50 border-green-500 text-green-900 dark:bg-green-950 dark:border-green-400 dark:text-green-50",
    icon: "text-green-500 dark:text-green-400",
  },
  error: {
    Icon: AlertCircle,
    root: "bg-red-50 border-red-500 text-red-900 dark:bg-red-950 dark:border-red-400 dark:text-red-50",
    icon: "text-red-500 dark:text-red-400",
  },
  warning: {
    Icon: AlertTriangle,
    root: "bg-yellow-50 border-yellow-500 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-400 dark:text-yellow-50",
    icon: "text-yellow-500 dark:text-yellow-400",
  },
  info: {
    Icon: Info,
    root: "bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-950 dark:border-blue-400 dark:text-blue-50",
    icon: "text-blue-500 dark:text-blue-400",
  },
};

interface ToastExtra {
  description?: ReactNode;
  duration?: number;
  id?: string;
}

function show(type: ToastKind, title: ReactNode, extra?: ToastExtra) {
  // Ark warns about flushSync when a toast is created during render or inside a
  // React effect (e.g. chat-input's attachment fallback), so always defer.
  queueMicrotask(() => {
    toaster.create({ ...extra, title, type });
  });
}

/**
 * react-toastify-compatible facade over the Ark toaster, so call sites keep
 * using `toast.success("...")` / `toast.error("...")` unchanged.
 */
export const toast = {
  success: (title: ReactNode, extra?: ToastExtra) => show("success", title, extra),
  error: (title: ReactNode, extra?: ToastExtra) => show("error", title, extra),
  info: (title: ReactNode, extra?: ToastExtra) => show("info", title, extra),
  warning: (title: ReactNode, extra?: ToastExtra) => show("warning", title, extra),
  warn: (title: ReactNode, extra?: ToastExtra) => show("warning", title, extra),
  dismiss: (id?: string) => toaster.dismiss(id),
};

export function Toaster() {
  return (
    <Portal>
      <ArkToaster toaster={toaster} style={{ zIndex: 100000 }}>
        {(item) => {
          const variant = VARIANTS[item.type as ToastKind] ?? VARIANTS.info;
          const { Icon } = variant;

          return (
            <Toast.Root
              onClick={() => item.id && toaster.dismiss(item.id)}
              className={cn(
                "relative w-[min(20rem,calc(100vw-2rem))] cursor-pointer rounded-lg border-l-4 p-4 pr-10 shadow-lg wrap-anywhere",
                "transition-all duration-300 ease-out will-change-transform",
                "h-(--height) translate-x-(--x) translate-y-(--y) scale-(--scale) opacity-(--opacity) z-(--z-index)",
                variant.root,
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", variant.icon)} />
                <div className="flex-1">
                  <Toast.Title className="text-sm font-semibold">
                    {item.title}
                  </Toast.Title>
                  {item.description ? (
                    <Toast.Description className="mt-1 text-sm opacity-80">
                      {item.description}
                    </Toast.Description>
                  ) : null}
                </div>
              </div>
              <Toast.CloseTrigger className="absolute top-3 right-3 rounded p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10">
                <X className="h-3 w-3" />
              </Toast.CloseTrigger>
            </Toast.Root>
          );
        }}
      </ArkToaster>
    </Portal>
  );
}
