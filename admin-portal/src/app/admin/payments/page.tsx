"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Payment {
  id: string; amount: number; method: string; status: string;
  transactionId?: string; paidAt?: string; createdAt: string;
  booking?: { user?: { email: string } };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/payments").then((r) => setPayments(r.data.data ?? [])).finally(() => setLoading(false));
  }, []);

  return (
    <PortalShell title="Thanh toán">
      <div className="space-y-5">
        <p className="text-sm text-slate-500">{payments.length} giao dịch</p>
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Mã GD</th>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Khách</th>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Phương thức</th>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Trạng thái</th>
                    <th className="text-right px-6 py-3 text-slate-500 font-medium">Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-12">Chưa có giao dịch.</td></tr>}
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{p.transactionId ?? p.id.slice(0,8)}</td>
                      <td className="px-6 py-4 text-slate-500">{p.booking?.user?.email ?? "-"}</td>
                      <td className="px-6 py-4 text-slate-500">{p.method}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-xs ${p.status === "PAID" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{p.status}</span></td>
                      <td className="px-6 py-4 text-right font-medium">{Number(p.amount).toLocaleString("vi-VN")}₫</td>
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
