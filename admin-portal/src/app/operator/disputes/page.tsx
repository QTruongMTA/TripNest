"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import type { Dispute } from "@/types";
import { X } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-50 text-red-700",
  INVESTIGATING: "bg-amber-50 text-amber-700",
  RESOLVED: "bg-green-50 text-green-700",
  ESCALATED: "bg-purple-50 text-purple-700",
};

export default function DisputesPage() {
  const { user } = useAuthStore();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [escalate, setEscalate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isProvince = user?.role === "OPERATOR_PROVINCE";

  function load() {
    api.get("/operator/disputes").then((r) => setDisputes(r.data.data ?? [])).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!resolveModal) return;
    setSubmitting(true);
    try {
      await api.patch(`/operator/disputes/${resolveModal.id}/resolve`, { resolution, escalate });
      setResolveModal(null); setResolution(""); setEscalate(false);
      load();
    } finally { setSubmitting(false); }
  }

  return (
    <PortalShell title="Tranh chấp">
      <div className="space-y-5">
        <p className="text-sm text-slate-500">{disputes.length} tranh chấp</p>

        {resolveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Xử lý tranh chấp</h3>
                <button onClick={() => setResolveModal(null)}><X size={20} className="text-slate-400" /></button>
              </div>
              <p className="text-sm text-slate-600 mb-4 bg-slate-50 rounded-lg px-3 py-2">{resolveModal.subject}</p>
              <form onSubmit={handleResolve} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Quyết định xử lý *</label>
                  <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} required rows={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={escalate} onChange={(e) => setEscalate(e.target.checked)} className="accent-red-600" />
                  <span className="text-sm text-slate-700">Leo thang lên Admin</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setResolveModal(null)} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm">Hủy</button>
                  <button type="submit" disabled={submitting || !resolution} className={`flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50 ${escalate ? "bg-purple-600 hover:bg-purple-700" : "bg-brand-600 hover:bg-brand-700"}`}>
                    {submitting ? "Đang lưu..." : escalate ? "Leo thang" : "Giải quyết"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="grid gap-3">
            {disputes.length === 0 && <div className="text-center text-slate-400 py-16 bg-white rounded-xl border border-slate-100">Không có tranh chấp nào.</div>}
            {disputes.map((d) => (
              <div key={d.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[d.status]}`}>{d.status}</span>
                      {d.province && <span className="text-xs text-slate-400">{d.province.name}</span>}
                    </div>
                    <p className="font-medium text-slate-800">{d.subject}</p>
                    <p className="text-sm text-slate-500 mt-1">{d.description}</p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      <span>Host: {d.host.email}</span>
                      <span>Guest: {d.guest.email}</span>
                    </div>
                  </div>
                  {isProvince && (d.status === "OPEN" || d.status === "INVESTIGATING") && (
                    <button onClick={() => setResolveModal(d)} className="flex-shrink-0 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-100">
                      Xử lý
                    </button>
                  )}
                </div>
                {d.resolution && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500">Quyết định: {d.resolution}</p>
                    {d.resolver && <p className="text-xs text-slate-400">Bởi: {d.resolver.email}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
