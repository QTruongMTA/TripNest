"use client";

import { getAccessToken } from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

type HostReview = {
  id: string;
  rating: number;
  cleanliness: number;
  comfort: number;
  location: number;
  facilities: number;
  staff: number;
  valueForMoney: number;
  comment: string;
  hostReply: string | null;
  hostRepliedAt: string | null;
  createdAt: string;
  guest: { id: string; name: string; avatar: string | null } | null;
  property: { id: string; title: string; city: string; country: string } | null;
  images: Array<{ id: string; url: string }>;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function HostReviewsPage() {
  const [reviews, setReviews] = useState<HostReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    if (reviews.length === 0) return { avg: null as number | null, unreplied: 0 };
    return {
      avg: Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)),
      unreplied: reviews.filter((r) => !r.hostReply).length,
    };
  }, [reviews]);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/reviews/host/mine`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await res.json();
      if (!res.ok) { setError(payload.error?.message ?? "Không thể tải đánh giá."); return; }
      setReviews(payload.data ?? []);
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submitReply(reviewId: string) {
    const token = getAccessToken();
    if (!token || !replyText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/reviews/${reviewId}/host-reply`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      const payload = await res.json();
      if (!res.ok) { setError(payload.error?.message ?? "Không thể gửi phản hồi."); return; }
      setReviews((items) => items.map((item) => (item.id === reviewId ? payload.data : item)));
      setReplyingId(null);
      setReplyText("");
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-teal-950/5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Đánh giá</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-950">Phản hồi từ khách</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Theo dõi đánh giá sau lưu trú, ảnh thực tế từ khách và phản hồi để tăng độ tin cậy của chỗ nghỉ.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-400">Tổng</p>
              <p className="text-xl font-semibold">{reviews.length}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-xs text-emerald-600">Điểm TB</p>
              <p className="text-xl font-semibold text-emerald-700">{summary.avg ?? "—"}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-xs text-amber-700">Chưa phản hồi</p>
              <p className="text-xl font-semibold text-amber-800">{summary.unreplied}</p>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>}
      {loading && <p className="text-slate-500">Đang tải đánh giá...</p>}

      {!loading && reviews.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-14 text-center text-slate-500">
          Chưa có đánh giá nào từ khách.
        </div>
      )}

      <div className="grid gap-4">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{review.guest?.name ?? "Khách"}</p>
                <p className="mt-0.5 text-sm text-slate-500">{review.property?.title ?? "Chỗ nghỉ"} · {formatDate(review.createdAt)}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">★ {review.rating}/5</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">{review.comment}</p>
            {review.images.length > 0 && (
              <div className="mt-4 flex gap-2 overflow-x-auto">
                {review.images.map((image) => (
                  <img key={image.id} src={image.url} alt="" className="h-24 w-32 rounded-2xl object-cover" />
                ))}
              </div>
            )}
            {review.hostReply ? (
              <div className="mt-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm">
                <p className="font-medium text-teal-800">Phản hồi của bạn</p>
                <p className="mt-1 text-teal-900">{review.hostReply}</p>
              </div>
            ) : replyingId === review.id ? (
              <div className="mt-4 space-y-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-300"
                  placeholder="Cảm ơn khách và phản hồi chuyên nghiệp..."
                />
                <div className="flex gap-2">
                  <button onClick={() => submitReply(review.id)} disabled={saving} className="rounded-full bg-teal-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {saving ? "Đang gửi..." : "Gửi phản hồi"}
                  </button>
                  <button onClick={() => { setReplyingId(null); setReplyText(""); }} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600">
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setReplyingId(review.id); setReplyText(""); }}
                className="mt-4 rounded-full border border-teal-200 px-5 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
              >
                Phản hồi đánh giá
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
