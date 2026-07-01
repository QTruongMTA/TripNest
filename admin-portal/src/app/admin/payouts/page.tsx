"use client";
import { useEffect, useRef, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Payout {
  id: string;
  hostEmail: string;
  hostName: string;
  month: string;
  totalRevenueF: string;
  commissionF: string;
  refundedAmountF: string;
  netPayout: number;
  netPayoutF: string;
  adjustmentAmount: number;
  adjustmentAmountF: string | null;
  adjustmentReason: string | null;
  effectivePayoutF: string;
  status: "PENDING" | "READY" | "PAID";
  paidAt: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Tháng hiện tại",
  READY: "Sẵn sàng",
  PAID: "Đã thanh toán",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  READY: "bg-amber-50 text-amber-700",
  PAID: "bg-green-50 text-green-700",
};

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState<Payout | null>(null);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  const amountInputRef = useRef<HTMLInputElement>(null);

  function loadPayouts() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterMonth) params.set("month", filterMonth);
    api
      .get(`/admin/payouts?${params.toString()}`)
      .then((r) => setPayouts(r.data.data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPayouts();
  }, [filterStatus, filterMonth]);

  async function handleConfirm(id: string) {
    setConfirmBusy(true);
    try {
      await api.patch(`/admin/payouts/${id}/confirm`);
      setConfirmId(null);
      loadPayouts();
    } finally {
      setConfirmBusy(false);
    }
  }

  function openAdjust(p: Payout) {
    setAdjustTarget(p);
    setAdjAmount(p.adjustmentAmount !== 0 ? String(p.adjustmentAmount) : "");
    setAdjReason(p.adjustmentReason ?? "");
    setAdjustError("");
    setTimeout(() => amountInputRef.current?.focus(), 50);
  }

  async function handleAdjust() {
    if (!adjustTarget) return;
    const num = Number(adjAmount);
    if (!adjAmount.trim() || !Number.isFinite(num)) {
      setAdjustError("Nhập số tiền hợp lệ (dương = thêm, âm = trừ).");
      return;
    }
    if (!adjReason.trim()) {
      setAdjustError("Vui lòng nhập lý do điều chỉnh.");
      return;
    }
    setAdjustBusy(true);
    setAdjustError("");
    try {
      await api.patch(`/admin/payouts/${adjustTarget.id}/adjust`, {
        adjustmentAmount: num,
        adjustmentReason: adjReason.trim(),
        allowPaid: adjustTarget.status === "PAID",
      });
      setAdjustTarget(null);
      loadPayouts();
    } catch {
      setAdjustError("Không thể lưu điều chỉnh. Thử lại.");
    } finally {
      setAdjustBusy(false);
    }
  }

  const readyCount = payouts.filter((p) => p.status === "READY").length;

  return (
    <PortalShell title="Payout Host">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">{payouts.length} payout statement</p>
            {readyCount > 0 && (
              <p className="mt-0.5 text-xs font-medium text-amber-700">
                {readyCount} payout sẵn sàng chờ xác nhận thanh toán
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">Tháng hiện tại</option>
              <option value="READY">Sẵn sàng thanh toán</option>
              <option value="PAID">Đã thanh toán</option>
            </select>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Table */}
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
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Host</th>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Tháng</th>
                    <th className="px-5 py-3 text-right font-medium text-slate-500">Doanh thu</th>
                    <th className="px-5 py-3 text-right font-medium text-slate-500">Hoa hồng</th>
                    <th className="px-5 py-3 text-right font-medium text-slate-500">Hoàn tiền</th>
                    <th className="px-5 py-3 text-right font-medium text-slate-500">Net payout</th>
                    <th className="px-5 py-3 text-right font-medium text-slate-500">Điều chỉnh</th>
                    <th className="px-5 py-3 text-right font-medium text-slate-500 text-teal-700">Thực trả</th>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Trạng thái</th>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Ngày trả</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {payouts.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        Chưa có payout statement nào.
                      </td>
                    </tr>
                  )}
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">{p.hostName}</div>
                        <div className="text-xs text-slate-400">{p.hostEmail}</div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-600">{p.month}</td>
                      <td className="px-5 py-4 text-right text-slate-600">{p.totalRevenueF}</td>
                      <td className="px-5 py-4 text-right text-rose-600">{p.commissionF}</td>
                      <td className="px-5 py-4 text-right text-slate-400">{p.refundedAmountF}</td>
                      <td className="px-5 py-4 text-right font-medium text-slate-800">{p.netPayoutF}</td>
                      <td className="px-5 py-4 text-right">
                        {p.adjustmentAmount !== 0 ? (
                          <span
                            title={p.adjustmentReason ?? ""}
                            className={`cursor-help text-xs font-medium ${p.adjustmentAmount > 0 ? "text-green-600" : "text-rose-600"}`}
                          >
                            {p.adjustmentAmount > 0 ? "+" : "−"}
                            {p.adjustmentAmountF}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-teal-700">{p.effectivePayoutF}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {p.status === "READY" && (
                            <button
                              onClick={() => setConfirmId(p.id)}
                              className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700"
                            >
                              Xác nhận trả
                            </button>
                          )}
                          <button
                            onClick={() => openAdjust(p)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Điều chỉnh
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirm PAID modal */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-slate-800">Xác nhận đã thanh toán?</h2>
            <p className="mt-2 text-sm text-slate-500">
              Hành động này đánh dấu payout là PAID và không thể hoàn tác qua hệ thống. Chỉ thực hiện sau khi đã chuyển tiền thực tế cho host.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmId(null)}
                disabled={confirmBusy}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Huỷ
              </button>
              <button
                onClick={() => handleConfirm(confirmId)}
                disabled={confirmBusy}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {confirmBusy ? "Đang xử lý…" : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust modal */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-slate-800">Điều chỉnh payout</h2>
            <p className="mt-1 text-sm text-slate-500">
              {adjustTarget.hostName} · tháng {adjustTarget.month} · Net: {adjustTarget.netPayoutF}
            </p>
            {adjustTarget.status === "PAID" && (
              <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                Payout này đã được đánh dấu <strong>Đã thanh toán</strong>. Điều chỉnh sẽ ghi nhận vào record nhưng không tạo kỳ bù trừ tự động. Lý do bắt buộc phải ghi rõ.
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Số tiền điều chỉnh (VND) — âm để trừ, dương để cộng
                </label>
                <input
                  ref={amountInputRef}
                  type="number"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="VD: -500000 hoặc 200000"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Lý do điều chỉnh
                </label>
                <textarea
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  rows={3}
                  placeholder="VD: Hoàn tiền sau khi payout đã PAID tháng 05/2026"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              {adjustError && (
                <p className="text-xs font-medium text-rose-600">{adjustError}</p>
              )}
              {adjAmount && Number.isFinite(Number(adjAmount)) && (
                <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">
                  Thực trả sau điều chỉnh:{" "}
                  <span className="font-semibold">
                    ₫{(Number(adjustTarget.netPayout) + Number(adjAmount)).toLocaleString("vi-VN")}
                  </span>
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setAdjustTarget(null)}
                disabled={adjustBusy}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Huỷ
              </button>
              <button
                onClick={handleAdjust}
                disabled={adjustBusy}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {adjustBusy ? "Đang lưu…" : "Lưu điều chỉnh"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
