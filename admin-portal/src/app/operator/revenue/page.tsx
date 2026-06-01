"use client";
import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Payment {
  id: string;
  booking: string;
  guest: string;
  listing: string;
  province: string;
  method: string;
  amount: string;
  status: string;
  rawStatus: string;
  paidAt: string;
}

export default function OperatorRevenuePage() {
  const [data, setData] = useState<{ items: Payment[]; total: number; paidTotal: string }>({ items: [], total: 0, paidTotal: "₫0" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/operator/payments")
      .then((response) => setData(response.data.data ?? { items: [], total: 0, paidTotal: "₫0" }))
      .finally(() => setLoading(false));
  }, []);

  function exportCsv() {
    const header = ["Mã GD", "Booking", "Tỉnh", "Cơ sở", "Khách", "Phương thức", "Trạng thái", "Số tiền", "Ngày thanh toán"];
    const rows = data.items.map((item) => [item.id, item.booking, item.province, item.listing, item.guest, item.method, item.status, item.amount, item.paidAt]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "doanh-thu-tinh.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PortalShell title="Doanh thu tỉnh">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="portal-card p-5">
            <p className="text-sm text-slate-500">Tổng giao dịch</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{data.total}</p>
          </div>
          <div className="portal-card p-5 sm:col-span-2">
            <p className="text-sm text-slate-500">Doanh thu đã thanh toán trong phạm vi tỉnh</p>
            <p className="mt-2 text-3xl font-semibold text-teal-900">{data.paidTotal}</p>
          </div>
        </div>

        <div className="portal-card flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-xs text-slate-500">Operator chỉ xem số liệu của tỉnh được phân công, không cấu hình hoa hồng hoặc quy tắc doanh thu.</p>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-md border border-teal-800/20 bg-white px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50">
              <Download size={14} /> Excel
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Printer size={14} /> PDF
            </button>
          </div>
        </div>

        {loading ? <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" /></div> : (
          <div className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Mã GD</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Booking</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Tỉnh</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Cơ sở</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Trạng thái</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-slate-400">Chưa có giao dịch trong phạm vi tỉnh.</td></tr>}
                {data.items.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{payment.id}</td>
                    <td className="px-6 py-4 text-slate-500">{payment.booking}</td>
                    <td className="px-6 py-4 text-slate-500">{payment.province}</td>
                    <td className="max-w-[220px] truncate px-6 py-4 text-slate-500">{payment.listing}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded px-2 py-0.5 text-xs ${payment.rawStatus === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{payment.amount}</td>
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
