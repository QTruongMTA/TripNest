"use client";

import {
  BookingCard,
  type TravelerBooking,
} from "@/components/booking/BookingCard";
import { getAccessToken } from "@/lib/auth";
import { ReviewForm } from "@/components/review/ReviewForm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TravelerBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<TravelerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<Record<string, "CREDIT_CARD" | "MOMO" | "VNPAY" | "ZALOPAY">>({});

  useEffect(() => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      router.push("/login?next=/traveler/bookings");
      return;
    }

    async function loadBookings() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/bookings/mine`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        const payload = await response.json();

        if (!response.ok) {
          setError(payload.error?.message ?? "Không thể tải booking.");
          return;
        }

        setBookings(payload.data);
      } catch {
        setError("Không thể kết nối tới máy chủ.");
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, [router]);

  async function payBooking(bookingId: string) {
    const accessToken = getAccessToken();
    if (!accessToken) return;

    setPayingId(bookingId);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/bookings/${bookingId}/payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ method: paymentMethods[bookingId] ?? "CREDIT_CARD" }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error?.message ?? "Không thể thanh toán booking.");
        return;
      }

      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                paymentStatus: payload.data.status,
                paymentMethod: paymentMethods[bookingId] ?? "CREDIT_CARD",
                paymentConfirmedBy: "PAYMENT_GATEWAY",
                paidAt: payload.data.paidAt,
              }
            : booking
        )
      );
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setPayingId(null);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">
            Traveler
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Lịch sử đặt phòng</h1>
        </div>
        <Link
          href="/properties"
          className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:bg-white"
        >
          Tìm chỗ ở khác
        </Link>
      </div>

      {loading ? <p className="text-slate-500">Đang tải booking...</p> : null}
      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && bookings.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 p-8 text-slate-500">
          Bạn chưa có booking nào.
        </div>
      ) : null}

      <div className="grid gap-5">
        {bookings.map((booking) => (
          <div key={booking.id} className="space-y-3">
            <BookingCard booking={booking} />
            {booking.paymentStatus === "UNPAID" && booking.status === "CONFIRMED" ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <p className="text-sm text-sky-800">
                  Booking đã được xác nhận. Bạn có thể thanh toán online tại TripNest.
                  Nếu trả tiền mặt hoặc chuyển khoản trực tiếp tại cơ sở, host sẽ xác nhận khoản thu.
                </p>
                <select
                  value={paymentMethods[booking.id] ?? "CREDIT_CARD"}
                  onChange={(event) =>
                    setPaymentMethods((current) => ({
                      ...current,
                      [booking.id]: event.target.value as "CREDIT_CARD" | "MOMO" | "VNPAY" | "ZALOPAY",
                    }))
                  }
                  className="mt-3 rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm"
                >
                  <option value="CREDIT_CARD">Thẻ tín dụng/ghi nợ</option>
                  <option value="VNPAY">VNPay</option>
                  <option value="MOMO">MoMo</option>
                  <option value="ZALOPAY">ZaloPay</option>
                </select>
                <button
                  type="button"
                  onClick={() => payBooking(booking.id)}
                  disabled={payingId === booking.id}
                  className="mt-3 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {payingId === booking.id ? "Đang thanh toán..." : "Thanh toán online"}
                </button>
                <p className="mt-3 text-xs text-sky-700">
                  Tiền khách đã trả chỉ trở thành doanh thu TripNest sau khi host hoàn tất trả phòng.
                </p>
              </div>
            ) : null}
            {booking.canReview && reviewingId !== booking.id ? (
              <button
                type="button"
                onClick={() => setReviewingId(booking.id)}
                className="rounded-full border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                Viết đánh giá
              </button>
            ) : null}
            {reviewingId === booking.id ? (
              <ReviewForm
                bookingId={booking.id}
                itemTitle={booking.item?.title ?? "chuyến đi"}
                onCancel={() => setReviewingId(null)}
                onSubmitted={(review) => {
                  setBookings((current) =>
                    current.map((item) =>
                      item.id === booking.id
                        ? { ...item, review, canReview: false }
                        : item
                    )
                  );
                  setReviewingId(null);
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
