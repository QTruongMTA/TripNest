"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

export function SessionBootstrap() {
  const { hydrate, clearSession } = useAuthStore();

  useEffect(() => {
    hydrate();
    const token = localStorage.getItem("portal_token");
    if (!token) return;
    api.get("/auth/me").catch(() => clearSession());
  }, [hydrate, clearSession]);

  return null;
}
