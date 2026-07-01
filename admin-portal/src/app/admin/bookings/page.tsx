"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Booking {
  id: string;
  fullId: string;
  guest: string;
  item: string;
  type: string;
  date: string;
  amount: string;
  status: string;
  rawStatus: string;
  paymentMethod: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/admin/bookings")
      .then((response) => setBookings(response.data.data ?? []))
      .catch((err) => setError(err.response?.data?.error?.message ?? "Không thể tải danh sách đặt phòng."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalShell title="Giám sát đặt chỗ">
      <div className="space-y-5">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
          Admin theo dõi toàn hệ thống nhưng không duyệt booking thông thường. Booking đặt tức thì được hệ thống
          tự xác nhận; booking theo yêu cầu phải do đúng host sở hữu cơ sở xác nhận hoặc từ chối.
        </div>
        <p className="text-sm text-slate-500">{bookings.length} đặt chỗ</p>
        {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">ID</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Chỗ ở / Tour</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Khách</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Ngày</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Trạng thái</th>
                    <th className="px-6 py-3 text-right font-medium text-slate-500">Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-400">Chưa có đặt chỗ.</td></tr>
                  ) : null}
                  {bookings.map((booking) => (
                    <tr key={booking.fullId} className="border-b border-slate-50 last:border-0">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{booking.id}</td>
                      <td className="px-6 py-4 text-slate-700">{booking.item}</td>
                      <td className="px-6 py-4 text-slate-500">{booking.guest}</td>
                      <td className="px-6 py-4 text-slate-500">{booking.date || "-"}</td>
                      <td className="px-6 py-4">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{booking.status}</span>
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
