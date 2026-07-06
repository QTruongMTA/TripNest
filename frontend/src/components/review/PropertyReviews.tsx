"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { PropertyDetail } from "@/types/property";

type PropertyReview = PropertyDetail["reviews"][number];

const criteriaLabels: Array<{ key: keyof PropertyReview["criteria"]; label: string }> = [
  { key: "cleanliness", label: "Sạch sẽ" },
  { key: "comfort", label: "Thoải mái" },
  { key: "location", label: "Vị trí" },
  { key: "amenities", label: "Tiện nghi" },
  { key: "value", label: "Đáng giá tiền" },
];

function mediaUrl(url: string) {
  if (!url.startsWith("/uploads")) return url;
  return `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ?? "http://localhost:5000"}${url}`;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating}/5 sao`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < Math.round(rating) ? "text-amber-400" : "text-slate-200"}>★</span>
      ))}
    </div>
  );
}

function ReviewCard({ review, compact = false }: { review: PropertyReview; compact?: boolean }) {
  return (
    <article className="h-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{review.guest.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString("vi-VN")}</p>
        </div>
        <span className="rounded-md bg-emerald-900 px-2 py-1 text-sm font-bold text-white">{review.rating.toFixed(1)}</span>
      </div>
      <div className="mt-3">
        <Stars rating={review.rating} />
      </div>
      <p className={`mt-3 text-sm leading-6 text-slate-700 ${compact ? "line-clamp-4" : ""}`}>{review.comment}</p>
      {review.images.length ? (
        <div className="mt-3 flex items-center gap-2 overflow-hidden">
          {review.images.slice(0, 3).map((image) => (
            <div key={image} className="relative h-14 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
              <Image src={mediaUrl(image)} alt="" fill unoptimized sizes="64px" className="object-cover" />
            </div>
          ))}
          {review.images.length > 3 ? <span className="text-xs font-semibold text-slate-500">+{review.images.length - 3}</span> : null}
        </div>
      ) : null}
    </article>
  );
}

export function PropertyReviews({ rating, reviews }: { rating: PropertyDetail["rating"]; reviews: PropertyDetail["reviews"] }) {
  const [page, setPage] = useState(0);
  const [allOpen, setAllOpen] = useState(false);
  const recent = useMemo(() => reviews.slice(0, 3), [reviews]);
  const score = rating.average ?? 0;

  function move(delta: number) {
    if (recent.length <= 1) return;
    setPage((current) => (current + delta + recent.length) % recent.length);
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="rounded-lg bg-emerald-50 p-5">
          <p className="text-5xl font-semibold text-emerald-950">{score ? score.toFixed(1) : "0.0"}</p>
          <div className="mt-3">
            <Stars rating={score} />
          </div>
          <p className="mt-2 text-sm text-slate-600">{rating.count ? `${rating.count} đánh giá` : "Chưa có đánh giá"}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {criteriaLabels.map((criterion) => {
            const value = rating.criteria?.[criterion.key] ?? 0;
            return (
              <div key={criterion.key}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-800">{criterion.label}</span>
                  <span className="text-slate-600">{value.toFixed(1)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-800" style={{ width: `${(value / 5) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-emerald-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-950">Đọc xem khách yêu thích điều gì nhất</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">3 đánh giá gần đây nhất được hiển thị ngang để khách đọc nhanh.</p>
          </div>
          {recent.length > 1 ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => move(-1)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label="Đánh giá trước">
                ‹
              </button>
              <button type="button" onClick={() => move(1)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label="Đánh giá sau">
                ›
              </button>
            </div>
          ) : null}
        </div>

        {recent.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recent.map((review, index) => (
              <div key={review.id} className={index === page ? "md:scale-[1.01]" : ""}>
                <ReviewCard review={review} compact />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Chưa có đánh giá chi tiết.</p>
        )}

        <button
          type="button"
          onClick={() => setAllOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-950"
        >
          <span aria-hidden>▦</span>
          Đọc tất cả đánh giá
        </button>
      </div>

      {allOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-5xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Tất cả đánh giá</h3>
                <p className="text-sm text-slate-500">{rating.count} đánh giá đã ghi nhận</p>
              </div>
              <button type="button" onClick={() => setAllOpen(false)} className="grid h-9 w-9 place-items-center rounded-md hover:bg-slate-100" aria-label="Đóng">
                ×
              </button>
            </div>
            <div className="grid max-h-[75vh] gap-4 overflow-y-auto p-5 md:grid-cols-2">
              {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
