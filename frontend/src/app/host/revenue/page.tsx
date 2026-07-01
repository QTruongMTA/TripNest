"use client";

import { getAccessToken } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `Tháng ${m}/${y}`;
}

function prevMonth(month: string) {
  const parts = month.split("-").map(Number);
  const d = new Date(parts[0]!, parts[1]! - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(month: string) {
  const parts = month.split("-").map(Number);
  const d = new Date(parts[0]!, parts[1]!, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ── Types ──────────────────────────────────────────────────────────────────

type Summary = {
  totalRevenue: number;
  commission: number;
  netPayout: number;
  pendingRevenue: number;
  refundedAmount: number;
  paidBookingsCount: number;
  pendingPaymentCount: number;
  refundedCount: number;
  month: string;
};

type PayoutRecord = {
  id: string;
  status: "PENDING" | "READY" | "PAID";
  paidAt: string | null;
  month: string;
};

type PayoutHistoryItem = {
  id: string;
  month: string;
  totalRevenue: number;
  commission: number;
  refundedAmount: number;
  netPayout: number;
  status: "PENDING" | "READY" | "PAID";
  paidAt: string | null;
};

type BookingRow = {
  id: string;
  propertyTitle: string;
  guestName: string;
  checkIn: string | null;
  checkOut: string | null;
  nights: number | null;
  amount: number;
  commission: number;
  netAmount: number;
  paymentStatus: "PAID" | "PENDING_PAYMENT" | "REFUNDED" | "PARTIALLY_REFUNDED";
  paidAt: string | null;
  refundAmount?: number;
  transferReference: string | null;
};

// ── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, color,
}: {
  label: string; value: string; sub?: string;
  color: "teal" | "orange" | "emerald" | "amber" | "rose";
}) {
  const ring = { teal: "border-teal-200 bg-teal-50", orange: "border-orange-200 bg-orange-50", emerald: "border-emerald-200 bg-emerald-50", amber: "border-amber-200 bg-amber-50", rose: "border-rose-200 bg-rose-50" };
  const text = { teal: "text-teal-700", orange: "text-orange-700", emerald: "text-emerald-700", amber: "text-amber-700", rose: "text-rose-700" };
  return (
    <div className={`rounded-2xl border p-5 ${ring[color]}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${text[color]}`}>{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

const PAYOUT_STATUS_CONFIG = {
  PENDING: { label: "Đang tích lũy", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  READY: { label: "Sẵn sàng chi trả", bg: "bg-teal-100", text: "text-teal-700", dot: "bg-teal-500" },
  PAID: { label: "Đã thanh toán", bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
} as const;

function PayoutBadge({ status }: { status: "PENDING" | "READY" | "PAID" }) {
  const c = PAYOUT_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function TransactionBadge({ status }: { status: BookingRow["paymentStatus"] }) {
  const map = {
    PAID: "bg-emerald-100 text-emerald-700",
    PENDING_PAYMENT: "bg-amber-100 text-amber-700",
    REFUNDED: "bg-rose-100 text-rose-700",
    PARTIALLY_REFUNDED: "bg-orange-100 text-orange-700",
  };
  const labels = {
    PAID: "Đã thanh toán",
    PENDING_PAYMENT: "Chờ xác nhận",
    REFUNDED: "Đã hoàn tiền",
    PARTIALLY_REFUNDED: "Hoàn 1 phần",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [payout, setPayout] = useState<PayoutRecord | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [history, setHistory] = useState<PayoutHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated or not HOST
  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace("/login"); return; }
    if (user && user.role !== "HOST") { router.replace("/"); }
  }, [user, router]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${API}/host/revenue?month=${month}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/host/payouts`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([r1, r2]) => {
        if (!r1.ok) throw new Error("Không thể tải dữ liệu doanh thu.");
        const [p1, p2] = await Promise.all([r1.json(), r2.ok ? r2.json() : Promise.resolve({ data: [] })]);
        setSummary(p1.data.summary);
        setPayout(p1.data.payout ?? null);
        setBookings(p1.data.bookings);
        setHistory(p2.data ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [month]);

  const isCurrentMonth = month === currentMonth();

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Tài chính</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">Báo cáo doanh thu</h1>
        </div>

        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <button type="button" onClick={() => setMonth(prevMonth(month))}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100"
            aria-label="Tháng trước">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="min-w-[130px] text-center text-sm font-semibold text-slate-700">{monthLabel(month)}</span>
          <button type="button" onClick={() => setMonth(nextMonth(month))} disabled={isCurrentMonth}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
            aria-label="Tháng sau">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : summary ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <SummaryCard label="Tổng thu" value={fmt(summary.totalRevenue)}
              sub={`${summary.paidBookingsCount} booking đã TT`} color="teal" />
            <SummaryCard label="Hoa hồng nền tảng" value={fmt(summary.commission)}
              sub={summary.totalRevenue > 0 ? `${((summary.commission / summary.totalRevenue) * 100).toFixed(0)}% doanh thu` : undefined}
              color="orange" />
            <SummaryCard label="Thực nhận" value={fmt(summary.netPayout)} sub="Sau HH & hoàn tiền" color="emerald" />
            <SummaryCard label="Chờ xác nhận" value={fmt(summary.pendingRevenue)}
              sub={`${summary.pendingPaymentCount} booking đang chờ`} color="amber" />
            <SummaryCard label="Đã hoàn tiền" value={fmt(summary.refundedAmount)}
              sub={summary.refundedCount > 0 ? `${summary.refundedCount} giao dịch` : "Không có"} color="rose" />
          </div>

          {/* Payout statement card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Sao kê kỳ thanh toán</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{monthLabel(month)}</p>
              </div>
              {payout ? <PayoutBadge status={payout.status} /> : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-400">Chưa có dữ liệu</span>
              )}
            </div>

            <div className="mt-5 divide-y divide-slate-100">
              <div className="flex justify-between py-2.5 text-sm">
                <span className="text-slate-500">Doanh thu booking đã thanh toán</span>
                <span className="font-medium text-slate-800">{fmt(summary.totalRevenue)}</span>
              </div>
              <div className="flex justify-between py-2.5 text-sm">
                <span className="text-slate-500">Hoa hồng nền tảng</span>
                <span className="font-medium text-orange-600">-{fmt(summary.commission)}</span>
              </div>
              {summary.refundedAmount > 0 && (
                <div className="flex justify-between py-2.5 text-sm">
                  <span className="text-slate-500">Hoàn tiền khách</span>
                  <span className="font-medium text-rose-600">-{fmt(summary.refundedAmount)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 text-base font-bold">
                <span className="text-slate-800">Thực nhận</span>
                <span className={summary.netPayout >= 0 ? "text-emerald-700" : "text-rose-700"}>
                  {fmt(summary.netPayout)}
                </span>
              </div>
            </div>

            {payout?.status === "PAID" && payout.paidAt && (
              <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                Đã chuyển khoản vào ngày {fmtDate(payout.paidAt)}.
              </p>
            )}
            {payout?.status === "READY" && (
              <p className="mt-3 rounded-xl bg-teal-50 px-4 py-2 text-sm text-teal-700">
                Kỳ thanh toán đã đóng. Đang chờ TripNest chuyển khoản.
              </p>
            )}
            {payout?.status === "PENDING" && (
              <p className="mt-3 rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-500">
                Tháng đang diễn ra — số liệu cập nhật theo thời gian thực.
              </p>
            )}
          </div>

          {/* Transaction table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-semibold text-slate-700">
                Giao dịch — {monthLabel(month)}
                {summary.pendingPaymentCount > 0 && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                    +{summary.pendingPaymentCount} chờ xác nhận
                  </span>
                )}
              </p>
              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-400">{bookings.length} giao dịch</p>
                <button type="button" onClick={() => window.print()}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                  In trang
                </button>
              </div>
            </div>

            {bookings.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-slate-400">Chưa có giao dịch nào trong {monthLabel(month)}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">Chỗ nghỉ / Khách</th>
                      <th className="px-4 py-3">Check-in → out</th>
                      <th className="px-4 py-3 text-right">Giá trị</th>
                      <th className="px-4 py-3 text-right">Hoa hồng</th>
                      <th className="px-4 py-3 text-right">Thực nhận</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Ngày TT / mã CK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((row) => {
                      const isRefunded = row.paymentStatus === "REFUNDED" || row.paymentStatus === "PARTIALLY_REFUNDED";
                      return (
                        <tr key={row.id}
                          className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/60 ${isRefunded ? "opacity-70" : ""}`}>
                          <td className="px-5 py-3.5">
                            <Link href={`/host/bookings/${row.id}`}
                              className="font-medium text-slate-800 hover:text-teal-700">
                              {row.propertyTitle}
                            </Link>
                            <p className="mt-0.5 text-xs text-slate-400">{row.guestName}</p>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {fmtDate(row.checkIn)} → {fmtDate(row.checkOut)}
                            {row.nights ? <span className="ml-1.5 text-xs text-slate-400">{row.nights}đ</span> : null}
                          </td>
                          <td className={`px-4 py-3.5 text-right font-medium ${isRefunded ? "text-rose-500 line-through" : "text-slate-800"}`}>
                            {fmt(row.amount)}
                            {isRefunded && row.refundAmount != null && (
                              <p className="text-xs text-rose-500 no-underline" style={{ textDecoration: "none" }}>
                                -{fmt(row.refundAmount)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right text-orange-600">
                            {isRefunded ? "—" : `-${fmt(row.commission)}`}
                          </td>
                          <td className={`px-4 py-3.5 text-right font-semibold ${isRefunded ? "text-rose-600" : "text-emerald-700"}`}>
                            {isRefunded ? `-${fmt(row.refundAmount ?? row.amount)}` : fmt(row.netAmount)}
                          </td>
                          <td className="px-4 py-3.5">
                            <TransactionBadge status={row.paymentStatus} />
                          </td>
                          <td className="px-4 py-3.5">
                            {row.paidAt ? (
                              <span className="text-slate-500">{fmtDate(row.paidAt)}</span>
                            ) : row.transferReference ? (
                              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                                {row.transferReference}
                              </code>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {summary.paidBookingsCount > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold text-slate-700">
                        <td className="px-5 py-3" colSpan={2}>Tổng {monthLabel(month)}</td>
                        <td className="px-4 py-3 text-right">{fmt(summary.totalRevenue)}</td>
                        <td className="px-4 py-3 text-right text-orange-600">-{fmt(summary.commission)}</td>
                        <td className="px-4 py-3 text-right text-emerald-700">{fmt(summary.netPayout)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400">
            * Hoa hồng tính theo tỷ lệ từng chỗ nghỉ (mặc định 15%). Booking chờ xác nhận không tính vào tổng thu.
            Hoàn tiền lấy theo <code className="rounded bg-slate-100 px-1">refundedAt</code> hoặc ngày cập nhật booking nếu chưa có.
          </p>
        </>
      ) : null}

      {/* Payout history */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-semibold text-slate-700">Lịch sử kỳ thanh toán</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Kỳ</th>
                  <th className="px-4 py-3 text-right">Doanh thu</th>
                  <th className="px-4 py-3 text-right">Hoa hồng</th>
                  <th className="px-4 py-3 text-right">Hoàn tiền</th>
                  <th className="px-4 py-3 text-right">Thực nhận</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ngày TT</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}
                    className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                    onClick={() => setMonth(row.month)}>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{monthLabel(row.month)}</td>
                    <td className="px-4 py-3.5 text-right text-slate-700">{fmt(Number(row.totalRevenue))}</td>
                    <td className="px-4 py-3.5 text-right text-orange-600">-{fmt(Number(row.commission))}</td>
                    <td className="px-4 py-3.5 text-right text-rose-600">
                      {Number(row.refundedAmount) > 0 ? `-${fmt(Number(row.refundedAmount))}` : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">{fmt(Number(row.netPayout))}</td>
                    <td className="px-4 py-3.5"><PayoutBadge status={row.status} /></td>
                    <td className="px-4 py-3.5 text-slate-500">{fmtDate(row.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
