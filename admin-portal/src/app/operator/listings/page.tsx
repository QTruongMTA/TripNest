"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

interface Listing { id: string; title: string; city: string; status: string; type: string; host: { email: string }; createdAt: string; }

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  PENDING: "bg-amber-50 text-amber-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  SUSPENDED: "bg-red-50 text-red-700",
};

export default function OperatorListingsPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<{ items: Listing[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const isProvince = user?.role === "OPERATOR_PROVINCE";

  function load() {
    const params = statusFilter ? `?status=${statusFilter}` : "";
    api.get(`/operator/listings${params}`).then((r) => setData(r.data.data ?? { items: [], total: 0 })).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function updateStatus(id: string, status: string) {
    await api.patch(`/operator/listings/${id}/status`, { status });
    load();
  }

  return (
    <PortalShell title="Chỗ ở trong tỉnh">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option value="">Tất cả trạng thái</option>
            {["PENDING","ACTIVE","INACTIVE","SUSPENDED"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-sm text-slate-500">{data.total} chỗ ở</span>
        </div>

        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Tên</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Thành phố</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Host</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Trạng thái</th>
                  {isProvince && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-12">Không có chỗ ở.</td></tr>}
                {data.items.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-4 font-medium text-slate-800 max-w-[200px] truncate">{l.title}</td>
                    <td className="px-6 py-4 text-slate-500">{l.city}</td>
                    <td className="px-6 py-4 text-slate-500">{l.host?.email}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[l.status] ?? "bg-slate-100"}`}>{l.status}</span></td>
                    {isProvince && (
                      <td className="px-6 py-4 text-right">
                        <select value={l.status} onChange={(e) => updateStatus(l.id, e.target.value)} className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none">
                          {["PENDING","ACTIVE","INACTIVE","SUSPENDED"].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    )}
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
