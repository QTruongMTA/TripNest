"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart2,
  Bell,
  BookOpen,
  Building2,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileWarning,
  LayoutDashboard,
  Lock,
  LogOut,
  MessagesSquare,
  Shield,
  Tag,
  User,
  UserCog,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: number;
  timer?: string;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  href?: string;
  items?: NavItem[];
  badge?: number;
}

interface SidebarProps {
  onNavigate?: () => void;
}

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "TÃ i khoáº£n khÃ¡ch hÃ ng", href: "/admin/users", icon: <Users size={18} /> },
  { label: "TÃ i khoáº£n nhÃ¢n viÃªn", href: "/admin/operators", icon: <UserCog size={18} /> },
  { label: "Chá»— á»Ÿ", href: "/admin/listings", icon: <Building2 size={18} /> },
  { label: "Äáº·t chá»—", href: "/admin/bookings", icon: <BookOpen size={18} /> },
  { label: "Doanh thu", href: "/admin/payments", icon: <CreditCard size={18} /> },
  { label: "Payout Host", href: "/admin/payouts", icon: <BarChart2 size={18} /> },
  { label: "Khuyáº¿n mÃ£i", href: "/admin/promotions", icon: <Tag size={18} /> },
  { label: "Hoa há»“ng", href: "/admin/commission", icon: <BarChart2 size={18} /> },
  { label: "ÄÃ¡nh giÃ¡", href: "/admin/reviews", icon: <ClipboardList size={18} /> },
  { label: "Audit log", href: "/admin/audit-log", icon: <Shield size={18} /> },
];

type OperatorStats = {
  pendingListings?: number;
  pendingApprovals?: number;
  openDisputes?: number;
  pendingBookings?: number;
};

function Badge({ value }: { value?: number }) {
  if (!value) return null;
  return (
    <span className="ml-auto grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
      {value > 99 ? "99+" : value}
    </span>
  );
}

function TimerPill({ value }: { value?: string }) {
  if (!value) return null;
  return (
    <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">
      {value}
    </span>
  );
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user, clearSession } = useAuthStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stats, setStats] = useState<OperatorStats>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user || user.role === "ADMIN") return;
    api.get("/operator/dashboard")
      .then((response) => setStats(response.data.data?.stats ?? {}))
      .catch(() => undefined);
  }, [user]);

  const operatorNav = useMemo<NavGroup[]>(() => [
    {
      label: "Dashboard",
      href: "/operator/dashboard",
      icon: <LayoutDashboard size={18} />,
    },
    {
      label: "Duyá»‡t cÆ¡ sá»Ÿ lÆ°u trÃº",
      icon: <CheckSquare size={18} />,
      badge: (stats.pendingListings ?? 0) + (stats.pendingApprovals ?? 0),
      items: [
        { label: "Chá» duyá»‡t", href: "/operator/listings?status=PENDING", badge: stats.pendingListings },
        { label: "Tá»« chá»‘i", href: "/operator/listings?status=INACTIVE&view=approval" },
      ],
    },
    {
      label: "Giáº£i quyáº¿t tranh cháº¥p",
      icon: <MessagesSquare size={18} />,
      badge: stats.openDisputes,
      items: [
        { label: "Äang xá»­ lÃ½", href: "/operator/disputes?status=ACTIVE", badge: stats.openDisputes, timer: "24h" },
        { label: "ÄÃ£ giáº£i quyáº¿t", href: "/operator/disputes?status=RESOLVED" },
      ],
    },
    {
      label: "Äáº·t phÃ²ng trong tá»‰nh",
      icon: <BookOpen size={18} />,
      badge: stats.pendingBookings,
      items: [
        { label: "Chá» duyá»‡t", href: "/operator/bookings?status=PENDING", badge: stats.pendingBookings },
        { label: "ÄÃ£ xÃ¡c nháº­n", href: "/operator/bookings?status=CONFIRMED" },
        { label: "ÄÃ£ há»§y", href: "/operator/bookings?status=CANCELLED" },
      ],
    },
    {
      label: "Quáº£n lÃ½ cÆ¡ sá»Ÿ",
      icon: <Building2 size={18} />,
      items: [
        { label: "Äang hoáº¡t Ä‘á»™ng", href: "/operator/listings?status=ACTIVE" },
        { label: "ÄÃ£ khÃ³a", href: "/operator/listings?status=SUSPENDED" },
      ],
    },
    {
      label: "BÃ¡o cÃ¡o vi pháº¡m",
      icon: <FileWarning size={18} />,
      items: [
        { label: "ChÆ°a xá»­ lÃ½", href: "/operator/reports?status=OPEN" },
        { label: "ÄÃ£ xá»­ lÃ½", href: "/operator/reports?status=RESOLVED" },
      ],
    },
    {
      label: "Doanh thu tá»‰nh",
      href: "/operator/revenue",
      icon: <CreditCard size={18} />,
    },
    {
      label: "ThÃ´ng bÃ¡o",
      href: "/operator/notifications",
      icon: <Bell size={18} />,
    },
    {
      label: "Há»“ sÆ¡ cÃ¡ nhÃ¢n",
      href: "/operator/profile",
      icon: <User size={18} />,
    },
  ], [stats.openDisputes, stats.pendingApprovals, stats.pendingBookings, stats.pendingListings]);

  const roleLabel =
    user?.role === "ADMIN"
      ? "Quáº£n trá»‹ há»‡ thá»‘ng"
      : user?.role === "OPERATOR_PROVINCE"
        ? "Operator tá»‰nh"
        : "Operator thá»±c Ä‘á»‹a";

  async function handleLogout() {
    await api.post("/auth/logout").catch(() => undefined);
    clearSession();
    router.push("/login");
  }

  function isActiveHref(href: string) {
    const [path, query] = href.split("?");
    if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
    if (!query) return true;
    const expected = new URLSearchParams(query);
    return Array.from(expected.entries()).every(([key, value]) => searchParams.get(key) === value);
  }

  function toggleGroup(label: string, currentlyOpen: boolean) {
    setOpenGroups((current) => ({ ...current, [label]: !currentlyOpen }));
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
        {user?.role === "ADMIN"
          ? ADMIN_NAV.map((item) => {
              const active = isActiveHref(item.href);
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
            })
          : operatorNav.map((group) => {
              const active = group.href ? isActiveHref(group.href) : group.items?.some((item) => isActiveHref(item.href));
              if (group.href) {
                return (
                  <Link
                    key={group.label}
                    href={group.href}
                    onClick={onNavigate}
                    className={clsx(
                      "group flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-amber-400 text-teal-950 shadow-sm shadow-amber-950/10"
                        : "text-white/72 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <span className={clsx("grid h-8 w-8 place-items-center rounded-md", active ? "bg-teal-950/10" : "bg-white/5 text-white/75 group-hover:text-white")}>
                      {group.icon}
                    </span>
                    <span className="truncate">{group.label}</span>
                    <Badge value={group.badge} />
                  </Link>
                );
              }

              const isOpen = openGroups[group.label] ?? Boolean(active);
              return (
                <div key={group.label} className="rounded-md">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleGroup(group.label, isOpen)}
                    className={clsx(
                      "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition",
                      active ? "bg-white/10 text-white" : "text-white/72 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-white/5 text-white/75">
                      {group.icon}
                    </span>
                    <span className="truncate">{group.label}</span>
                    <Badge value={group.badge} />
                    <ChevronDown size={14} className={clsx("text-white/45 transition-transform", isOpen && "rotate-180")} />
                  </button>

                  {isOpen ? (
                    <div className="ml-7 mt-1 space-y-1 border-l border-white/10 pl-3">
                      {group.items?.map((item) => {
                        const itemActive = isActiveHref(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            className={clsx(
                              "flex min-h-9 items-center gap-2 rounded px-2 py-1.5 text-xs font-medium transition",
                              itemActive ? "bg-amber-400 text-teal-950" : "text-white/62 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            <span className="truncate">{item.label}</span>
                            <Badge value={item.badge} />
                            <TimerPill value={item.timer} />
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
      </nav>

      {user?.role !== "ADMIN" ? (
        <div className="mx-4 mb-3 rounded-md border border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/62">
          <div className="mb-1 flex items-center gap-2 font-semibold text-white/80">
            <Lock size={13} />
            Pháº¡m vi váº­n hÃ nh
          </div>
          Dá»¯ liá»‡u vÃ  tÃ¡c vá»¥ Ä‘Æ°á»£c Ä‘á»“ng bá»™ theo Ä‘á»‹a bÃ n phá»¥ trÃ¡ch. CÃ¡c thiáº¿t láº­p ná»n táº£ng do bá»™ pháº­n quáº£n trá»‹ há»‡ thá»‘ng Ä‘iá»u phá»‘i.
        </div>
      ) : null}

      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-[#a26f22]/40 bg-[#b9822f] px-4 text-sm font-semibold text-white shadow-sm shadow-amber-950/10 transition hover:bg-[#a87429] active:scale-[0.99]"
        >
          <LogOut size={17} />
          ÄÄƒng xuáº¥t
        </button>
      </div>
    </aside>
  );
}

