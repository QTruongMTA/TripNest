"use client";

import { getAccessToken } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export function TravelerNotificationBell() {
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
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1"}/notifications/mine`,
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
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1"}/notifications/mine/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:text-teal-700"
        aria-label="Thông báo"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-teal-950 ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-40 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left text-slate-900 shadow-2xl">
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
                <div
                  key={item.id}
                  className={`border-b border-slate-100 px-4 py-3 last:border-0 ${
                    item.isRead ? "bg-white" : "bg-amber-50"
                  }`}
                >
                  <p className="text-sm font-semibold">{item.title}</p>
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
  );
}
