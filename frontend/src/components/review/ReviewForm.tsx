"use client";

import { useState } from "react";
import { getAccessToken } from "@/lib/auth";

type ReviewFormProps = {
  bookingId: string;
  itemTitle: string;
  onSubmitted: (review: {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
  }) => void;
  onCancel: () => void;
};

const criteria = [
  ["cleanlinessRating", "Vệ sinh"],
  ["locationRating", "Vị trí"],
  ["serviceRating", "Phục vụ"],
  ["valueRating", "Giá trị"],
] as const;

type Ratings = Record<(typeof criteria)[number][0], number>;

export function ReviewForm({
  bookingId,
  itemTitle,
  onSubmitted,
  onCancel,
}: ReviewFormProps) {
  const [ratings, setRatings] = useState<Ratings>({
    cleanlinessRating: 5,
    locationRating: 5,
    serviceRating: 5,
    valueRating: 5,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1"}/reviews`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ bookingId, ...ratings, comment }),
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error?.message ?? "Không thể gửi đánh giá.");
        return;
      }
      onSubmitted(payload.data);
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[24px] border border-emerald-200 bg-emerald-50/50 p-5">
      <h3 className="text-lg font-semibold text-slate-950">Đánh giá {itemTitle}</h3>
      <p className="mt-1 text-sm text-slate-600">
        Chấm điểm từng tiêu chí để phản ánh chính xác trải nghiệm của bạn.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {criteria.map(([key, label]) => (
          <div key={key} className="rounded-2xl border border-emerald-100 bg-white p-4">
            <p className="font-medium text-slate-800">{label}</p>
            <div className="mt-2 flex gap-1" aria-label={`Chấm điểm ${label}`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatings((current) => ({ ...current, [key]: star }))}
                  className={`text-2xl ${star <= ratings[key] ? "text-amber-400" : "text-slate-300"}`}
                  aria-label={`${label}: ${star} sao`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        minLength={10}
        maxLength={2000}
        required
        rows={4}
        placeholder="Chia sẻ trải nghiệm của bạn (tối thiểu 10 ký tự)"
        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
      />
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-4 flex gap-3">
        <button
          type="submit"
          disabled={submitting || comment.trim().length < 10}
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Đang gửi..." : "Gửi đánh giá"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700">
          Để sau
        </button>
      </div>
    </form>
  );
}
