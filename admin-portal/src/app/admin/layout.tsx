"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user || user.role !== "ADMIN") {
      router.replace("/login");
    }
  }, [hasHydrated, user, router]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7fbfa]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" />
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7fbfa]">
        <div className="text-sm font-medium text-slate-500">Đang chuyển về trang đăng nhập...</div>
      </div>
    );
  }

  return <>{children}</>;
}
