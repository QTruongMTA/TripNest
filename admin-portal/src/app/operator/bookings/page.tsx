"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Booking {
  id: string;
  fullId: string;
  guest: string;
  guestName?: string | null;
  guestPhone?: string | null;
  item: string;
  province: string;
  date: string;
  guests: number;
  amount: string;
  status: string;
  rawStatus: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ host xác nhận",
  CONFIRMED: "Đã xác nhận",
  CHECKED_IN: "Đã nhận phòng",
  CANCELLED: "Đã hủy",
  COMPLETED: "Hoàn tất",
};

const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  CHECKED_IN: "bg-sky-50 text-sky-700",
  CANCELLED: "bg-rose-50 text-rose-700",
  COMPLETED: "bg-slate-100 text-slate-700",
};

export default function OperatorBookingsPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "PENDING";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const title = useMemo(() => `Giám sát đặt phòng - ${STATUS_LABEL[status] ?? status}`, [status]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get(`/operator/bookings?status=${status}`)
      .then((response) => setBookings(response.data.data ?? []))
      .catch((err) => setError(err.response?.data?.error?.message ?? "Không thể tải danh sách đặt phòng."))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <PortalShell title={title}>
      <div className="space-y-5">
        <div className="portal-card p-4">
          <p className="text-sm font-semibold text-slate-900">{bookings.length} đặt phòng trong địa bàn</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Operator chỉ theo dõi và hỗ trợ tranh chấp. Việc xác nhận booking thuộc trách nhiệm của host sở hữu cơ sở.
          </p>
        </div>
        {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Mã đơn</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Cơ sở</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Khách</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Ngày ở</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Trạng thái</th>
                    <th className="px-6 py-3 text-right font-medium text-slate-500">Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-400">Không có booking trong trạng thái này.</td></tr>
                  ) : null}
                  {bookings.map((booking) => (
                    <tr key={booking.fullId} className="border-b border-slate-50 last:border-0">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{booking.id}</td>
                      <td className="max-w-[240px] px-6 py-4">
                        <p className="truncate font-medium text-slate-800">{booking.item}</p>
                        <p className="mt-1 text-xs text-slate-400">{booking.province} · {booking.guests} khách</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-700">{booking.guestName ?? booking.guest}</p>
                        <p className="mt-1 text-xs text-slate-400">{booking.guestPhone ?? booking.guest}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{booking.date || "-"}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded px-2 py-0.5 text-xs ${STATUS_TONE[booking.rawStatus] ?? "bg-slate-100 text-slate-700"}`}>
                          {STATUS_LABEL[booking.rawStatus] ?? booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">{booking.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
