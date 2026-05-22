"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";
import { Star } from "lucide-react";

interface Review { id: string; rating: number; comment: string; createdAt: string; user?: { email: string }; booking?: { property?: { title: string }; tour?: { title: string } }; }

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/admin/reviews").then((r) => setReviews(r.data.data ?? [])).finally(() => setLoading(false)); }, []);

  return (
    <PortalShell title="Đánh giá">
      <div className="space-y-5">
        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="grid gap-3">
            {reviews.length === 0 && <p className="text-slate-400 text-center py-12">Chưa có đánh giá.</p>}
            {reviews.map((r) => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{r.user?.email ?? "Người dùng"}</p>
                    <p className="text-xs text-slate-400">{r.booking?.property?.title ?? r.booking?.tour?.title ?? "-"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => <Star key={i} size={14} className={i < r.rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} />)}
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-2">{r.comment}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
