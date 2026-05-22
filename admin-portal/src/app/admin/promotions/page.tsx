"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Promo { id: string; code: string; description?: string; discountType: string; discountValue: number; usedCount: number; maxUses?: number; isActive: boolean; endDate: string; }

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/admin/promotions").then((r) => setPromos(r.data.data ?? [])).finally(() => setLoading(false)); }, []);

  return (
    <PortalShell title="Khuyến mãi">
      <div className="space-y-5">
        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Mã</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Mô tả</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Giảm giá</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Đã dùng</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">{p.code}</td>
                    <td className="px-6 py-4 text-slate-500">{p.description}</td>
                    <td className="px-6 py-4">{p.discountType === "PERCENTAGE" ? `${p.discountValue}%` : `${Number(p.discountValue).toLocaleString("vi-VN")}₫`}</td>
                    <td className="px-6 py-4 text-slate-500">{p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ""}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-xs ${p.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>{p.isActive ? "Đang hoạt động" : "Đã tắt"}</span></td>
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
