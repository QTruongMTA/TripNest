"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Payment {
  id: string;
  fullId?: string;
  booking?: string;
  bookingId?: string;
  method: string;
  amount: string;
  status: string;
  paidAt?: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/payments")
      .then((response) => setPayments(response.data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalShell title="Giao dịch thanh toán">
      <div className="space-y-5">
        <div>
          <p className="text-sm text-slate-500">{payments.length} giao dịch</p>
          <p className="mt-1 text-xs text-slate-400">
            Đây là tiền khách đã thanh toán cho TripNest, không phải doanh thu thực nhận của từng host.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Mã GD</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Booking</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Phương thức</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Trạng thái</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Số tiền</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-400">Chưa có giao dịch.</td></tr>
                ) : null}
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-50 transition hover:bg-slate-50 last:border-0">
                    <td className="px-6 py-4">
                      <button type="button" onClick={() => setSelected(payment)} className="font-mono text-xs text-brand-600 hover:underline">
                        {payment.id}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button type="button" onClick={() => setSelected(payment)} className="text-brand-600 hover:underline">
                        {payment.booking ?? "-"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{payment.method}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded px-2 py-0.5 text-xs ${payment.status === "Đã thanh toán" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{payment.amount}</td>
                    <td className="px-6 py-4 text-right">
                      <button type="button" onClick={() => setSelected(payment)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-brand-600">Chi tiết giao dịch</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{selected.id}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100">Đóng</button>
            </div>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <Detail label="Payment ID" value={selected.fullId ?? selected.id} />
              <Detail label="Booking" value={selected.booking ?? "-"} />
              <Detail label="Booking ID" value={selected.bookingId ?? "-"} />
              <Detail label="Phương thức" value={selected.method} />
              <Detail label="Trạng thái" value={selected.status} />
              <Detail label="Ngày thanh toán" value={selected.paidAt ?? "-"} />
              <Detail label="Số tiền khách trả" value={selected.amount} prominent />
            </dl>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}

function Detail({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) {
  return (
    <div className={prominent ? "sm:col-span-2" : ""}>
      <dt className="text-slate-400">{label}</dt>
      <dd className={`mt-1 break-all ${prominent ? "text-lg font-semibold text-slate-950" : "font-medium text-slate-800"}`}>{value}</dd>
    </div>
  );
}
