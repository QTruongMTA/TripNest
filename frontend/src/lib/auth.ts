import type { SessionUser } from "@/store/authStore";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accessToken");
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem("sessionUser");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}
