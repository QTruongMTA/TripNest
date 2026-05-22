"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Rule { id: string; name: string; description?: string; rate: number; listingType?: string; minBookingValue?: number; isActive: boolean; }

export default function CommissionPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/admin/commissions").then((r) => setRules(r.data.data ?? [])).finally(() => setLoading(false)); }, []);

  return (
    <PortalShell title="Hoa hồng">
      <div className="space-y-5">
        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="grid gap-4">
            {rules.map((r) => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{r.name}</p>
                  {r.description && <p className="text-sm text-slate-500 mt-0.5">{r.description}</p>}
                  <div className="flex gap-3 mt-2 text-xs text-slate-400">
                    {r.listingType && <span>Loại: {r.listingType}</span>}
                    {r.minBookingValue && <span>Tối thiểu: {Number(r.minBookingValue).toLocaleString("vi-VN")}₫</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-brand-600">{(Number(r.rate) * 100).toFixed(0)}%</p>
                  <span className={`text-xs px-2 py-0.5 rounded ${r.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>{r.isActive ? "Đang áp dụng" : "Tắt"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
