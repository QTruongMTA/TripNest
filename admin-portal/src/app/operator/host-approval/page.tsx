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
  const focusRequestId = searchParams.get("request");
  const [requests, setRequests] = useState<HostApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const isProvince = user?.role === "OPERATOR_PROVINCE";

  const title = useMemo(() => `Hồ sơ host - ${STATUS_LABEL[status] ?? status}`, [status]);

  function load() {
    setLoading(true);
    api
      .get(`/operator/host-approvals?status=${status}`)
      .then((r) => setRequests(r.data.data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [status]);

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
            <p className="mt-1 text-xs text-slate-500">Operator duyệt theo từng hồ sơ host, kèm snapshot thông tin để đối chiếu nhanh.</p>
          </div>
          <span className={`rounded px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[status] ?? "bg-slate-100 text-slate-700"}`}>
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>

        {actionId ? (
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
                <button onClick={() => { setActionId(null); setNotes(""); }} className="flex-1 rounded-md border border-slate-300 py-2 text-sm text-slate-700">
                  Hủy
                </button>
                <button
                  onClick={handleAction}
                  disabled={actionType === "reject" && !notes.trim()}
                  className={`flex-1 rounded-md py-2 text-sm font-medium text-white disabled:opacity-50 ${
                    actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {actionType === "approve" ? "Phê duyệt" : "Từ chối"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-3">
            {requests.length === 0 ? (
              <div className="portal-card py-16 text-center text-slate-500">
                <p>Không có hồ sơ host độc lập trong trạng thái này.</p>
                <p className="mt-2 text-sm text-slate-400">
                  Với TripNest, operator xem hồ sơ host ngay trong từng cơ sở chờ duyệt.
                </p>
                <a href="/operator/listings?status=PENDING&view=approval" className="mt-5 inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                  Về danh sách cơ sở
                </a>
              </div>
            ) : null}
            {requests.map((r) => {
              const isFocused = focusRequestId === r.id;
              return (
                <div
                  key={r.id}
                  className={`portal-card p-5 transition ${isFocused ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-[#f7fbfa]" : ""}`}
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status] ?? "bg-slate-100 text-slate-700"}`}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                        {r.province ? <span className="text-xs font-medium text-teal-700">{r.province.name}</span> : null}
                        {r.documents?.source ? <span className="text-xs text-slate-400">{r.documents.source}</span> : null}
                      </div>
                      <p className="font-medium text-slate-800">{r.user.email}</p>
                      <p className="text-sm text-slate-500">{r.user.phone ?? "Chưa có số điện thoại"}</p>
                      <p className="mt-1 text-xs text-slate-400">Nộp: {new Date(r.createdAt).toLocaleDateString("vi-VN")}</p>
                      {r.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{r.notes}</p> : null}

                      <div className="mt-4 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2">
                        <p><span className="font-medium text-slate-800">Tên hiển thị:</span> {r.documents?.profile?.displayName ?? "Chưa có"}</p>
                        <p><span className="font-medium text-slate-800">Điện thoại:</span> {r.documents?.profile?.phone ?? "Chưa có"}</p>
                        <p><span className="font-medium text-slate-800">Địa chỉ:</span> {r.documents?.profile?.address ?? "Chưa có"}</p>
                        <p><span className="font-medium text-slate-800">Quốc tịch:</span> {r.documents?.profile?.nationality ?? "Việt Nam"}</p>
                      </div>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Cơ sở gần nhất</p>
                      {r.documents?.latestProperty ? (
                        <div className="mt-2 space-y-1">
                          <p className="font-medium text-slate-900">{r.documents.latestProperty.title}</p>
                          <p className="text-slate-500">{r.documents.latestProperty.city}</p>
                          <p className="text-slate-500">
                            {r.documents.latestProperty.legalEntityType === "BUSINESS" ? "Doanh nghiệp" : "Cá nhân"}
                            {r.documents.latestProperty.ownerAlias ? ` · ${r.documents.latestProperty.ownerAlias}` : ""}
                          </p>
                          {r.documents.latestProperty.owners?.length ? (
                            <p className="text-xs text-slate-500">
                              Chủ sở hữu: {r.documents.latestProperty.owners.map((owner) => `${owner.firstName} ${owner.lastName}`).join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-2 text-slate-500">Chưa có snapshot cơ sở đính kèm.</p>
                      )}
                    </div>
                  </div>

                  {isProvince && r.status === "PENDING" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setActionId(r.id);
                          setActionType("approve");
                        }}
                        className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircle size={14} /> Duyệt
                      </button>
                      <button
                        onClick={() => {
                          setActionId(r.id);
                          setActionType("reject");
                        }}
                        className="flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
                      >
                        <XCircle size={14} /> Từ chối
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
