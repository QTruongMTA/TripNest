"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import type { HostApprovalRequest } from "@/types";
import { CheckCircle, XCircle, X } from "lucide-react";

export default function HostApprovalPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<HostApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const isProvince = user?.role === "OPERATOR_PROVINCE";

  function load() {
    api.get("/operator/host-approvals?status=PENDING").then((r) => setRequests(r.data.data ?? [])).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAction() {
    if (!actionId || !actionType) return;
    if (actionType === "approve") {
      await api.post(`/operator/host-approvals/${actionId}/approve`, { notes });
    } else {
      await api.post(`/operator/host-approvals/${actionId}/reject`, { notes });
    }
    setActionId(null); setNotes(""); setActionType(null);
    load();
  }

  return (
    <PortalShell title="Duyệt Host">
      <div className="space-y-5">
        <p className="text-sm text-slate-500">{requests.length} hồ sơ chờ duyệt</p>

        {/* Confirm modal */}
        {actionId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">{actionType === "approve" ? "Phê duyệt Host" : "Từ chối Host"}</h3>
                <button onClick={() => { setActionId(null); setNotes(""); }}><X size={20} className="text-slate-400" /></button>
              </div>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder={actionType === "approve" ? "Ghi chú (tuỳ chọn)" : "Lý do từ chối *"}
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => { setActionId(null); setNotes(""); }} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm">Hủy</button>
                <button
                  onClick={handleAction}
                  disabled={actionType === "reject" && !notes}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50 ${actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
                >
                  {actionType === "approve" ? "Phê duyệt" : "Từ chối"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="grid gap-3">
            {requests.length === 0 && <div className="text-center text-slate-400 py-16 bg-white rounded-xl border border-slate-100">Không có hồ sơ nào chờ duyệt.</div>}
            {requests.map((r) => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-800">{r.user.email}</p>
                  <p className="text-sm text-slate-500">{r.user.email} {r.user.phone && `• ${r.user.phone}`}</p>
                  {r.province && <p className="text-xs text-brand-600 mt-1">{r.province.name}</p>}
                  <p className="text-xs text-slate-400 mt-1">Nộp: {new Date(r.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
                {isProvince && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => { setActionId(r.id); setActionType("approve"); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm hover:bg-emerald-100">
                      <CheckCircle size={14} /> Duyệt
                    </button>
                    <button onClick={() => { setActionId(r.id); setActionType("reject"); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100">
                      <XCircle size={14} /> Từ chối
                    </button>
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
