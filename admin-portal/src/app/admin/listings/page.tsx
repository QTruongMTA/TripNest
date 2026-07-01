"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Listing {
  id: string; title: string; city: string; status: string;
  type: string; host: { email: string }; createdAt: string;
  pricePerNight?: number;
  images?: { url: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  PENDING: "bg-amber-50 text-amber-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  SUSPENDED: "bg-red-50 text-red-700",
};

export default function ListingsPage() {
  const [data, setData] = useState<{ listings?: Listing[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/listings").then((r) => setData(r.data.data ?? {})).finally(() => setLoading(false));
  }, []);

  const listings = data.listings ?? [];

  async function updateStatus(kind: "properties", id: string, status: string) {
    await api.patch(`/admin/listings/${kind}/${id}/status`, { status });
    api.get("/admin/listings").then((r) => setData(r.data.data ?? {}));
  }

  return (
    <PortalShell title="Chá»— á»Ÿ">
      <div className="space-y-5">
        <p className="text-sm text-slate-500">{listings.length} Chá»— á»Ÿ</p>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">TÃªn</th>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Äá»‹a Ä‘iá»ƒm</th>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Loáº¡i</th>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Host</th>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Tráº¡ng thÃ¡i</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {listings.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-slate-400 py-12">KhÃ´ng cÃ³ dá»¯ liá»‡u.</td></tr>
                  )}
                  {listings.map((l) => (
                    <tr key={l.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-6 py-4 font-medium text-slate-800 max-w-[200px] truncate">{l.title}</td>
                      <td className="px-6 py-4 text-slate-500">{l.city}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{l.type}</td>
                      <td className="px-6 py-4 text-slate-500">{l.host?.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[l.status] ?? "bg-slate-100"}`}>{l.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={l.status}
                          onChange={(e) => updateStatus("properties", l.id, e.target.value)}
                          className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
                        >
                          {["PENDING","ACTIVE","INACTIVE","SUSPENDED"].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
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

