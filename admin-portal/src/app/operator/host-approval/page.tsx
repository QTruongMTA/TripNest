"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, X, XCircle } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import type { HostApprovalRequest } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  UNDER_REVIEW: "Đang xem xét",
};

const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
  UNDER_REVIEW: "bg-slate-100 text-slate-700",
};

export default function HostApprovalPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "PENDING";
  const [requests, setRequests] = useState<HostApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const isProvince = user?.role === "OPERATOR_PROVINCE";

  const title = useMemo(() => `Duyệt cơ sở lưu trú - ${STATUS_LABEL[status] ?? status}`, [status]);

  function load() {
    setLoading(true);
    api.get(`/operator/host-approvals?status=${status}`)
      .then((r) => setRequests(r.data.data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [status]);

  async function handleAction() {
    if (!actionId || !actionType) return;
    if (actionType === "approve") {
      await api.post(`/operator/host-approvals/${actionId}/approve`, { notes });
    } else {
      await api.post(`/operator/host-approvals/${actionId}/reject`, { notes });
    }
    setActionId(null);
    setNotes("");
    setActionType(null);
    load();
  }

  return (
    <PortalShell title={title}>
      <div className="space-y-5">
        <div className="portal-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{requests.length} hồ sơ</p>
            <p className="mt-1 text-xs text-slate-500">Operator chỉ xử lý hồ sơ thuộc tỉnh được phân công.</p>
          </div>
          <span className={`rounded px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[status] ?? "bg-slate-100 text-slate-700"}`}>
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>

        {actionId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">{actionType === "approve" ? "Phê duyệt hồ sơ" : "Từ chối hồ sơ"}</h3>
                <button onClick={() => { setActionId(null); setNotes(""); }} aria-label="Đóng">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={actionType === "approve" ? "Ghi chú, nếu cần" : "Lý do từ chối *"}
                rows={3}
                className="mb-4 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-800/20"
              />
              <div className="flex gap-3">
                <button onClick={() => { setActionId(null); setNotes(""); }} className="flex-1 rounded-md border border-slate-300 py-2 text-sm text-slate-700">Hủy</button>
                <button
                  onClick={handleAction}
                  disabled={actionType === "reject" && !notes}
                  className={`flex-1 rounded-md py-2 text-sm font-medium text-white disabled:opacity-50 ${actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
                >
                  {actionType === "approve" ? "Phê duyệt" : "Từ chối"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" /></div> : (
          <div className="grid gap-3">
            {requests.length === 0 && <div className="portal-card py-16 text-center text-slate-400">Không có hồ sơ nào trong trạng thái này.</div>}
            {requests.map((r) => (
              <div key={r.id} className="portal-card flex items-start justify-between gap-4 p-5">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status] ?? "bg-slate-100 text-slate-700"}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    {r.province && <span className="text-xs font-medium text-teal-700">{r.province.name}</span>}
                  </div>
                  <p className="font-medium text-slate-800">{r.user.email}</p>
                  <p className="text-sm text-slate-500">{r.user.phone ?? "Chưa có số điện thoại"}</p>
                  <p className="mt-1 text-xs text-slate-400">Nộp: {new Date(r.createdAt).toLocaleDateString("vi-VN")}</p>
                  {r.notes ? <p className="mt-2 text-xs text-slate-500">Ghi chú: {r.notes}</p> : null}
                </div>
                {isProvince && r.status === "PENDING" ? (
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => { setActionId(r.id); setActionType("approve"); }} className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100">
                      <CheckCircle size={14} /> Duyệt
                    </button>
                    <button onClick={() => { setActionId(r.id); setActionType("reject"); }} className="flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100">
                      <XCircle size={14} /> Từ chối
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
