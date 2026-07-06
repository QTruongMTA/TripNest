"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import type { Dispute } from "@/types";

type DisputeSummary = {
  total: number;
  open: number;
  investigating: number;
  escalated: number;
  resolved: number;
  overdue: number;
  highRisk: number;
  settlementHold: number;
};

type ResolveForm = {
  decision: string;
  resolution: string;
  note: string;
  refundAdjustment: string;
  payoutAdjustment: string;
  escalate: boolean;
};

const emptySummary: DisputeSummary = {
  total: 0,
  open: 0,
  investigating: 0,
  escalated: 0,
  resolved: 0,
  overdue: 0,
  highRisk: 0,
  settlementHold: 0,
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Đang xử lý",
  OPEN: "Mới tiếp nhận",
  INVESTIGATING: "Đang xác minh",
  RESOLVED: "Đã giải quyết",
  ESCALATED: "Chuyển Admin",
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-rose-50 text-rose-700 ring-rose-100",
  INVESTIGATING: "bg-amber-50 text-amber-700 ring-amber-100",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  ESCALATED: "bg-slate-100 text-slate-700 ring-slate-200",
};

const SEVERITY_BADGE: Record<string, string> = {
  LOW: "bg-slate-50 text-slate-600",
  MEDIUM: "bg-blue-50 text-blue-700",
  HIGH: "bg-orange-50 text-orange-700",
  CRITICAL: "bg-red-50 text-red-700",
};

const CATEGORY_LABEL: Record<string, string> = {
  PROPERTY_MISMATCH: "Sai mô tả / hình ảnh",
  CHECKIN_BLOCKED: "Không nhận được phòng",
  REFUND_PAYMENT: "Hoàn tiền / thanh toán",
  HOST_REPORT: "Host báo cáo khách",
  TRAVELER_REPORT: "Traveler báo cáo",
  OTHER: "Khác",
};

const DECISION_LABEL: Record<string, string> = {
  REFUND_GUEST: "Hoàn tiền cho khách",
  PARTIAL_REFUND: "Hoàn tiền một phần",
  REJECT_CLAIM: "Không chấp nhận khiếu nại",
  HOST_COMPENSATION: "Điều chỉnh payout của Host",
  WARNING_HOST: "Cảnh báo Host",
  ESCALATE_ADMIN: "Chuyển Admin quyết định",
};

function formatVnd(value?: number | null) {
  return `${Math.round(value ?? 0).toLocaleString("vi-VN")} đ`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getDisplayName(user?: { email?: string; name?: string | null; displayName?: string | null }) {
  return user?.displayName || user?.name || user?.email || "-";
}

function getNoteMessage(note: Record<string, unknown>) {
  return typeof note.message === "string" && note.message.trim() ? note.message : "Cập nhật trạng thái xử lý";
}

function getNoteAction(note: Record<string, unknown>) {
  const action = typeof note.action === "string" ? note.action : "";
  const labels: Record<string, string> = {
    START_INVESTIGATION: "Bắt đầu xác minh",
    ESCALATE: "Chuyển cấp",
    ESCALATE_ADMIN: "Chuyển Admin",
    RESOLVE: "Ra quyết định",
    REOPEN: "Mở lại",
  };
  return labels[action] ?? "Ghi chú";
}

export default function DisputesPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "ACTIVE";
  const [status, setStatus] = useState(initialStatus);
  const [category, setCategory] = useState("ALL");
  const [severity, setSeverity] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [summary, setSummary] = useState<DisputeSummary>(emptySummary);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resolveModal, setResolveModal] = useState<Dispute | null>(null);
  const [form, setForm] = useState<ResolveForm>({
    decision: "REFUND_GUEST",
    resolution: "",
    note: "",
    refundAdjustment: "",
    payoutAdjustment: "",
    escalate: false,
  });
  const isProvince = user?.role === "OPERATOR_PROVINCE";

  const selected = useMemo(
    () => disputes.find((item) => item.id === selectedId) ?? disputes[0] ?? null,
    [disputes, selectedId]
  );

  const title = status === "RESOLVED" ? "Tranh chấp - đã giải quyết" : "Tranh chấp - đang xử lý";

  function buildParams() {
    const params = new URLSearchParams();
    params.set("status", status);
    if (category !== "ALL") params.set("category", category);
    if (severity !== "ALL") params.set("severity", severity);
    params.set("sort", sort);
    return params.toString();
  }

  function load() {
    setLoading(true);
    api
      .get(`/operator/disputes?${buildParams()}`)
      .then((response) => {
        const payload = response.data.data ?? {};
        const cases: Dispute[] = payload.cases ?? [];
        setSummary(payload.summary ?? emptySummary);
        setDisputes(cases);
        setSelectedId((current) => (current && cases.some((item) => item.id === current) ? current : cases[0]?.id ?? null));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [status, category, severity, sort]);

  async function triage(dispute: Dispute, nextStatus: "INVESTIGATING" | "ESCALATED") {
    setSubmitting(true);
    try {
      await api.patch(`/operator/disputes/${dispute.id}/triage`, {
        status: nextStatus,
        note: nextStatus === "INVESTIGATING" ? "Operator bắt đầu xác minh với khách và Host." : "Vụ việc cần Admin theo dõi thêm.",
      });
      load();
    } finally {
      setSubmitting(false);
    }
  }

  function openResolveModal(dispute: Dispute, escalate = false) {
    setResolveModal(dispute);
    setForm({
      decision: escalate ? "ESCALATE_ADMIN" : dispute.category === "REFUND_PAYMENT" ? "REFUND_GUEST" : "PARTIAL_REFUND",
      resolution: "",
      note: "",
      refundAdjustment: dispute.refundAdjustment ? String(dispute.refundAdjustment) : "",
      payoutAdjustment: dispute.payoutAdjustment ? String(dispute.payoutAdjustment) : "",
      escalate,
    });
  }

  async function handleResolve(event: React.FormEvent) {
    event.preventDefault();
    if (!resolveModal) return;
    setSubmitting(true);
    try {
      await api.patch(`/operator/disputes/${resolveModal.id}/resolve`, {
        decision: form.decision,
        resolution: form.resolution,
        note: form.note,
        refundAdjustment: form.refundAdjustment ? Number(form.refundAdjustment) : undefined,
        payoutAdjustment: form.payoutAdjustment ? Number(form.payoutAdjustment) : undefined,
        escalate: form.escalate,
      });
      setResolveModal(null);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalShell title={title}>
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric icon={ShieldAlert} label="Case đang mở" value={summary.open + summary.investigating} tone="rose" />
          <Metric icon={Clock3} label="Quá SLA 24h" value={summary.overdue} tone="amber" />
          <Metric icon={AlertTriangle} label="Rủi ro cao" value={summary.highRisk} tone="orange" />
          <Metric icon={Banknote} label="Đang giữ quyết toán" value={summary.settlementHold} tone="teal" />
        </div>

        <div className="portal-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Filter size={16} />
            Bộ lọc xử lý
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Select label="Trạng thái" value={status} onChange={setStatus} options={["ACTIVE", "OPEN", "INVESTIGATING", "ESCALATED", "RESOLVED"]} labels={STATUS_LABEL} />
            <Select label="Loại vụ việc" value={category} onChange={setCategory} options={["ALL", "PROPERTY_MISMATCH", "CHECKIN_BLOCKED", "REFUND_PAYMENT", "HOST_REPORT", "TRAVELER_REPORT", "OTHER"]} labels={{ ALL: "Tất cả", ...CATEGORY_LABEL }} />
            <Select label="Mức độ" value={severity} onChange={setSeverity} options={["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"]} labels={{ ALL: "Tất cả", CRITICAL: "Khẩn cấp", HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" }} />
            <Select label="Sắp xếp" value={sort} onChange={setSort} options={["newest", "oldest", "severity"]} labels={{ newest: "Mới nhất", oldest: "Cũ nhất", severity: "Rủi ro cao trước" }} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="space-y-3">
              {disputes.length === 0 ? (
                <div className="portal-card py-16 text-center text-sm text-slate-400">Không có tranh chấp phù hợp bộ lọc.</div>
              ) : (
                disputes.map((dispute) => (
                  <button
                    key={dispute.id}
                    onClick={() => setSelectedId(dispute.id)}
                    className={`portal-card w-full p-4 text-left transition hover:border-teal-700/30 ${
                      selected?.id === dispute.id ? "ring-2 ring-teal-800/20" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge className={STATUS_BADGE[dispute.status]}>{STATUS_LABEL[dispute.status] ?? dispute.status}</Badge>
                          <Badge className={SEVERITY_BADGE[dispute.severity ?? "MEDIUM"]}>{dispute.severity ?? "MEDIUM"}</Badge>
                        </div>
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{dispute.subject}</p>
                        <p className="mt-1 text-xs text-slate-500">{CATEGORY_LABEL[dispute.category ?? "OTHER"] ?? dispute.category}</p>
                      </div>
                      <ChevronRight size={18} className="mt-1 shrink-0 text-slate-300" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <span>{dispute.bookingCode ?? dispute.booking?.code ?? "-"}</span>
                      <span className={dispute.sla?.overdue ? "font-semibold text-rose-600" : ""}>{dispute.sla?.label ?? "-"}</span>
                      <span className="truncate">Host: {getDisplayName(dispute.host)}</span>
                      <span className="truncate">Khách: {getDisplayName(dispute.guest)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {selected ? (
              <CaseDetail
                dispute={selected}
                isProvince={isProvince}
                submitting={submitting}
                onInvestigate={() => triage(selected, "INVESTIGATING")}
                onEscalate={() => openResolveModal(selected, true)}
                onResolve={() => openResolveModal(selected)}
              />
            ) : (
              <div className="portal-card flex min-h-[420px] items-center justify-center text-sm text-slate-400">
                Chọn một tranh chấp để xem hồ sơ xử lý.
              </div>
            )}
          </div>
        )}

        {resolveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 p-5">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{form.escalate ? "Chuyển Admin xử lý" : "Ra quyết định tranh chấp"}</h3>
                  <p className="mt-1 text-sm text-slate-500">{resolveModal.bookingCode ?? resolveModal.booking?.code} · {resolveModal.subject}</p>
                </div>
                <button onClick={() => setResolveModal(null)} aria-label="Đóng" className="rounded p-1 text-slate-400 hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleResolve} className="space-y-4 p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-medium text-slate-600">
                    Quyết định
                    <select
                      value={form.decision}
                      onChange={(event) => setForm((current) => ({ ...current, decision: event.target.value, escalate: event.target.value === "ESCALATE_ADMIN" }))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-800/20"
                    >
                      {Object.entries(DECISION_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Hoàn tiền đề xuất
                    <input
                      type="number"
                      min="0"
                      step="100000"
                      value={form.refundAdjustment}
                      onChange={(event) => setForm((current) => ({ ...current, refundAdjustment: event.target.value }))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-800/20"
                      placeholder="0"
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Điều chỉnh payout Host
                    <input
                      type="number"
                      step="100000"
                      value={form.payoutAdjustment}
                      onChange={(event) => setForm((current) => ({ ...current, payoutAdjustment: event.target.value }))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-800/20"
                      placeholder="0"
                    />
                  </label>
                  <label className="flex items-end gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.escalate}
                      onChange={(event) => setForm((current) => ({ ...current, escalate: event.target.checked, decision: event.target.checked ? "ESCALATE_ADMIN" : current.decision }))}
                      className="mb-1 accent-teal-800"
                    />
                    Chuyển Admin nếu vụ việc vượt quyền tỉnh
                  </label>
                </div>
                <label className="block text-xs font-medium text-slate-600">
                  Nội dung gửi khách và Host *
                  <textarea
                    value={form.resolution}
                    onChange={(event) => setForm((current) => ({ ...current, resolution: event.target.value }))}
                    required
                    rows={4}
                    className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-800/20"
                    placeholder="Tóm tắt bằng chứng đã kiểm tra và quyết định xử lý..."
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Ghi chú nội bộ
                  <textarea
                    value={form.note}
                    onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-800/20"
                    placeholder="Bằng chứng đã gọi xác minh, ảnh, thanh toán, trao đổi với Host..."
                  />
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setResolveModal(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || form.resolution.trim().length < 5}
                    className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${form.escalate ? "bg-slate-800 hover:bg-slate-900" : "bg-teal-800 hover:bg-teal-900"}`}
                  >
                    {submitting ? "Đang lưu..." : form.escalate ? "Chuyển Admin" : "Lưu quyết định"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof ShieldAlert; label: string; value: number; tone: "rose" | "amber" | "orange" | "teal" }) {
  const toneClass = {
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    orange: "bg-orange-50 text-orange-700",
    teal: "bg-teal-50 text-teal-800",
  }[tone];
  return (
    <div className="portal-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        <span className={`rounded-lg p-2 ${toneClass}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels: Record<string, string> }) {
  return (
    <label className="text-xs font-medium text-slate-600">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-800/20">
        {options.map((option) => (
          <option key={option} value={option}>{labels[option] ?? option}</option>
        ))}
      </select>
    </label>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${className ?? ""}`}>{children}</span>;
}

function CaseDetail({
  dispute,
  isProvince,
  submitting,
  onInvestigate,
  onEscalate,
  onResolve,
}: {
  dispute: Dispute;
  isProvince: boolean;
  submitting: boolean;
  onInvestigate: () => void;
  onEscalate: () => void;
  onResolve: () => void;
}) {
  const active = dispute.status === "OPEN" || dispute.status === "INVESTIGATING";
  const notes = dispute.operatorNotes ?? [];
  return (
    <div className="portal-card overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge className={STATUS_BADGE[dispute.status]}>{STATUS_LABEL[dispute.status] ?? dispute.status}</Badge>
          <Badge className={SEVERITY_BADGE[dispute.severity ?? "MEDIUM"]}>{dispute.severity ?? "MEDIUM"}</Badge>
          {dispute.sla?.overdue ? <Badge className="bg-red-50 text-red-700 ring-red-100">Quá SLA</Badge> : null}
        </div>
        <h2 className="text-xl font-semibold text-slate-950">{dispute.subject}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{dispute.description}</p>
      </div>

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5 p-5">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><FileText size={16} /> Hồ sơ booking</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Mã booking" value={dispute.booking?.code ?? dispute.bookingCode ?? "-"} />
              <Info label="Chỗ lưu trú" value={dispute.booking?.property?.title ?? "-"} />
              <Info label="Tỉnh/Thành phố" value={dispute.province?.name ?? dispute.booking?.property?.city ?? "-"} />
              <Info label="Ngày ở" value={`${formatDate(dispute.booking?.checkIn)} - ${formatDate(dispute.booking?.checkOut)}`} />
              <Info label="Khách" value={getDisplayName(dispute.guest)} helper={dispute.guest.phone ?? dispute.guest.email} />
              <Info label="Host" value={getDisplayName(dispute.host)} helper={dispute.host.phone ?? dispute.host.email} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><Banknote size={16} /> Thanh toán và settlement</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <Info label="Giá trị booking" value={formatVnd(dispute.booking?.totalPrice ?? dispute.financialImpact?.grossAmount)} />
              <Info label="Đã thanh toán" value={formatVnd(dispute.booking?.paidAmount)} helper={dispute.booking?.paymentMethodLabel} />
              <Info label="Trạng thái" value={dispute.booking?.paymentStatusLabel ?? "-"} />
              <Info label="Giữ quyết toán" value={dispute.financialImpact?.settlementHold ? "Có" : "Không"} />
              <Info label="Hoàn tiền đề xuất" value={formatVnd(dispute.refundAdjustment)} />
              <Info label="Điều chỉnh payout" value={formatVnd(dispute.payoutAdjustment)} />
            </div>
            <p className="mt-3 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-900">{dispute.financialImpact?.suggestion}</p>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><MessageSquareText size={16} /> Nhật ký xử lý</h3>
            <div className="space-y-3">
              <TimelineItem title="Tiếp nhận tranh chấp" body={`${CATEGORY_LABEL[dispute.category ?? "OTHER"] ?? dispute.category} · ${formatDate(dispute.createdAt)}`} />
              {notes.map((note, index) => (
                <TimelineItem key={index} title={getNoteAction(note)} body={getNoteMessage(note)} />
              ))}
              {dispute.resolution ? <TimelineItem title={dispute.decision ? DECISION_LABEL[dispute.decision] ?? dispute.decision : "Quyết định"} body={dispute.resolution} /> : null}
            </div>
          </section>
        </div>

        <aside className="border-t border-slate-100 bg-slate-50 p-5 xl:border-l xl:border-t-0">
          <h3 className="text-sm font-semibold text-slate-900">Quy trình Operator</h3>
          <div className="mt-4 space-y-3">
            <WorkflowStep done icon={ShieldAlert} title="Tiếp nhận" text="Khóa settlement booking liên quan." />
            <WorkflowStep done={dispute.status !== "OPEN"} icon={Clock3} title="Xác minh" text="Đối chiếu khách, Host, mô tả và thanh toán." />
            <WorkflowStep done={dispute.status === "RESOLVED" || dispute.status === "ESCALATED"} icon={ShieldCheck} title="Quyết định" text="Hoàn tiền, điều chỉnh payout hoặc chuyển Admin." />
            <WorkflowStep done={dispute.status === "RESOLVED"} icon={CheckCircle2} title="Thông báo" text="Gửi kết quả cho khách và Host." />
          </div>

          {active && isProvince ? (
            <div className="mt-6 space-y-2">
              {dispute.status === "OPEN" ? (
                <button disabled={submitting} onClick={onInvestigate} className="w-full rounded-md border border-teal-800 px-3 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-50">
                  Bắt đầu xác minh
                </button>
              ) : null}
              <button disabled={submitting} onClick={onResolve} className="w-full rounded-md bg-teal-800 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50">
                Ra quyết định xử lý
              </button>
              <button disabled={submitting} onClick={onEscalate} className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50">
                Báo cáo Admin
              </button>
            </div>
          ) : (
            <p className="mt-6 rounded-md bg-white px-3 py-2 text-sm text-slate-500">
              {dispute.status === "RESOLVED" ? "Vụ việc đã được đóng." : "Chỉ Operator tỉnh có quyền ra quyết định cuối cùng."}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value, helper }: { label: string; value: React.ReactNode; helper?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 truncate text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function TimelineItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-l-2 border-teal-800/30 pl-3">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm leading-5 text-slate-500">{body}</p>
    </div>
  );
}

function WorkflowStep({ done, icon: Icon, title, text }: { done: boolean; icon: typeof ShieldAlert; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-teal-800 text-white" : "bg-white text-slate-400"}`}>
        <Icon size={15} />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}
