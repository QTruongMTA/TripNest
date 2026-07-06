"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { UserAvatar } from "./UserAvatar";

const items = [
  { label: "Tài khoản", href: "/traveler/profile", icon: "user" },
  { label: "Đặt chỗ", href: "/traveler/bookings", icon: "calendar" },
  { label: "Đã thích", href: "/traveler/favorites", icon: "heart" },
] as const;

function MenuIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    user: "M20 21a8 8 0 0 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    calendar: "M8 2v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
    heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z",
    logout: "M10 17l5-5-5-5M15 12H3m12-8h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4",
  };

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AccountMenu() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const missingRefundAccount = Boolean(user && (!user.bankName?.trim() || !user.bankAccountNumber?.trim()));

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="relative flex items-center gap-3">
        <UserAvatar interactive={false} />
        {missingRefundAccount ? (
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-emerald-950" />
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+14px)] w-[340px] overflow-hidden rounded-[24px] border border-slate-200 bg-white text-slate-900 shadow-2xl">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="font-semibold">{user.displayName || user.name}</p>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          </div>
          <div className="p-2">
            {items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition hover:bg-emerald-50"
              >
                <MenuIcon name={item.icon} />
                <span className="flex flex-1 items-center gap-2">
                  {item.label}
                  {item.href === "/traveler/profile" && missingRefundAccount ? (
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                  ) : null}
                </span>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                clearSession();
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition hover:bg-rose-50 hover:text-rose-700"
            >
              <MenuIcon name="logout" />
              Đăng xuất
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
