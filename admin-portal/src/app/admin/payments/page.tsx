"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Payment {
  id: string;
  fullId: string;
  booking: string;
  bookingId: string;
  guestEmail: string;
  method: string;
  amount: string;
  rawStatus: string;
  status: string;
  paidAt: string;
}

const CONFIRMABLE = new Set(["UNPAID", "PENDING_PAYMENT"]);

const RAW_CLASS: Record<string, string> = {
  PAID: "bg-green-50 text-green-700",
  PENDING_PAYMENT: "bg-amber-50 text-amber-700",
  UNPAID: "bg-slate-100 text-slate-500",
  REFUNDED: "bg-blue-50 text-blue-700",
  PARTIALLY_REFUNDED: "bg-blue-50 text-blue-600",
  FAILED: "bg-rose-50 text-rose-700",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  function load() {
    setLoading(true);
    api.get("/admin/payments")
      .then((r) => setPayments(r.data.data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleConfirm() {
    if (!confirmId) return;
    setConfirmBusy(true);
    setConfirmError("");
    try {
      await api.patch(`/admin/payments/${confirmId}/confirm`);
      setConfirmId(null);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? "Không thể xác nhận. Thử lại.";
      setConfirmError(msg);
    } finally {
      setConfirmBusy(false);
    }
  }

  const confirmTarget = payments.find((p) => p.fullId === confirmId);

  return (
    <PortalShell title="Doanh thu">
      <div className="space-y-5">
        <p className="text-sm text-slate-500">{payments.length} giao dịch</p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Mã GD</th>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Booking</th>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Khách</th>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Phương thức</th>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Trạng thái</th>
                    <th className="px-5 py-3 text-right font-medium text-slate-500">Số tiền</th>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Ngày TT</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Chưa có giao dịch.
                      </td>
                    </tr>
                  )}
                  {payments.map((p) => (
                    <tr key={p.fullId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-5 py-4 font-mono text-xs text-slate-400">{p.id}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">{p.booking}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">{p.guestEmail}</td>
                      <td className="px-5 py-4 text-slate-500">{p.method}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RAW_CLASS[p.rawStatus] ?? "bg-slate-100 text-slate-500"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-800">{p.amount}</td>
                      <td className="px-5 py-4 text-slate-400 text-xs">{p.paidAt}</td>
                      <td className="px-5 py-4">
                        {CONFIRMABLE.has(p.rawStatus) && (
                          <button
                            onClick={() => { setConfirmId(p.fullId); setConfirmError(""); }}
                            className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700"
                          >
                            Xác nhận
                          </button>
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

      {/* Confirm modal */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-slate-800">Xác nhận đã thanh toán?</h2>
            {confirmTarget && (
              <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 space-y-0.5">
                <p><span className="font-medium">Booking:</span> {confirmTarget.booking}</p>
                <p><span className="font-medium">Khách:</span> {confirmTarget.guestEmail}</p>
                <p><span className="font-medium">Số tiền:</span> {confirmTarget.amount}</p>
              </div>
            )}
            <p className="mt-3 text-sm text-slate-500">
              Hành động này đánh dấu payment là PAID và không thể hoàn tác. Chỉ thực hiện sau khi đã xác nhận tiền thực tế đã nhận.
            </p>
            {confirmError && (
              <p className="mt-2 text-xs font-medium text-rose-600">{confirmError}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmId(null)}
                disabled={confirmBusy}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Huỷ
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirmBusy}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {confirmBusy ? "Đang xử lý…" : "Xác nhận PAID"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
