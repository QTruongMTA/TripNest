"use client";

import { getAccessToken } from "@/lib/auth";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export type BookingDispute = {
  id: string;
  status: string;
  subject: string;
  description: string;
  resolution: string | null;
  resolvedAt: string | null;
  escalatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  OPEN: { label: "Mới mở", className: "bg-rose-100 text-rose-700" },
  INVESTIGATING: { label: "Đang xác minh", className: "bg-amber-100 text-amber-800" },
  RESOLVED: { label: "Đã xử lý", className: "bg-emerald-100 text-emerald-700" },
  ESCALATED: { label: "Chuyển Admin", className: "bg-slate-100 text-slate-700" },
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  endpointPath: string;
  initialCases: BookingDispute[];
  viewerLabel: "khách" | "host";
};

export default function SupportCasePanel({ endpointPath, initialCases, viewerLabel }: Props) {
  const [cases, setCases] = useState(initialCases);
  const [openForm, setOpenForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCase = cases.find((item) => item.status === "OPEN" || item.status === "INVESTIGATING");

  async function submitCase() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}${endpointPath}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error?.message ?? "Không thể mở support case.");
        return;
      }
      setCases((items) => [payload.data, ...items]);
      setSubject("");
      setDescription("");
      setOpenForm(false);
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Support case</h2>
          <p className="mt-1 text-sm text-slate-500">
            Mở case khi cần TripNest hỗ trợ xử lý vấn đề theo booking này.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpenForm((value) => !value)}
          disabled={Boolean(activeCase)}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {activeCase ? "Đang có case mở" : openForm ? "Đóng form" : "Mở case"}
        </button>
      </div>

      {activeCase && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Booking này đang có case cần xử lý. Bạn vẫn có thể trao đổi thêm ở phần Tin nhắn bên dưới.
        </div>
      )}

      {openForm && !activeCase && (
        <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Vấn đề cần hỗ trợ</label>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={viewerLabel === "khách" ? "Ví dụ: Chỗ nghỉ không đúng mô tả" : "Ví dụ: Khách không đến nhưng yêu cầu hoàn tiền"}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Mô tả chi tiết</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Ghi rõ tình huống, thời điểm xảy ra, mong muốn xử lý..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="button"
            onClick={submitCase}
            disabled={saving || subject.trim().length < 5 || description.trim().length < 10}
            className="rounded-full bg-teal-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Đang mở case..." : "Gửi support case"}
          </button>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {cases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
            Chưa có support case nào cho booking này.
          </div>
        ) : (
          cases.map((item) => {
            const cfg = STATUS_CONFIG[item.status] ?? { label: item.status, className: "bg-slate-100 text-slate-700" };
            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.subject}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cfg.className}`}>{cfg.label}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                {item.resolution && (
                  <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <span className="font-medium">Kết quả xử lý:</span> {item.resolution}
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-400">Mở lúc {formatDateTime(item.createdAt)}</p>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
