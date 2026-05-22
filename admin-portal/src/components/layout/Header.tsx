"use client";
import { Bell, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

const roleLabel: Record<string, string> = {
  ADMIN: "Quản trị viên",
  OPERATOR_PROVINCE: "Operator tỉnh",
  OPERATOR_SUB: "Operator thực địa",
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export function Header({ title, onMenuClick }: HeaderProps) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    async function loadNotifications() {
      const response = await api.get("/notifications/mine");
      if (cancelled) return;
      setItems(response.data.data.items ?? []);
      setUnreadCount(response.data.data.unreadCount ?? 0);
    }

    loadNotifications().catch(() => undefined);
    const timer = window.setInterval(() => loadNotifications().catch(() => undefined), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    await api.patch("/notifications/mine/read-all").catch(() => undefined);
  }

  return (
    <header className="sticky top-0 z-20 flex h-24 shrink-0 items-center border-b border-teal-950/10 bg-[#f7fbfa]/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-3">
          {onMenuClick ? (
            <button
              aria-label="Mở menu"
              onClick={onMenuClick}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-teal-950/10 bg-white text-teal-950 shadow-sm lg:hidden"
            >
              <Menu size={20} />
            </button>
          ) : null}
          <div className="min-w-0">
            <p className="portal-eyebrow hidden leading-none sm:block">TripNest Portal</p>
            <h1 className="mt-2 truncate text-3xl font-semibold leading-none tracking-tight text-slate-950">{title}</h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div ref={ref} className="relative">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="relative grid h-12 w-12 place-items-center rounded-md border border-teal-950/10 bg-white text-slate-600 shadow-sm transition hover:text-teal-900"
              aria-label="Thông báo"
            >
              <Bell size={19} />
              {unreadCount > 0 ? (
                <span className="absolute right-2.5 top-2 grid min-h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-teal-950 ring-2 ring-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>

            {open ? (
              <div className="absolute right-0 top-[calc(100%+12px)] w-96 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Thông báo</p>
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs font-medium text-teal-700 hover:text-teal-900"
                    >
                      Đánh dấu đã đọc
                    </button>
                  ) : null}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-400">
                      Chưa có thông báo.
                    </p>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className={`border-b border-slate-100 px-4 py-3 last:border-0 ${
                          item.isRead ? "bg-white" : "bg-amber-50/60"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm leading-5 text-slate-600">{item.message}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          {new Date(item.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex h-12 items-center gap-3 rounded-md border border-teal-950/10 bg-white px-3 shadow-sm">
            <div className="grid h-9 w-9 place-items-center rounded bg-teal-800 text-xs font-bold text-white">
              {user?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="hidden min-w-0 text-left sm:block">
              <p className="max-w-44 truncate text-sm font-semibold leading-none text-slate-800">{user?.email}</p>
              <p className="mt-1.5 text-xs leading-none text-slate-500">{roleLabel[user?.role ?? ""] ?? ""}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
