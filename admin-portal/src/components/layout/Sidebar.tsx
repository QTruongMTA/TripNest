"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart2,
  BookOpen,
  Building2,
  CheckSquare,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Shield,
  Tag,
  UserCog,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import type { Role } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roleOnly?: Role[];
}

interface SidebarProps {
  onNavigate?: () => void;
}

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Tài khoản khách hàng", href: "/admin/users", icon: <Users size={18} /> },
  { label: "Tài khoản nhân viên", href: "/admin/operators", icon: <UserCog size={18} /> },
  { label: "Chỗ ở & Tour", href: "/admin/listings", icon: <Building2 size={18} /> },
  { label: "Đặt chỗ", href: "/admin/bookings", icon: <BookOpen size={18} /> },
  { label: "Doanh thu", href: "/admin/payments", icon: <CreditCard size={18} /> },
  { label: "Khuyến mãi", href: "/admin/promotions", icon: <Tag size={18} /> },
  { label: "Hoa hồng", href: "/admin/commission", icon: <BarChart2 size={18} /> },
  { label: "Đánh giá", href: "/admin/reviews", icon: <ClipboardList size={18} /> },
  { label: "Audit log", href: "/admin/audit-log", icon: <Shield size={18} /> },
];

const OPERATOR_PROVINCE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/operator/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Chỗ ở trong tỉnh", href: "/operator/listings", icon: <Building2 size={18} /> },
  { label: "Duyệt Host", href: "/operator/host-approval", icon: <CheckSquare size={18} /> },
  { label: "Operator con", href: "/operator/sub-operators", icon: <UserCog size={18} /> },
  { label: "Nhiệm vụ", href: "/operator/tasks", icon: <ClipboardList size={18} /> },
  { label: "Tranh chấp", href: "/operator/disputes", icon: <MessagesSquare size={18} /> },
  { label: "Báo cáo", href: "/operator/reports", icon: <BarChart2 size={18} /> },
];

const OPERATOR_SUB_NAV: NavItem[] = [
  { label: "Dashboard", href: "/operator/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Nhiệm vụ của tôi", href: "/operator/tasks", icon: <ClipboardList size={18} /> },
  { label: "Chỗ ở trong tỉnh", href: "/operator/listings", icon: <Building2 size={18} /> },
  { label: "Duyệt Host", href: "/operator/host-approval", icon: <CheckSquare size={18} /> },
  { label: "Tranh chấp", href: "/operator/disputes", icon: <MessagesSquare size={18} /> },
];

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user, clearSession } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  const navItems =
    user?.role === "ADMIN"
      ? ADMIN_NAV
      : user?.role === "OPERATOR_PROVINCE"
        ? OPERATOR_PROVINCE_NAV
        : OPERATOR_SUB_NAV;

  const roleLabel =
    user?.role === "ADMIN"
      ? "Quản trị hệ thống"
      : user?.role === "OPERATOR_PROVINCE"
        ? "Operator tỉnh"
        : "Operator thực địa";

  async function handleLogout() {
    await api.post("/auth/logout").catch(() => undefined);
    clearSession();
    router.push("/login");
  }

  return (
    <aside className="flex h-full min-h-screen w-72 flex-col overflow-hidden bg-[#0f3f3b] text-white shadow-2xl shadow-teal-950/20 lg:w-72">
      <div className="relative flex h-24 shrink-0 items-center border-b border-white/10 px-5">
        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(135deg,_rgba(251,191,36,0.26),_rgba(255,255,255,0))]" />
        <Link href={user?.role === "ADMIN" ? "/admin/dashboard" : "/operator/dashboard"} className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md border border-white/25 bg-white/15 text-base font-semibold backdrop-blur">
            TN
          </span>
          <span>
            <span className="block text-xl font-semibold tracking-tight">TripNest</span>
            <span className="block text-xs text-white/65">{roleLabel}</span>
          </span>
        </Link>
      </div>

      <nav className="scrollbar-hidden flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "group flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-amber-400 text-teal-950 shadow-sm shadow-amber-950/10"
                  : "text-white/72 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className={clsx("grid h-8 w-8 place-items-center rounded-md", active ? "bg-teal-950/10" : "bg-white/5 text-white/75 group-hover:text-white")}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-[#a26f22]/40 bg-[#b9822f] px-4 text-sm font-semibold text-white shadow-sm shadow-amber-950/10 transition hover:bg-[#a87429] active:scale-[0.99]"
        >
          <LogOut size={17} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
