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

export function ReviewForm({
  bookingId,
  itemTitle,
  onSubmitted,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(5);
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
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/reviews`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ bookingId, rating, comment }),
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
    <form
      onSubmit={submit}
      className="rounded-[24px] border border-emerald-200 bg-emerald-50/50 p-5"
    >
      <h3 className="text-lg font-semibold text-slate-950">
        Đánh giá {itemTitle}
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Chia sẻ trải nghiệm sau khi bạn đã trả phòng và hoàn tất thanh toán.
      </p>

      <div className="mt-4 flex gap-2" aria-label="Chọn số sao">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`text-3xl ${star <= rating ? "text-amber-400" : "text-slate-300"}`}
            aria-label={`${star} sao`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        minLength={10}
        maxLength={2000}
        required
        rows={4}
        placeholder="Điều gì khiến chuyến đi đáng nhớ? (tối thiểu 10 ký tự)"
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
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700"
        >
          Để sau
        </button>
      </div>
    </form>
  );
}
