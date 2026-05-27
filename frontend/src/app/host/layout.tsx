"use client";

import { getStatusClass, getStatusLabel, hostProperties } from "@/components/host/host-dashboard-data";
import { useAuthStore } from "@/store/authStore";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { label: "Trang chủ", href: "/host/properties" },
  { label: "Đặt phòng", href: "/host/bookings" },
  { label: "Đánh giá", href: "/host/reviews" },
  { label: "Tài chính", href: "/host/revenue" },
  { label: "Dữ liệu thị trường", href: "/host/market" },
];

function SwitchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 7h11l-3-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17H6l3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 7l-3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 17l3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PropertySwitcher() {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(hostProperties[0]?.id ?? "");
  const ref = useRef<HTMLDivElement>(null);
  const selected = hostProperties.find((property) => property.id === selectedId) ?? hostProperties[0];

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Chuyển chỗ nghỉ"
        title="Chuyển chỗ nghỉ"
      >
        <SwitchIcon />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-40 w-[360px] overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-2xl shadow-slate-950/20">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold">Danh sách chỗ nghỉ</p>
            <p className="mt-1 text-xs text-slate-500">Chọn chỗ nghỉ để xem nhanh trạng thái vận hành.</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {hostProperties.map((property) => (
              <button
                key={property.id}
                type="button"
                onClick={() => {
                  setSelectedId(property.id);
                  setOpen(false);
                }}
                className={`grid w-full grid-cols-[1fr_auto] gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-teal-50 ${
                  selected?.id === property.id ? "bg-teal-50/80" : "bg-white"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold">{property.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">ID {property.id} · {property.city}</span>
                </span>
                <span className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                  <span className={`h-2.5 w-2.5 rounded-full ${getStatusClass(property.status)}`} />
                  {getStatusLabel(property.status)}
                </span>
              </button>
            ))}
          </div>
          <a href="/host/properties/new" className="block bg-slate-50 px-4 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">
            Thêm chỗ nghỉ mới
          </a>
        </div>
      ) : null}
    </div>
  );
}

export default function HostLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const displayName = user?.displayName || user?.name || user?.email || "Host TripNest";

  return (
    <div className="min-h-screen bg-[#f3f8f6] text-slate-950">
      <header className="sticky top-0 z-30 bg-teal-950 text-white shadow-lg shadow-teal-950/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <a href="/" className="flex shrink-0 items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-amber-300 text-lg font-black text-teal-950">T</span>
              <span className="text-xl font-semibold tracking-tight">TripNest</span>
            </a>
            <div className="hidden h-6 w-px bg-white/25 sm:block" />
            <p className="hidden truncate text-sm font-medium text-teal-50 sm:block">{displayName}</p>
          </div>

          <div className="flex items-center gap-3">
            <PropertySwitcher />
            <a href="/" className="rounded-md border border-white/20 px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10">
              Trang người dùng
            </a>
          </div>
        </div>

        <nav className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 md:px-6">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/host/properties" && pathname.startsWith(item.href));
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "border-amber-300 bg-white/10 text-white"
                      : "border-transparent text-teal-50/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-9">{children}</main>
    </div>
  );
}
