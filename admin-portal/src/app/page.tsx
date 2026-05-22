"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getRedirectPath } from "@/lib/auth";

export default function RootPage() {
  const { user, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    if (user) {
      router.replace(getRedirectPath(user.role));
    } else {
      router.replace("/login");
    }
  }, [hasHydrated, user, router]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" />
    </div>
  );
}
