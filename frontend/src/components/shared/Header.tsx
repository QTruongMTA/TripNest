"use client";

import { AccountMenu } from "@/components/auth/AccountMenu";
import { openChatWidget } from "@/components/chat/ChatWidget";
import { getAccessToken } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { label: "Trang chủ", href: "/" },
  { label: "Nơi ở gần đây", href: "/properties" },
  { label: "Tiết kiệm", href: "#uu-dai" },
  { label: "Chính sách", href: "/about" },
];

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: {
    kind?: string;
    conversationId?: string;
    propertyId?: string;
  } | null;
  createdAt: string;
};

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    let cancelled = false;
    async function loadNotifications() {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/notifications/mine`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok || cancelled) return;
      const payload = await response.json();
      setItems(payload.data.items ?? []);
      setUnreadCount(payload.data.unreadCount ?? 0);
    }

    loadNotifications().catch(() => undefined);
    const timer = window.setInterval(() => loadNotifications().catch(() => undefined), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    const token = getAccessToken();
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    if (!token) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/notifications/mine/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }

  async function handleNotificationClick(item: NotificationItem) {
    const token = getAccessToken();
    setItems((current) => current.map((notification) => notification.id === item.id ? { ...notification, isRead: true } : notification));
    setUnreadCount((current) => item.isRead ? current : Math.max(0, current - 1));
    if (token) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/notifications/mine/${item.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    if (item.metadata?.conversationId) {
      setOpen(false);
      openChatWidget({ conversationId: item.metadata.conversationId });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
        aria-label="Thông báo"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-teal-950 ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+14px)] w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold">Thông báo</p>
            {unreadCount > 0 ? (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-teal-700">
                Đã đọc
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Chưa có thông báo.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNotificationClick(item)}
                  className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 ${item.isRead ? "bg-white" : "bg-amber-50"}`}
                >
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{item.message}</p>
                  <p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Header({ overlay = true }: { overlay?: boolean }) {
  const user = useAuthStore((state) => state.user);
  const isHost = user?.role === "HOST";

  return (
    <header className={`${overlay ? "absolute" : "relative"} inset-x-0 top-0 z-30`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-6">
        <a href="/" className="flex items-center gap-3 text-white">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/15 text-lg font-semibold backdrop-blur">
            T
          </span>
          <span>
            <span className="block text-xl font-semibold tracking-tight">TripNest</span>
            <span className="block text-xs text-white/70">Khám phá Việt Nam</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 text-sm text-white/90 md:flex">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} className="rounded-full px-4 py-2 transition hover:bg-white/10">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={isHost ? "/host/properties" : "/host/properties/new"}
            className="hidden px-3 py-2 text-sm font-medium text-white transition hover:text-white/80 sm:inline-flex"
          >
            {isHost ? "Chỗ nghỉ của Quý vị" : "Đăng chỗ nghỉ"}
          </a>
          {user ? (
            <>
              <NotificationBell />
              <AccountMenu />
            </>
          ) : (
            <>
              <a href="/register" className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-teal-950 transition hover:bg-teal-50">
                Đăng ký
              </a>
              <a href="/login" className="rounded-md border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
                Đăng nhập
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
