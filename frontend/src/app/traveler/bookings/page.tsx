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
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </div>
    </section>
  );
}
