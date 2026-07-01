"use client";

import { Button } from "@/components/ui/Button";
import { getAccessToken, getStoredUser } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type HostBooking = {
  id: string;
  status: string;
  paymentStatus: string;
  checkIn: string | null;
  checkOut: string | null;
  numGuests: number;
  totalPrice: number;
  notes: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  guest: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  property: {
    id: string;
    title: string;
    city: string;
    country: string;
    thumbnailUrl: string | null;
  } | null;
  pendingModification: {
    id: string;
    requesterRole: string;
  } | null;
  unreadCount: number;
};

// Action items require exactly one "primary" action.
// Modifications can only exist on CONFIRMED bookings with checkIn in the future,
// so MOD_RESPONSE never overlaps with date-triggered actions.
type ActionType =
  | "OVERDUE_COMPLETE"  // checkOut < today — needs complete
  | "OVERDUE_CHECKIN"   // checkIn < today, checkOut >= today — may need no-show
  | "CHECKOUT_TODAY"    // checkOut === today — can complete
  | "CHECKIN_TODAY"     // checkIn === today — prepare
  | "PAYMENT_PENDING"   // guest reported bank transfer, host must confirm
  | "MOD_RESPONSE"      // pending guest modification, checkIn future
  | "CONFIRM_BOOKING";  // status === PENDING

type ActionItem = { booking: HostBooking; actionType: ActionType };

// ── Config ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:            { label: "Chờ xác nhận",   className: "bg-amber-50 text-amber-700" },
  CONFIRMED:          { label: "Đã xác nhận",    className: "bg-emerald-50 text-emerald-700" },
  COMPLETED:          { label: "Hoàn thành",      className: "bg-sky-50 text-sky-700" },
  CANCELLED:          { label: "Đã hủy",          className: "bg-slate-100 text-slate-500" },
  CANCELLED_BY_GUEST: { label: "Khách đã hủy",   className: "bg-slate-100 text-slate-500" },
  CANCELLED_BY_HOST:  { label: "Bạn đã hủy",     className: "bg-slate-100 text-slate-500" },
  EXPIRED:            { label: "Hết hạn",         className: "bg-slate-100 text-slate-400" },
  NO_SHOW:            { label: "Không đến",       className: "bg-rose-50 text-rose-600" },
};

const TERMINAL_STATUSES = new Set(["CANCELLED", "CANCELLED_BY_GUEST", "CANCELLED_BY_HOST", "NO_SHOW", "EXPIRED"]);

const ACTION_CONFIG: Record<ActionType, {
  badge: string;
  badgeClass: string;
  description: string;
  borderClass: string;
  groupOrder: 0 | 1 | 2;
}> = {
  OVERDUE_COMPLETE: {
    badge: "Quá hạn — cần hoàn tất",
    badgeClass: "bg-rose-100 text-rose-700",
    description: "Check-out đã qua, booking chưa được đánh dấu hoàn tất.",
    borderClass: "border-l-rose-400",
    groupOrder: 0,
  },
  OVERDUE_CHECKIN: {
    badge: "Quá giờ check-in",
    badgeClass: "bg-rose-100 text-rose-700",
    description: "Check-in đã qua, khách chưa được đánh dấu no-show nếu không đến.",
    borderClass: "border-l-rose-400",
    groupOrder: 0,
  },
  CHECKOUT_TODAY: {
    badge: "Check-out hôm nay",
    badgeClass: "bg-sky-100 text-sky-700",
    description: "Khách trả phòng hôm nay — có thể hoàn tất sau khi khách rời đi.",
    borderClass: "border-l-sky-400",
    groupOrder: 1,
  },
  CHECKIN_TODAY: {
    badge: "Check-in hôm nay",
    badgeClass: "bg-emerald-100 text-emerald-700",
    description: "Khách đến nhận phòng hôm nay — chuẩn bị đón tiếp.",
    borderClass: "border-l-emerald-400",
    groupOrder: 1,
  },
  PAYMENT_PENDING: {
    badge: "Chờ xác nhận thanh toán",
    badgeClass: "bg-amber-100 text-amber-800",
    description: "Khách đã báo chuyển khoản — kiểm tra tài khoản và xác nhận đã nhận tiền.",
    borderClass: "border-l-amber-500",
    groupOrder: 1,
  },
  MOD_RESPONSE: {
    badge: "Cần phản hồi thay đổi",
    badgeClass: "bg-amber-100 text-amber-800",
    description: "Khách yêu cầu thay đổi đặt phòng, đang chờ bạn phản hồi.",
    borderClass: "border-l-amber-400",
    groupOrder: 2,
  },
  CONFIRM_BOOKING: {
    badge: "Chờ xác nhận",
    badgeClass: "bg-amber-100 text-amber-800",
    description: "Khách gửi yêu cầu đặt phòng mới, đang chờ bạn xác nhận.",
    borderClass: "border-l-amber-400",
    groupOrder: 2,
  },
};

const ACTION_GROUPS: Array<{ order: 0 | 1 | 2; label: string; dotClass: string }> = [
  { order: 0, label: "Quá hạn — xử lý ngay",   dotClass: "bg-rose-500" },
  { order: 1, label: "Hôm nay",                 dotClass: "bg-sky-500"  },
  { order: 2, label: "Đang chờ phản hồi",       dotClass: "bg-amber-500" },
];

// ── Tabs ──────────────────────────────────────────────────────────────────

type TabId = "needs_action" | "all" | "pending" | "upcoming" | "staying" | "completed" | "cancelled";
type TabDef = { id: TabId; label: string; urgent?: boolean; filter: (b: HostBooking, today: string) => boolean };

const TABS: TabDef[] = [
  {
    id: "needs_action",
    label: "Cần xử lý",
    urgent: true,
    filter: (b, today) => getActionType(b, today) !== null,
  },
  { id: "all",       label: "Tất cả",           filter: () => true },
  { id: "pending",   label: "Chờ xác nhận",     filter: (b) => b.status === "PENDING" },
  {
    id: "upcoming",
    label: "Sắp đến",
    filter: (b, today) => b.status === "CONFIRMED" && b.checkIn != null && b.checkIn > today,
  },
  {
    id: "staying",
    label: "Đang lưu trú",
    filter: (b, today) =>
      b.status === "CONFIRMED" &&
      b.checkIn != null && b.checkIn <= today &&
      b.checkOut != null && b.checkOut > today,
  },
  { id: "completed", label: "Đã hoàn tất",      filter: (b) => b.status === "COMPLETED" },
  { id: "cancelled", label: "Đã hủy / No-show", filter: (b) => TERMINAL_STATUSES.has(b.status) },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

function formatDate(dateKey: string | null) {
  if (!dateKey) return "—";
  return new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })
    .format(new Date(`${dateKey}T00:00:00`));
}

// Returns the highest-priority action type for a booking, or null if nothing to do.
// Priority: CONFIRMED date-based (overdue → today → mod) first, PENDING last.
// PENDING cannot overlap with CONFIRMED rules, so order matters for mental model only.
function getActionType(b: HostBooking, todayKey: string): ActionType | null {
  if (b.status === "CONFIRMED") {
    const checkOutPast  = b.checkOut !== null && b.checkOut < todayKey;
    const checkInPast   = b.checkIn  !== null && b.checkIn  < todayKey;
    const checkOutToday = b.checkOut === todayKey;
    const checkInToday  = b.checkIn  === todayKey;

    if (checkOutPast)  return "OVERDUE_COMPLETE";
    if (checkInPast)   return "OVERDUE_CHECKIN";
    if (checkOutToday) return "CHECKOUT_TODAY";
    if (checkInToday)  return "CHECKIN_TODAY";
    if (b.paymentStatus === "PENDING_PAYMENT") return "PAYMENT_PENDING";
    if (b.pendingModification?.requesterRole === "GUEST") return "MOD_RESPONSE";
    return null;
  }
  if (b.status === "PENDING") return "CONFIRM_BOOKING";
  return null;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

// ── Component ──────────────────────────────────────────────────────────────

export default function HostBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("needs_action");
  const todayKey = toDateKey(new Date());

  // ── Ops header (arrivalsToday: CONFIRMED only — COMPLETED means already done) ──
  const operations = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
    return {
      arrivalsToday:   confirmed.filter((b) => b.checkIn  === todayKey).reduce((s, b) => s + b.numGuests, 0),
      departuresToday: confirmed.filter((b) => b.checkOut === todayKey).reduce((s, b) => s + b.numGuests, 0),
      upcomingArrivals: confirmed
        .filter((b) => b.checkIn && b.checkIn >= todayKey)
        .sort((a, b) => (a.checkIn ?? "").localeCompare(b.checkIn ?? ""))
        .slice(0, 6),
    };
  }, [bookings, todayKey]);

  // ── Action items for "Cần xử lý" tab ──
  const actionItems = useMemo((): ActionItem[] =>
    bookings
      .map((b) => ({ booking: b, actionType: getActionType(b, todayKey) }))
      .filter((x): x is ActionItem => x.actionType !== null),
  [bookings, todayKey]);

  // ── Tab counts ──
  const tabCounts = useMemo(() => {
    const counts = {} as Record<TabId, number>;
    for (const tab of TABS) counts[tab.id] = bookings.filter((b) => tab.filter(b, todayKey)).length;
    return counts;
  }, [bookings, todayKey]);

  // ── Filtered list (non-action tabs) ──
  const visibleBookings = useMemo(() => {
    const def = TABS.find((t) => t.id === activeTab)!;
    return bookings.filter((b) => def.filter(b, todayKey));
  }, [bookings, activeTab, todayKey]);

  const loadBookings = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API}/host/bookings`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await res.json();
      if (!res.ok) { setError(payload.error?.message ?? "Không thể tải booking."); return; }
      setBookings(payload.data);
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();
    if (!token) { router.push("/login?next=/host/bookings"); return; }
    if (user && user.role !== "HOST" && user.role !== "ADMIN") { router.push("/"); return; }
    loadBookings(token);
  }, [router, loadBookings]);

  const callAction = useCallback(async (id: string, action: string, body?: Record<string, string>) => {
    const token = getAccessToken();
    if (!token) return;
    setUpdatingId(id);
    setError(null);
    try {
      const res = await fetch(`${API}/host/bookings/${id}/${action}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await res.json();
      if (!res.ok) { setError(payload.error?.message ?? "Không thể cập nhật booking."); return; }
      setBookings((cur) =>
        cur.map((b) => b.id === id ? {
          ...b,
          ...(payload.data.status       ? { status: payload.data.status }             : {}),
          ...(payload.data.paymentStatus ? { paymentStatus: payload.data.paymentStatus } : {}),
          cancelledAt: payload.data.cancelledAt ?? b.cancelledAt,
        } : b)
      );
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setUpdatingId(null);
    }
  }, []);

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">Host</p>
        <h1 className="mt-2 text-3xl font-semibold">Đơn đặt của khách</h1>
      </div>

      {loading && <p className="text-slate-500">Đang tải booking...</p>}
      {error && <p className="mb-5 rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">{error}</p>}

      {/* ── Ops summary ── */}
      {!loading && !error && (
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr_2fr]">
          <OperationsCard label="Khách đến hôm nay"  value={operations.arrivalsToday}   tone="emerald" />
          <OperationsCard label="Khách đi hôm nay"   value={operations.departuresToday}  tone="sky" />
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Khách sắp tới</p>
                <p className="mt-1 text-sm text-slate-500">Booking đã xác nhận, sắp đến ngày nhận phòng.</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {operations.upcomingArrivals.length} lịch
              </span>
            </div>
            {operations.upcomingArrivals.length === 0 ? (
              <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Chưa có khách đã xác nhận sẽ đến trong thời gian tới.
              </p>
            ) : (
              <div className="mt-5 divide-y divide-slate-100">
                {operations.upcomingArrivals.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium text-slate-900">{b.guest.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{b.property?.title ?? "Chỗ nghỉ"} · {b.numGuests} khách</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-emerald-700">{formatDate(b.checkIn)}</p>
                      <p className="mt-1 text-slate-400">Trả phòng {formatDate(b.checkOut)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      {!loading && !error && (
        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const count = tabCounts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition",
                  isActive
                    ? tab.urgent ? "bg-rose-600 text-white" : "bg-slate-900 text-white"
                    : tab.urgent && count > 0
                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-300 hover:bg-rose-100"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
                ].join(" ")}
              >
                {tab.label}
                {count > 0 && (
                  <span className={[
                    "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                    isActive
                      ? "bg-white/25 text-white"
                      : tab.urgent && count > 0
                        ? "bg-rose-200 text-rose-800"
                        : "bg-slate-100 text-slate-600",
                  ].join(" ")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Action inbox ("Cần xử lý") ── */}
      {!loading && !error && activeTab === "needs_action" && (
        actionItems.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-emerald-200 bg-emerald-50/50 p-10 text-center">
            <p className="text-2xl">✅</p>
            <p className="mt-2 font-medium text-emerald-700">Mọi việc đã xong!</p>
            <p className="mt-1 text-sm text-emerald-600">Không có đơn nào cần xử lý ngay lúc này.</p>
          </div>
        ) : (
          <ActionInbox items={actionItems} updatingId={updatingId} onAction={callAction} />
        )
      )}

      {/* ── Regular tab list ── */}
      {!loading && !error && activeTab !== "needs_action" && (
        <>
          {visibleBookings.length === 0 && (
            <div className="rounded-[28px] border border-dashed border-slate-300 p-8 text-slate-500">
              {activeTab === "all" ? "Chưa có đơn đặt nào cho các chỗ ở của bạn." : "Không có đơn nào trong tab này."}
            </div>
          )}
          <div className="grid gap-5">
            {visibleBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                todayKey={todayKey}
                updatingId={updatingId}
                onAction={callAction}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ── Action Inbox ──────────────────────────────────────────────────────────

function ActionInbox({
  items,
  updatingId,
  onAction,
}: {
  items: ActionItem[];
  updatingId: string | null;
  onAction: (id: string, action: string) => void;
}) {
  return (
    <div className="space-y-8">
      {ACTION_GROUPS.map(({ order, label, dotClass }) => {
        const group = items.filter((i) => ACTION_CONFIG[i.actionType].groupOrder === order);
        if (group.length === 0) return null;
        return (
          <div key={order}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dotClass}`} />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">{label}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{group.length}</span>
            </div>
            <div className="space-y-3">
              {group.map(({ booking, actionType }) => (
                <ActionCard
                  key={booking.id}
                  booking={booking}
                  actionType={actionType}
                  updatingId={updatingId}
                  onAction={onAction}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionCard({
  booking,
  actionType,
  updatingId,
  onAction,
}: {
  booking: HostBooking;
  actionType: ActionType;
  updatingId: string | null;
  onAction: (id: string, action: string) => void;
}) {
  const cfg = ACTION_CONFIG[actionType];
  const isUpdating = updatingId === booking.id;

  return (
    <div className={`flex flex-wrap items-start gap-4 rounded-2xl border border-slate-200 border-l-4 bg-white p-4 ${cfg.borderClass}`}>
      {/* Thumbnail */}
      {booking.property?.thumbnailUrl ? (
        <div className="relative hidden h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl sm:block">
          <Image src={booking.property.thumbnailUrl} alt="" fill unoptimized sizes="96px" className="object-cover" />
        </div>
      ) : (
        <div className="hidden h-16 w-24 flex-shrink-0 rounded-xl bg-slate-100 sm:block" />
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badgeClass}`}>{cfg.badge}</span>
        </div>
        <p className="mt-1.5 font-semibold text-slate-900">{booking.guest.name}</p>
        <p className="text-sm text-slate-500">
          {booking.property?.title ?? "Chỗ nghỉ"}
          {" · "}
          {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
          {" · "}
          {booking.numGuests} khách
        </p>
        <p className="mt-1 text-xs text-slate-400">{cfg.description}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
        {actionType === "CONFIRM_BOOKING" && (
          <>
            <Button type="button" onClick={() => onAction(booking.id, "confirm")} disabled={isUpdating}>
              {isUpdating ? "..." : "Xác nhận"}
            </Button>
            <button
              type="button"
              onClick={() => onAction(booking.id, "cancel")}
              disabled={isUpdating}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Từ chối
            </button>
          </>
        )}

        {(actionType === "OVERDUE_COMPLETE" || actionType === "CHECKOUT_TODAY") && (
          <Button type="button" onClick={() => onAction(booking.id, "complete")} disabled={isUpdating}>
            {isUpdating ? "..." : "Hoàn tất"}
          </Button>
        )}

        {(actionType === "OVERDUE_COMPLETE" || actionType === "OVERDUE_CHECKIN") && (
          <button
            type="button"
            onClick={() => onAction(booking.id, "no-show")}
            disabled={isUpdating}
            className="rounded-full border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            {isUpdating ? "..." : "No-show"}
          </button>
        )}

        {actionType === "PAYMENT_PENDING" && (
          <Button type="button" onClick={() => onAction(booking.id, "payment/confirm")} disabled={isUpdating}>
            {isUpdating ? "..." : "Xác nhận đã nhận tiền"}
          </Button>
        )}

        <Link
          href={`/host/bookings/${booking.id}`}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          {actionType === "MOD_RESPONSE" ? "Xem & phản hồi →" : "Xem chi tiết →"}
        </Link>
      </div>
    </div>
  );
}

// ── Regular booking card (used in non-action tabs) ────────────────────────

function BookingCard({
  booking,
  todayKey,
  updatingId,
  onAction,
}: {
  booking: HostBooking;
  todayKey: string;
  updatingId: string | null;
  onAction: (id: string, action: string) => void;
}) {
  const statusCfg   = STATUS_CONFIG[booking.status] ?? { label: booking.status, className: "bg-slate-100 text-slate-600" };
  const isPending   = booking.status === "PENDING";
  const isConfirmed = booking.status === "CONFIRMED";
  const checkInReached  = booking.checkIn  !== null && booking.checkIn  <= todayKey;
  const checkOutReached = booking.checkOut !== null && booking.checkOut <= todayKey;
  const isUpdating  = updatingId === booking.id;
  const needsMod    = booking.pendingModification?.requesterRole === "GUEST";

  return (
    <article className={["overflow-hidden rounded-[28px] border bg-white shadow-sm", needsMod ? "border-amber-300" : "border-slate-200"].join(" ")}>
      <div className="grid md:grid-cols-[220px_1fr]">
        {booking.property?.thumbnailUrl ? (
          <div className="relative min-h-[180px]">
            <Image src={booking.property.thumbnailUrl} alt={booking.property.title} fill unoptimized sizes="(min-width: 768px) 220px, 100vw" className="object-cover" />
          </div>
        ) : (
          <div className="min-h-[180px] bg-slate-100" />
        )}

        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-emerald-700">{booking.property?.city}</p>
              <h2 className="mt-1 text-2xl font-semibold">{booking.property?.title}</h2>
              <p className="mt-1 text-slate-500">Khách: {booking.guest.name} · {booking.guest.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {needsMod && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  Cần phản hồi thay đổi
                </span>
              )}
              {booking.unreadCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                  {booking.unreadCount} tin nhắn mới
                </span>
              )}
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusCfg.className}`}>{statusCfg.label}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-4">
            <div><p className="text-slate-400">Nhận phòng</p><p className="mt-1 font-medium text-slate-800">{booking.checkIn ?? "—"}</p></div>
            <div><p className="text-slate-400">Trả phòng</p><p className="mt-1 font-medium text-slate-800">{booking.checkOut ?? "—"}</p></div>
            <div><p className="text-slate-400">Số khách</p><p className="mt-1 font-medium text-slate-800">{booking.numGuests}</p></div>
            <div><p className="text-slate-400">Tổng tiền</p><p className="mt-1 font-medium text-slate-800">{booking.totalPrice.toLocaleString("vi-VN")} ₫</p></div>
          </div>

          {booking.cancelledReason && (
            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">Lý do hủy: {booking.cancelledReason}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={`/host/bookings/${booking.id}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              {needsMod ? "Xem & phản hồi →" : "Xem chi tiết →"}
            </Link>

            {isPending && (
              <>
                <Button type="button" onClick={() => onAction(booking.id, "confirm")} disabled={isUpdating}>Xác nhận</Button>
                <button type="button" onClick={() => onAction(booking.id, "cancel")} disabled={isUpdating} className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                  Từ chối
                </button>
              </>
            )}

            {isConfirmed && checkInReached && !checkOutReached && (
              <button type="button" onClick={() => onAction(booking.id, "no-show")} disabled={isUpdating} className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
                Đánh dấu no-show
              </button>
            )}

            {isConfirmed && checkOutReached && (
              <Button type="button" onClick={() => onAction(booking.id, "complete")} disabled={isUpdating}>Hoàn tất</Button>
            )}

            {isConfirmed && (
              <button type="button" onClick={() => onAction(booking.id, "cancel")} disabled={isUpdating} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                Hủy
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ── OperationsCard ─────────────────────────────────────────────────────────

function OperationsCard({ label, value, tone }: { label: string; value: number; tone: "emerald" | "sky" }) {
  const toneClass = tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700";
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
      <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
        {value > 0 ? "Cần chuẩn bị" : "Không có lịch"}
      </span>
    </div>
  );
}
