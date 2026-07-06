"use client";

import { useState } from "react";
import { getAccessToken } from "@/lib/auth";

const criteria = [
  { key: "cleanliness", label: "Sạch sẽ" },
  { key: "comfort", label: "Thoải mái" },
  { key: "location", label: "Vị trí" },
  { key: "amenities", label: "Tiện nghi" },
  { key: "value", label: "Đáng giá tiền" },
] as const;

type CriteriaKey = typeof criteria[number]["key"];

function RatingInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const score = index + 1;
        return (
          <button key={score} type="button" onClick={() => onChange(score)} className="text-amber-400" aria-label={`${score} sao`}>
            <span className={score <= value ? "text-2xl text-amber-400" : "text-2xl text-slate-200"}>★</span>
          </button>
        );
      })}
    </div>
  );
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ReviewForm({ bookingId, title, onClose, onSubmitted }: { bookingId: string; title: string; onClose: () => void; onSubmitted?: () => void }) {
  const [rating, setRating] = useState(5);
  const [scores, setScores] = useState<Record<CriteriaKey, number>>({
    cleanliness: 5,
    comfort: 5,
    location: 5,
    amenities: 5,
    value: 5,
  });
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const token = getAccessToken();
    if (!token) {
      setError("Vui lòng đăng nhập lại để đánh giá.");
      return;
    }
    if (comment.trim().length < 10) {
      setError("Vui lòng viết ít nhất 10 ký tự.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const images = await Promise.all(files.slice(0, 5).map(async (file) => ({ name: file.name, dataUrl: await readFileAsDataUrl(file) })));
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/reviews`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, rating, comment, criteria: scores, images }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error?.message ?? "Không thể gửi đánh giá.");
        return;
      }
      onSubmitted?.();
      onClose();
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-6">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">Đánh giá lưu trú</h3>
            <p className="mt-1 text-sm text-slate-500">{title}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md hover:bg-slate-100" aria-label="Đóng">
            ×
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Điểm tổng thể</p>
            <RatingInput value={rating} onChange={setRating} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {criteria.map((item) => (
              <div key={item.key} className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-sm font-medium text-slate-700">{item.label}</p>
                <RatingInput value={scores[item.key]} onChange={(value) => setScores((current) => ({ ...current, [item.key]: value }))} />
              </div>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={5}
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-800 focus:ring-4 focus:ring-emerald-100"
            placeholder="Chia sẻ trải nghiệm thực tế của bạn..."
          />

          <label className="block rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Upload ảnh đánh giá</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))}
              className="mt-3 block w-full text-sm"
            />
            {files.length ? <span className="mt-2 block text-xs text-emerald-700">{files.length} ảnh đã chọn</span> : null}
          </label>

          {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Đóng
            </button>
            <button type="button" onClick={submit} disabled={submitting} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-950 disabled:opacity-50">
              {submitting ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
