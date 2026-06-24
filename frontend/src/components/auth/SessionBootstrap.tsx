"use client";

import { getAccessToken, getStoredUser } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

export function SessionBootstrap() {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    const accessToken = getAccessToken();
    const storedUser = getStoredUser();

    if (!accessToken || !storedUser) return;

    setSession(storedUser, accessToken);

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/auth/refresh`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          clearSession();
          return;
        }

        const payload = await response.json();
        setSession(payload.data.user, payload.data.accessToken);
      })
      .catch(() => {
        // Giữ session cục bộ nếu backend tạm thời không phản hồi.
      });
  }, [clearSession, setSession]);

  return null;
}
