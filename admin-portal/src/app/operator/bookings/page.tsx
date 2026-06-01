"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

interface Booking {
  id: string;
  fullId: string;
  guest: string;
  guestName?: string | null;
  guestPhone?: string | null;
  item: string;
  province: string;
  type: string;
  date: string;
  guests: number;
  amount: string;
  status: string;
  rawStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  notes?: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ duyệt",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
  COMPLETED: "Hoàn tất",
};

const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-700",
  COMPLETED: "bg-slate-100 text-slate-700",
};

export default function OperatorBookingsPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "PENDING";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isProvince = user?.role === "OPERATOR_PROVINCE";

  const title = useMemo(() => `Đặt phòng trong tỉnh - ${STATUS_LABEL[status] ?? status}`, [status]);

  function load() {
    setLoading(true);
    setError(null);
    api.get(`/operator/bookings?status=${status}`)
      .then((response) => setBookings(response.data.data ?? []))
      .catch((err) => setError(err.response?.data?.error?.message ?? "Không thể tải danh sách đặt phòng."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [status]);

  async function updateStatus(booking: Booking, nextStatus: "CONFIRMED" | "CANCELLED") {
    setUpdatingId(booking.fullId);
    setError(null);
    try {
      const response = await api.patch(`/operator/bookings/${booking.fullId}/status`, { status: nextStatus });
      setBookings((current) =>
        current.map((item) =>
          item.fullId === booking.fullId
            ? {
                ...item,
                rawStatus: response.data.data.status,
                status: STATUS_LABEL[response.data.data.status] ?? response.data.data.status,
              }
            : item
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? "Không thể cập nhật đặt phòng.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <PortalShell title={title}>
      <div className="space-y-5">
        <div className="portal-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{bookings.length} đặt phòng</p>
            <p className="mt-1 text-xs text-slate-500">Danh sách được tổng hợp theo cơ sở lưu trú thuộc địa bàn phụ trách.</p>
          </div>
          <span className={`rounded px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[status] ?? "bg-slate-100 text-slate-700"}`}>
            {STATUS_LABEL[status] ?? status}
          </span>
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
                    {isProvince && status === "PENDING" ? <th className="px-6 py-3 text-right font-medium text-slate-500">Xử lý</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={isProvince && status === "PENDING" ? 7 : 6} className="py-12 text-center text-slate-400">
                        Không có đặt phòng trong trạng thái này.
                      </td>
                    </tr>
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
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">{booking.amount}</td>
                      {isProvince && status === "PENDING" ? (
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={updatingId === booking.fullId}
                              onClick={() => updateStatus(booking, "CONFIRMED")}
                              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <CheckCircle size={14} /> Duyệt
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === booking.fullId}
                              onClick={() => updateStatus(booking, "CANCELLED")}
                              className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                            >
                              <XCircle size={14} /> Hủy
                            </button>
                          </div>
                        </td>
                      ) : null}
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
