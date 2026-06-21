"use client";

import { useAuthStore } from "@/store/authStore";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Trang chủ", href: "/host/properties" },
  { label: "Hồ sơ host", href: "/host/profile" },
  { label: "Đặt phòng", href: "/host/bookings" },
  { label: "Lịch phòng", href: "/host/calendar" },
  { label: "Đánh giá", href: "/host/reviews" },
  { label: "Tài chính", href: "/host/revenue" },
  { label: "Dữ liệu thị trường", href: "/host/market" },
];

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
