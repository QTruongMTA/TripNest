"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

type Review = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  guest: { name: string; email: string };
  property: { id: string; title: string; city: string } | null;
  criteria: Record<string, number>;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < rating ? "text-amber-400" : "text-slate-200"}>★</span>
      ))}
    </div>
  );
}

export default function HostReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push("/login?next=/host/reviews");
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/reviews/host`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message ?? "Không thể tải đánh giá.");
        setReviews(payload.data?.reviews ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  async function respond(review: Review) {
    const token = getAccessToken();
    if (!token) return;
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/reviews/${review.id}/respond`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json();
    const propertyId = payload.data?.propertyId ?? review.property?.id;
    if (propertyId) router.push(`/host/properties/${propertyId}`);
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg bg-emerald-950 p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100/80">Đánh giá từ khách</p>
        <h1 className="mt-2 text-3xl font-semibold">Phản hồi trải nghiệm lưu trú</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Host nhận đánh giá mới tại đây và có thể phản hồi bằng cuộc trò chuyện với khách.</p>
      </div>

      {loading ? <p className="rounded-lg bg-white p-4 text-slate-500">Đang tải đánh giá...</p> : null}
      {error ? <p className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}</p> : null}

      <div className="grid gap-4">
        {!loading && reviews.length === 0 ? <p className="rounded-lg bg-white p-6 text-center text-slate-400">Chưa có đánh giá.</p> : null}
        {reviews.map((review) => (
          <article key={review.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-950">{review.guest.name}</p>
                <p className="mt-1 text-sm text-slate-500">{review.property?.title ?? "Chỗ lưu trú"} · {new Date(review.createdAt).toLocaleDateString("vi-VN")}</p>
                <div className="mt-2"><Stars rating={review.rating} /></div>
              </div>
              <button type="button" onClick={() => respond(review)} className="inline-flex items-center gap-2 rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-950">
                <span aria-hidden>↗</span>
                Phản hồi
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">{review.comment}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
