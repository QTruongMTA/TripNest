"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CreditCard, Hotel, ReceiptText, X } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Booking {
  id: string;
  fullId: string;
  guest: string;
  item: string;
  date: string;
  amount: string;
  guestPaid: string;
  originalPrice: string;
  hostDiscount: string;
  systemDiscount: string;
  businessAmount: string;
  businessRevenue?: number;
  hostReceivable: string;
  platformFee: string;
  commissionRate: number;
  transferReceived: string;
  hostDirectReceived: string;
  cancellationRefundAmount?: number;
  cancellationRefund?: string;
  cancellationPenaltyAmount?: number;
  cancellationPenalty?: string;
  refundStatus?: string | null;
  refundedAt?: string | null;
  voucherCode?: string | null;
  voucherOwner?: "ADMIN" | "HOST" | null;
  status: string;
  rawStatus: string;
  paymentMethod: string;
  paymentStatus: string;
}

function statusClass(status: string) {
  if (status === "CONFIRMED") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "CANCELLED") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
}

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/admin/bookings")
      .then((response) => setBookings(response.data.data ?? []))
      .catch((err) => setError(err.response?.data?.error?.message ?? "Không thể tải danh sách đặt chỗ."))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const confirmed = bookings.filter((booking) => booking.rawStatus === "CONFIRMED").length;
    const revenue = bookings.reduce((sum, booking) => sum + (booking.businessRevenue ?? 0), 0);
    return { confirmed, revenue };
  }, [bookings]);

  return (
    <PortalShell title="Đặt chỗ">
      <div className="space-y-5">
        <section className="grid gap-3 md:grid-cols-3">
          <OverviewCard label="Tổng đơn chỗ ở" value={`${bookings.length}`} />
          <OverviewCard label="Đã xác nhận" value={`${stats.confirmed}`} />
          <OverviewCard label="Doanh thu DN" value={formatVnd(stats.revenue)} tone="teal" />
        </section>

        {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Danh sách đặt chỗ</h2>
                <p className="mt-1 text-xs text-slate-500">Bấm vào từng dòng để kiểm tra đối soát thanh toán.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Chỗ ở</th>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Khách</th>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Ngày lưu trú</th>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Thanh toán</th>
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Trạng thái</th>
                    <th className="px-5 py-3 text-right font-medium text-slate-500">Doanh thu DN</th>
                    <th className="px-5 py-3 text-right font-medium text-slate-500">Host nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">Chưa có đặt chỗ.</td>
                    </tr>
                  ) : null}

                  {bookings.map((booking) => (
                    <tr key={booking.fullId} onClick={() => setSelected(booking)} className="cursor-pointer border-t border-slate-50 transition hover:bg-teal-50/40">
                      <td className="px-5 py-4">
                        <p className="max-w-[260px] truncate font-semibold text-slate-900">{booking.item}</p>
                        <p className="mt-1 font-mono text-xs text-slate-400">{booking.id}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{booking.guest}</td>
                      <td className="px-5 py-4 text-slate-500">{booking.date || "-"}</td>
                      <td className="px-5 py-4 text-slate-500">{booking.paymentMethod}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass(booking.rawStatus)}`}>{booking.status}</span>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-teal-800">{booking.businessAmount}</td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-900">{booking.hostReceivable}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {selected ? (
          <BookingDialog booking={selected} onClose={() => setSelected(null)} />
        ) : null}
      </div>
    </PortalShell>
  );
}

function BookingDialog({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [refundStatus, setRefundStatus] = useState(booking.refundStatus ?? null);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!mounted) return null;

  async function markRefunded() {
    setRefunding(true);
    try {
      await api.patch(`/admin/bookings/${booking.fullId}/refunded`);
      setRefundStatus("REFUNDED");
    } finally {
      setRefunding(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-4">
      <div className="flex max-h-[calc(100dvh-32px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-teal-950 px-7 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">{booking.id}</p>
              <h2 className="mt-1 text-2xl font-semibold">{booking.guest}</h2>
              <p className="mt-1 text-sm text-white/70">{booking.item} · {booking.date || "Chưa có ngày lưu trú"}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/20 p-2 text-white/75 hover:bg-white/10 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard icon={<CreditCard size={18} />} label="Khách thanh toán" value={booking.guestPaid ?? booking.amount} />
            <SummaryCard icon={<ReceiptText size={18} />} label="Doanh thu TripNest" value={booking.businessAmount} tone="teal" />
            <SummaryCard icon={<Hotel size={18} />} label="Host nhận" value={booking.hostReceivable} />
          </div>

          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Thanh toán">
              <Detail label="Phương thức" value={booking.paymentMethod} />
              <Detail label="Trạng thái" value={booking.paymentStatus} />
              <Detail label="TripNest giữ qua QR" value={booking.transferReceived} />
              <Detail label="Host giữ qua thanh toán trực tiếp" value={booking.hostDirectReceived} />
              {booking.cancellationRefundAmount && booking.cancellationRefundAmount > 0 ? (
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Cần hoàn tiền</p>
                  <p className="mt-1 font-semibold text-amber-950">{booking.cancellationRefund}</p>
                  <button
                    type="button"
                    onClick={markRefunded}
                    disabled={refundStatus === "REFUNDED" || refunding}
                    className="mt-3 rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {refundStatus === "REFUNDED" ? "Đã hoàn tiền" : refunding ? "Đang lưu..." : "Đã hoàn tiền"}
                  </button>
                </div>
              ) : null}
            </Panel>

            <Panel title="Voucher">
              <Detail label="Mã voucher" value={booking.voucherCode ?? "Không dùng"} />
              <Detail label="Bên chịu" value={booking.voucherOwner === "ADMIN" ? "TripNest" : booking.voucherOwner === "HOST" ? "Host" : "-"} />
              <Detail label="Host chịu" value={booking.hostDiscount} />
              <Detail label="Hệ thống chịu" value={booking.systemDiscount} />
            </Panel>
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Công thức đối soát</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Detail label="Giá gốc" value={booking.originalPrice} />
              <Detail label="Giá khách thanh toán" value={booking.guestPaid ?? booking.amount} />
              <Detail label="Hoa hồng trên giá gốc" value={`${Math.round(booking.commissionRate * 100)}% · ${booking.platformFee}`} />
              <Detail label="Doanh thu doanh nghiệp" value={booking.businessAmount} highlight />
              <Detail label="Tiền Host nhận" value={booking.hostReceivable} highlight />
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}

function OverviewCard({ label, value, tone = "slate" }: { label: string; value: string; tone?: "teal" | "slate" }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tone === "teal" ? "border-teal-100 bg-teal-50" : "border-slate-100 bg-white"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === "teal" ? "text-teal-900" : "text-slate-950"}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</h3>
      <div className="mt-4 grid gap-3">{children}</div>
    </div>
  );
}

function SummaryCard({ icon, label, value, tone = "slate" }: { icon: React.ReactNode; label: string; value: string; tone?: "teal" | "slate" }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "teal" ? "border-teal-100 bg-teal-50 text-teal-950" : "border-slate-100 bg-slate-50 text-slate-950"}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Detail({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${highlight ? "border-teal-100 bg-teal-50" : "border-white bg-white"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className={`mt-1 font-semibold ${highlight ? "text-teal-900" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
