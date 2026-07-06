"use client";

import { create } from "zustand";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  displayName: string | null;
  role: string;
  avatar: string | null;
  phone: string | null;
  birthDate: string | null;
  nationality: string;
  gender: string | null;
  address: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  emailVerified?: boolean;
};

type AuthState = {
  user: SessionUser | null;
  accessToken: string | null;
  setSession: (user: SessionUser, accessToken: string) => void;
  setUser: (user: SessionUser) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("accessToken", accessToken);
      window.localStorage.setItem("sessionUser", JSON.stringify(user));
    }
    set({ user, accessToken });
  },
  setUser: (user) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sessionUser", JSON.stringify(user));
    }
    set({ user });
  },
  clearSession: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("sessionUser");
    }
    set({ user: null, accessToken: null });
  },
}));
