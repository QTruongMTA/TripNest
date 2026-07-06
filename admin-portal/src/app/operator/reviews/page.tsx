"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

type Review = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  guest: { name: string };
  property: { title: string; city: string } | null;
};

type Ranking = {
  propertyId: string;
  title: string;
  city: string;
  count: number;
  average: number;
};

function Stars({ rating }: { rating: number }) {
  return <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, index) => <Star key={index} size={14} className={index < Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"} />)}</div>;
}

export default function OperatorReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/reviews/operator?sort=${sort}`).then((response) => {
      setReviews(response.data.data?.recent ?? []);
      setRankings(response.data.data?.rankings ?? []);
    }).finally(() => setLoading(false));
  }, [sort]);

  return (
    <PortalShell title="Đánh giá">
      <div className="space-y-5">
        <section className="rounded-lg bg-emerald-950 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/80">Province Review Desk</p>
          <h2 className="mt-2 text-3xl font-semibold">Đánh giá theo địa bàn</h2>
        </section>

        <div className="flex flex-wrap gap-2">
          {[
            ["recent", "Gần đây"],
            ["low", "Thấp đến cao"],
            ["high", "Cao đến thấp"],
            ["many", "Nhiều nhất"],
            ["few", "Ít nhất"],
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setSort(key)} className={`rounded-md px-4 py-2 text-sm font-semibold ${sort === key ? "bg-emerald-900 text-white" : "bg-white text-slate-600"}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-900 border-t-transparent" /></div> : (
          <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <section className="portal-card p-5">
              <h3 className="text-xl font-semibold text-slate-950">Đánh giá gần đây</h3>
              <div className="mt-4 grid gap-3">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-lg border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{review.property?.title ?? "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">{review.guest.name} · {new Date(review.createdAt).toLocaleDateString("vi-VN")}</p>
                      </div>
                      <Stars rating={review.rating} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{review.comment}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="portal-card p-5">
              <h3 className="text-xl font-semibold text-slate-950">Xếp loại</h3>
              <div className="mt-4 space-y-3">
                {rankings.map((item) => (
                  <div key={item.propertyId} className="rounded-lg border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.city} · {item.count} đánh giá</p>
                      </div>
                      <span className="rounded-md bg-emerald-900 px-2 py-1 text-sm font-bold text-white">{item.average.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
