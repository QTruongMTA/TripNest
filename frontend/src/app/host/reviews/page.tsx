"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth";

type HostReview = {
  id: string;
  bookingId: string;
  rating: number;
  comment: string;
  createdAt: string;
  guest: { name: string; email: string };
  item: { id: string; title: string } | null;
};

export default function Page() {
  const [reviews, setReviews] = useState<HostReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/host/reviews`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) =>
        response.json().then((payload) => ({ ok: response.ok, payload }))
      )
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error?.message ?? "Không thể tải đánh giá.");
        setReviews(payload.data ?? []);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-teal-950/5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Đánh giá</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Phản hồi từ khách</h1>
        <p className="mt-3 text-sm text-slate-600">
          {reviews.length} đánh giá · Điểm trung bình {average ? average.toFixed(1) : "—"}/5
        </p>
      </div>

      {loading ? <p className="text-slate-500">Đang tải đánh giá...</p> : null}
      {error ? <p className="rounded-2xl bg-rose-50 p-4 text-rose-700">{error}</p> : null}
      {!loading && reviews.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Chưa có đánh giá nào từ khách đã hoàn tất lưu trú.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-950">{review.item?.title ?? "Booking"}</h2>
                <p className="mt-1 text-sm text-slate-500">{review.guest.name}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                {review.rating}/5 ★
              </span>
            </div>
            <p className="mt-4 leading-7 text-slate-700">{review.comment}</p>
            <p className="mt-3 text-xs text-slate-400">
              {new Date(review.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
