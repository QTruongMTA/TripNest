"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";
import { Building2, CheckSquare, AlertCircle, ClipboardList, MapPin } from "lucide-react";

export default function OperatorReportsPage() {
  const [data, setData] = useState<{
    provinces?: { id: string; name: string }[];
    stats?: { totalListings?: number; pendingListings?: number; pendingApprovals?: number; openDisputes?: number; activeTasks?: number };
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/operator/dashboard").then((r) => setData(r.data.data ?? {})).finally(() => setLoading(false));
  }, []);

  const stats = data.stats ?? {};

  return (
    <PortalShell title="Báo cáo Tỉnh">
      <div className="space-y-6">
        {data.provinces && (
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin size={16} className="text-slate-400" />
            {data.provinces.map((p) => <span key={p.id} className="px-2.5 py-0.5 bg-brand-50 text-brand-700 rounded-full text-xs">{p.name}</span>)}
          </div>
        )}

        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Tổng chỗ ở", value: stats.totalListings ?? 0, icon: <Building2 size={20} />, color: "text-blue-500" },
              { label: "Chờ duyệt listing", value: stats.pendingListings ?? 0, icon: <ClipboardList size={20} />, color: "text-amber-500" },
              { label: "Hồ sơ Host chờ", value: stats.pendingApprovals ?? 0, icon: <CheckSquare size={20} />, color: "text-emerald-500" },
              { label: "Tranh chấp đang mở", value: stats.openDisputes ?? 0, icon: <AlertCircle size={20} />, color: "text-red-500" },
              { label: "Nhiệm vụ đang chạy", value: stats.activeTasks ?? 0, icon: <ClipboardList size={20} />, color: "text-violet-500" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className={`mb-3 ${s.color}`}>{s.icon}</div>
                <p className="text-3xl font-bold text-slate-800">{s.value}</p>
                <p className="text-sm text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
