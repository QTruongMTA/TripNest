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
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/admin/bookings")
      .then((response) => setBookings(response.data.data ?? []))
      .catch((err) =>
        setError(err.response?.data?.error?.message ?? "KhÃ´ng thá»ƒ táº£i danh sÃ¡ch Ä‘áº·t phÃ²ng.")
      )
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(booking: Booking, status: "CONFIRMED" | "CANCELLED") {
    setUpdatingId(booking.fullId);
    setError(null);

    try {
      const response = await api.patch(`/admin/bookings/${booking.fullId}/status`, { status });
      setBookings((current) =>
        current.map((item) =>
          item.fullId === booking.fullId
            ? {
                ...item,
                rawStatus: response.data.data.status,
                status: status === "CONFIRMED" ? "ÄÃ£ xÃ¡c nháº­n" : "ÄÃ£ há»§y",
              }
            : item
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? "KhÃ´ng thá»ƒ cáº­p nháº­t Ä‘áº·t phÃ²ng.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <PortalShell title="Äáº·t chá»—">
      <div className="space-y-5">
        <p className="text-sm text-slate-500">{bookings.length} Ä‘áº·t chá»—</p>
        {error ? (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : null}

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
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Chá»— á»Ÿ</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">KhÃ¡ch</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">NgÃ y</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Tráº¡ng thÃ¡i</th>
                    <th className="px-6 py-3 text-right font-medium text-slate-500">Tá»•ng tiá»n</th>
                    <th className="px-6 py-3 text-right font-medium text-slate-500">Duyá»‡t</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        ChÆ°a cÃ³ Ä‘áº·t chá»—.
                      </td>
                    </tr>
                  ) : null}

                  {bookings.map((booking) => (
                    <tr key={booking.fullId} className="border-b border-slate-50 last:border-0">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{booking.id}</td>
                      <td className="px-6 py-4 text-slate-700">{booking.item}</td>
                      <td className="px-6 py-4 text-slate-500">{booking.guest}</td>
                      <td className="px-6 py-4 text-slate-500">{booking.date || "-"}</td>
                      <td className="px-6 py-4">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">{booking.amount}</td>
                      <td className="px-6 py-4">
                        {booking.rawStatus === "PENDING" ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={updatingId === booking.fullId}
                              onClick={() => updateStatus(booking, "CONFIRMED")}
                              className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
                            >
                              Duyá»‡t
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === booking.fullId}
                              onClick={() => updateStatus(booking, "CANCELLED")}
                              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              Há»§y
                            </button>
                          </div>
                        ) : (
                          <span className="block text-right text-xs text-slate-400">-</span>
                        )}
                      </td>
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

