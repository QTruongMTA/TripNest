"use client";
import { create } from "zustand";
import type { SessionUser } from "@/types";

interface AuthState {
  user: SessionUser | null;
  accessToken: string | null;
  hasHydrated: boolean;
  setSession: (user: SessionUser, token: string) => void;
  clearSession: () => void;
  hydrate: () => void;
}

const PORTAL_TOKEN_COOKIE = "portal_token";
const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function setPortalTokenCookie(token: string) {
  document.cookie = `${PORTAL_TOKEN_COOKIE}=${token}; path=/; max-age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function clearPortalTokenCookie() {
  document.cookie = `${PORTAL_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  hasHydrated: false,

  setSession(user, token) {
    if (typeof window !== "undefined") {
      localStorage.setItem("portal_token", token);
      localStorage.setItem("portal_user", JSON.stringify(user));
      setPortalTokenCookie(token);
    }
    set({ user, accessToken: token, hasHydrated: true });
  },

  clearSession() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("portal_token");
      localStorage.removeItem("portal_user");
      clearPortalTokenCookie();
    }
    set({ user: null, accessToken: null, hasHydrated: true });
  },

  hydrate() {
    if (typeof window === "undefined") {
      set({ hasHydrated: true });
      return;
    }
    const token = localStorage.getItem("portal_token");
    const raw = localStorage.getItem("portal_user");
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as SessionUser;
        setPortalTokenCookie(token);
        set({ user, accessToken: token, hasHydrated: true });
      } catch {
        localStorage.removeItem("portal_token");
        localStorage.removeItem("portal_user");
        clearPortalTokenCookie();
        set({ user: null, accessToken: null, hasHydrated: true });
      }
      return;
    }
    set({ user: null, accessToken: null, hasHydrated: true });
  },
}));
