"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Star } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

type Review = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  guest: { name: string; email: string };
  property: { title: string; city: string } | null;
  adminReportedAt: string | null;
  adminReportNote: string | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} size={14} className={index < rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"} />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState<Review | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/reviews/admin?sort=${sort}`).then((response) => setReviews(response.data.data?.reviews ?? [])).finally(() => setLoading(false));
  }, [sort]);

  async function report() {
    if (!reporting || note.trim().length < 5) return;
    await api.post(`/reviews/${reporting.id}/report`, { note });
    setReviews((current) => current.map((review) => review.id === reporting.id ? { ...review, adminReportedAt: new Date().toISOString(), adminReportNote: note } : review));
    setReporting(null);
    setNote("");
  }

  return (
    <PortalShell title="Đánh giá">
      <div className="space-y-5">
        <section className="rounded-lg bg-emerald-950 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/80">Admin Review Center</p>
          <h2 className="mt-2 text-3xl font-semibold">Tất cả đánh giá TripNest</h2>
        </section>

        <div className="flex flex-wrap gap-2">
          {[
            ["recent", "Gần đây"],
            ["low", "Thấp đến cao"],
            ["high", "Cao đến thấp"],
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setSort(key)} className={`rounded-md px-4 py-2 text-sm font-semibold ${sort === key ? "bg-emerald-900 text-white" : "bg-white text-slate-600"}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-900 border-t-transparent" /></div> : (
          <div className="grid gap-3">
            {reviews.length === 0 ? <p className="py-12 text-center text-slate-400">Chưa có đánh giá.</p> : null}
            {reviews.map((review) => (
              <article key={review.id} className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{review.guest.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{review.property?.title ?? "-"} · {review.property?.city ?? ""}</p>
                    <div className="mt-2"><Stars rating={review.rating} /></div>
                  </div>
                  <button type="button" onClick={() => setReporting(review)} className="inline-flex items-center gap-2 rounded-md border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                    <AlertTriangle size={15} />
                    Báo cáo operator
                  </button>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{review.comment}</p>
                {review.adminReportNote ? <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Đã báo cáo: {review.adminReportNote}</p> : null}
              </article>
            ))}
          </div>
        )}

        {reporting ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
              <h3 className="text-xl font-semibold text-slate-950">Báo cáo đánh giá cho operator</h3>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} className="mt-4 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-800" placeholder="Nội dung cần operator xử lý..." />
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setReporting(null)} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold">Đóng</button>
                <button type="button" onClick={report} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white">Gửi báo cáo</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PortalShell>
  );
}
