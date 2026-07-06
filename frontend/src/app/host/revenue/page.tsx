"use client";

import { getAccessToken } from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";

type RevenueRow = {
  id: string;
  code: string;
  guest: string;
  property: string;
  city: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  paymentMethod: string | null;
  grossAmount: number;
  settlementBase: number;
  transferReceived: number;
  cashCollectedByHost: number;
  refundAmount: number;
  penaltyAmount: number;
  commissionRate: number;
  commission: number;
  hostPayout: number;
  commissionReceivable: number;
  hostNet: number;
  payoutStatus: "READY_FOR_PAYOUT" | "PENDING_DISPUTE" | "REFUND_PENDING" | "REFUNDED" | "WAITING_STAY";
};

type RevenuePayload = {
  summary: {
    grossBookingValue: number;
    netHostRevenue: number;
    pendingPayout: number;
    commissionReceivable: number;
    tripNestHeld: number;
    hostCollectedDirect: number;
    totalRefund: number;
    disputedBookings: number;
    readyBookings: number;
  };
  rows: RevenueRow[];
};

const statusLabel: Record<string, string> = {
  READY_FOR_PAYOUT: "Chờ quyết toán",
  PENDING_DISPUTE: "Đang tranh chấp",
  REFUND_PENDING: "Chờ hoàn tiền",
  REFUNDED: "Đã hoàn tiền",
  WAITING_STAY: "Chờ hoàn tất lưu trú",
};

const statusClass: Record<string, string> = {
  READY_FOR_PAYOUT: "bg-emerald-50 text-emerald-700",
  PENDING_DISPUTE: "bg-amber-50 text-amber-700",
  REFUND_PENDING: "bg-rose-50 text-rose-700",
  REFUNDED: "bg-slate-100 text-slate-500",
  WAITING_STAY: "bg-blue-50 text-blue-700",
};

function money(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

function date(value: string | null) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function methodLabel(method: string | null) {
  if (method === "CASH") return "Trực tiếp";
  if (method === "BANK_TRANSFER") return "Qua QR";
  return "-";
}

export default function Page() {
  const [data, setData] = useState<RevenuePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/host/revenue`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message ?? "Không thể tải doanh thu.");
        setData(payload.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const source = data?.rows ?? [];
    if (filter === "ALL") return source;
    return source.filter((row) => row.payoutStatus === filter);
  }, [data?.rows, filter]);

  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">Đang tải doanh thu...</div>;
  }

  if (error || !data) {
    return <div className="rounded-lg border border-rose-100 bg-rose-50 p-6 text-rose-700">{error || "Không thể tải dữ liệu."}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-teal-950 text-white shadow-xl shadow-teal-950/10">
        <div className="px-6 py-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200">Settlement & Payout</p>
          <h1 className="mt-2 text-3xl font-semibold">Doanh thu Host</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-teal-50/75">
            Theo dõi tiền TripNest đang giữ, tiền Host đã thu trực tiếp, hoa hồng phải thanh toán và các booking đủ điều kiện quyết toán.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Tổng giá trị booking" value={money(data.summary.grossBookingValue)} />
        <Metric label="Host thực nhận dự kiến" value={money(data.summary.netHostRevenue)} tone="teal" />
        <Metric label="TripNest cần trả Host" value={money(data.summary.pendingPayout)} tone="amber" />
        <Metric label="Hoa hồng Host phải trả" value={money(data.summary.commissionReceivable)} tone="rose" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniMetric label="TripNest đang giữ qua QR" value={money(data.summary.tripNestHeld)} />
        <MiniMetric label="Host đã thu trực tiếp" value={money(data.summary.hostCollectedDirect)} />
        <MiniMetric label="Đã/chờ hoàn khách" value={money(data.summary.totalRefund)} />
        <MiniMetric label="Booking tranh chấp" value={`${data.summary.disputedBookings}`} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-950">Booking đối soát</h2>
            <p className="mt-1 text-sm text-slate-500">{data.summary.readyBookings} booking đang chờ quyết toán.</p>
          </div>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="READY_FOR_PAYOUT">Chờ quyết toán</option>
            <option value="WAITING_STAY">Chờ hoàn tất lưu trú</option>
            <option value="PENDING_DISPUTE">Đang tranh chấp</option>
            <option value="REFUND_PENDING">Chờ hoàn tiền</option>
            <option value="REFUNDED">Đã hoàn tiền</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
              <tr>
                <th className="px-5 py-3">Booking</th>
                <th className="px-5 py-3">Lưu trú</th>
                <th className="px-5 py-3">Thanh toán</th>
                <th className="px-5 py-3 text-right">Doanh thu tính</th>
                <th className="px-5 py-3 text-right">Hoa hồng</th>
                <th className="px-5 py-3 text-right">TripNest trả</th>
                <th className="px-5 py-3 text-right">Host phải trả</th>
                <th className="px-5 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">Không có booking trong nhóm này.</td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-950">{row.property}</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">{row.code}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.guest}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {date(row.checkIn)} - {date(row.checkOut)}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">{methodLabel(row.paymentMethod)}</p>
                    <p className="mt-1 text-xs text-slate-500">Host thu: {money(row.cashCollectedByHost)}</p>
                    <p className="mt-1 text-xs text-slate-500">QR: {money(row.transferReceived)}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-900">{money(row.settlementBase)}</td>
                  <td className="px-5 py-4 text-right text-slate-600">
                    <span className="font-semibold">{money(row.commission)}</span>
                    <span className="ml-1 text-xs text-slate-400">({Math.round(row.commissionRate * 100)}%)</span>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-teal-800">{money(row.hostPayout)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-rose-700">{money(row.commissionReceivable)}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[row.payoutStatus]}`}>
                      {statusLabel[row.payoutStatus]}
                    </span>
                    {row.refundAmount > 0 ? <p className="mt-2 text-xs text-rose-600">Refund: {money(row.refundAmount)}</p> : null}
                    {row.penaltyAmount > 0 ? <p className="mt-2 text-xs text-amber-700">Phí hủy: {money(row.penaltyAmount)}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "teal" | "amber" | "rose" }) {
  const toneClass = {
    slate: "border-slate-200 bg-white text-slate-950",
    teal: "border-teal-100 bg-teal-50 text-teal-950",
    amber: "border-amber-100 bg-amber-50 text-amber-950",
    rose: "border-rose-100 bg-rose-50 text-rose-950",
  }[tone];

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}
