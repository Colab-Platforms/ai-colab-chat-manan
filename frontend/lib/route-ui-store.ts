import { useSyncExternalStore } from "react";

type RouteUiState = {
  activeChatId: number | null;
  isDraftRoute: boolean;
  isStarredRoute: boolean;
};

const state: RouteUiState = {
  activeChatId: null,
  isDraftRoute: true,
  isStarredRoute: false,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setRouteUiFromPathname(pathname: string) {
  const match = pathname.match(/^\/c\/(\d+)/);
  const parsed = match ? Number(match[1]) : NaN;
  const nextActiveChatId = Number.isNaN(parsed) ? null : parsed;
  const nextIsStarredRoute = pathname === "/starred";
  const nextIsDraftRoute = pathname === "/" || pathname === "/new";

  if (
    state.activeChatId === nextActiveChatId &&
    state.isDraftRoute === nextIsDraftRoute &&
    state.isStarredRoute === nextIsStarredRoute
  ) {
    return;
  }

  state.activeChatId = nextActiveChatId;
  state.isDraftRoute = nextIsDraftRoute;
  state.isStarredRoute = nextIsStarredRoute;
  emit();
}

export function getRouteUiSnapshot(): Readonly<RouteUiState> {
  return state;
}

export function subscribeRouteUi(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useIsChatActive(chatId: number) {
  return useSyncExternalStore(
    subscribeRouteUi,
    () => state.activeChatId === chatId,
    () => false,
  );
}

export function useIsDraftRoute() {
  return useSyncExternalStore(subscribeRouteUi, () => state.isDraftRoute, () => true);
}

export function useIsStarredRoute() {
  return useSyncExternalStore(subscribeRouteUi, () => state.isStarredRoute, () => false);
}

