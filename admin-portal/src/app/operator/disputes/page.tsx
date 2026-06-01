"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3, X } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import type { Dispute } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-rose-50 text-rose-700",
  INVESTIGATING: "bg-amber-50 text-amber-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  ESCALATED: "bg-slate-100 text-slate-700",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Mở",
  INVESTIGATING: "Đang xác minh",
  RESOLVED: "Đã giải quyết",
  ESCALATED: "Đã chuyển Admin",
};

export default function DisputesPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "ACTIVE";
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [escalate, setEscalate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isProvince = user?.role === "OPERATOR_PROVINCE";

  const title = useMemo(() => statusFilter === "RESOLVED" ? "Tranh chấp - Đã giải quyết" : "Tranh chấp - Đang xử lý", [statusFilter]);

  function load() {
    setLoading(true);
    const params = statusFilter === "ACTIVE" ? "" : `?status=${statusFilter}`;
    api.get(`/operator/disputes${params}`)
      .then((r) => {
        const data: Dispute[] = r.data.data ?? [];
        setDisputes(statusFilter === "ACTIVE" ? data.filter((item) => item.status === "OPEN" || item.status === "INVESTIGATING") : data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!resolveModal) return;
    setSubmitting(true);
    try {
      await api.patch(`/operator/disputes/${resolveModal.id}/resolve`, { resolution, escalate });
      setResolveModal(null);
      setResolution("");
      setEscalate(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalShell title={title}>
      <div className="space-y-5">
        <div className="portal-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{disputes.length} tranh chấp</p>
            <p className="mt-1 text-xs text-slate-500">Chỉ hiển thị tranh chấp thuộc tỉnh được phân công.</p>
          </div>
          {statusFilter === "ACTIVE" ? (
            <span className="inline-flex items-center gap-1.5 rounded bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
              <Clock3 size={13} /> SLA 24h
            </span>
          ) : null}
        </div>

        {resolveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Xử lý tranh chấp</h3>
                <button onClick={() => setResolveModal(null)} aria-label="Đóng"><X size={20} className="text-slate-400" /></button>
              </div>
              <p className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{resolveModal.subject}</p>
              <form onSubmit={handleResolve} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Quyết định xử lý *</label>
                  <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} required rows={4} className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-800/20" />
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={escalate} onChange={(e) => setEscalate(e.target.checked)} className="accent-teal-800" />
                  <span className="text-sm text-slate-700">Chuyển Admin xử lý toàn hệ thống</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setResolveModal(null)} className="flex-1 rounded-md border border-slate-300 py-2 text-sm text-slate-700">Hủy</button>
                  <button type="submit" disabled={submitting || !resolution} className={`flex-1 rounded-md py-2 text-sm font-medium text-white disabled:opacity-50 ${escalate ? "bg-slate-700 hover:bg-slate-800" : "bg-teal-800 hover:bg-teal-900"}`}>
                    {submitting ? "Đang lưu..." : escalate ? "Chuyển Admin" : "Giải quyết"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" /></div> : (
          <div className="grid gap-3">
            {disputes.length === 0 && <div className="portal-card py-16 text-center text-slate-400">Không có tranh chấp trong nhóm này.</div>}
            {disputes.map((d) => (
              <div key={d.id} className="portal-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[d.status]}`}>{STATUS_LABEL[d.status] ?? d.status}</span>
                      {d.province && <span className="text-xs text-slate-400">{d.province.name}</span>}
                    </div>
                    <p className="font-medium text-slate-800">{d.subject}</p>
                    <p className="mt-1 text-sm text-slate-500">{d.description}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                      <span>Host: {d.host.email}</span>
                      <span>Guest: {d.guest.email}</span>
                    </div>
                  </div>
                  {isProvince && (d.status === "OPEN" || d.status === "INVESTIGATING") ? (
                    <button onClick={() => setResolveModal(d)} className="shrink-0 rounded-md bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100">
                      Xử lý
                    </button>
                  ) : null}
                </div>
                {d.resolution && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
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
