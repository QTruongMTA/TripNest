"use client";

import {
  BookingCard,
  type TravelerBooking,
} from "@/components/booking/BookingCard";
import { getAccessToken } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TravelerBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<TravelerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasNoBookings = !loading && !error && bookings.length === 0;

  function handleBookingCancelled(bookingId: string, reason: string) {
    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId
          ? { ...booking, status: "CANCELLED", cancellationReason: reason }
          : booking
      )
    );
  }

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

  return (
    <section>
      <div className="bg-emerald-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-9">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100/80">TripNest traveler</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Đặt chỗ của bạn</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">Theo dõi trạng thái, tổng tiền và lịch lưu trú cho các booking đã tạo.</p>
            </div>
            <Link
              href="/properties"
              className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50"
            >
              Tìm chỗ ở khác
            </Link>
          </div>
        </div>
      </div>

      <div className={`mx-auto max-w-6xl px-6 pt-8 ${hasNoBookings ? "pb-6" : "pb-16"}`}>
        {loading ? <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-500 shadow-sm">Đang tải booking...</p> : null}
        {error ? (
          <p className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-rose-700 shadow-sm">
            {error}
          </p>
        ) : null}

        {hasNoBookings ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Bạn chưa có booking nào</h2>
            <p className="mt-2 text-sm text-slate-600">Khám phá chỗ nghỉ phù hợp và bắt đầu chuyến đi tiếp theo.</p>
            <Link href="/properties" className="mt-5 inline-flex rounded-md bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-950">
              Tìm chỗ ở
            </Link>
          </div>
        ) : null}

        <div className="grid gap-5">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onCancelled={handleBookingCancelled} />
          ))}
        </div>
      </div>
    </section>
  );
}
