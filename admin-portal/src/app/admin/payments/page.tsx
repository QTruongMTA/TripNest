"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Payment {
  id: string;
  fullId?: string;
  booking?: string;
  method: string;
  amount: string;
  status: string;
  paidAt?: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/payments").then((r) => setPayments(r.data.data ?? [])).finally(() => setLoading(false));
  }, []);

  return (
    <PortalShell title="Doanh thu">
      <div className="space-y-5">
        <p className="text-sm text-slate-500">{payments.length} giao dịch</p>
        {loading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
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
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-slate-400">Chưa có giao dịch.</td></tr>}
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{p.id}</td>
                    <td className="px-6 py-4 text-slate-500">{p.booking ?? "-"}</td>
                    <td className="px-6 py-4 text-slate-500">{p.method}</td>
                    <td className="px-6 py-4"><span className={`rounded px-2 py-0.5 text-xs ${p.status === "Đã thanh toán" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{p.status}</span></td>
                    <td className="px-6 py-4 text-right font-medium">{p.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
