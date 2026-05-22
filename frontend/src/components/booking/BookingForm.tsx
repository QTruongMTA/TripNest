"use client";

import { Button } from "@/components/ui/Button";
import { getAccessToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type BookingFormProps = {
  propertyId: string;
  pricePerNight?: number;
  cleaningFee?: number | null;
  maxGuests?: number;
};

export function BookingForm({
  propertyId,
  pricePerNight,
  cleaningFee,
  maxGuests,
}: BookingFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [availabilityOk, setAvailabilityOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);
    return Math.max(
      0,
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [checkIn, checkOut]);

  const totalPreview =
    pricePerNight && nights > 0
      ? nights * pricePerNight + (cleaningFee ?? 0)
      : null;

  async function handleCheckAvailability() {
    if (!checkIn || !checkOut) {
      setMessage("Vui lòng chọn ngày nhận và trả phòng.");
      setAvailabilityOk(false);
      return;
    }

    setLoading(true);
    setMessage(null);
    setAvailabilityOk(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/availability/properties/${propertyId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
      );
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error?.message ?? "Không thể kiểm tra phòng trống.");
        return;
      }

      setAvailabilityOk(payload.data.available);
      setMessage(
        payload.data.available
          ? "Phòng còn trống cho khoảng thời gian này."
          : "Phòng không còn trống cho lựa chọn hiện tại."
      );
    } catch {
      setMessage("Không thể kết nối để kiểm tra phòng trống.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBooking() {
    const accessToken = getAccessToken();

    if (!accessToken) {
      const next = window.location.pathname;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    if (!checkIn || !checkOut) {
      setMessage("Vui lòng chọn ngày trước khi đặt phòng.");
      return;
    }

    setBookingLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/bookings/property`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            propertyId,
            checkIn,
            checkOut,
            guests,
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error?.message ?? "Không thể tạo booking.");
        return;
      }

      setMessage(
        `Đặt phòng thành công. Mã booking: ${payload.data.id.slice(-6).toUpperCase()}`
      );
      setAvailabilityOk(false);
    } catch {
      setMessage("Không thể kết nối để tạo booking.");
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,118,110,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Giá từ</p>
          <p className="mt-1 text-2xl font-semibold">
            {pricePerNight ? pricePerNight.toLocaleString("vi-VN") : "—"} ₫
            <span className="text-base font-normal text-slate-500"> / đêm</span>
          </p>
        </div>
        {cleaningFee ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Phí dọn dẹp {cleaningFee.toLocaleString("vi-VN")} ₫
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3">
        <label className="grid gap-2 text-sm">
          <span className="text-slate-500">Nhận phòng</span>
          <input
            type="date"
            value={checkIn}
            min={today}
            onChange={(event) => {
              const val = event.target.value;
              setCheckIn(val);
              if (checkOut && checkOut <= val) setCheckOut("");
              setAvailabilityOk(false);
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-slate-500">Trả phòng</span>
          <input
            type="date"
            value={checkOut}
            min={checkIn || today}
            onChange={(event) => {
              setCheckOut(event.target.value);
              setAvailabilityOk(false);
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-slate-500">Số khách</span>
          <input
            type="number"
            min={1}
            max={maxGuests}
            value={guests}
            onChange={(event) => setGuests(Number(event.target.value))}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
      </div>

      {totalPreview !== null ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>
              {pricePerNight?.toLocaleString("vi-VN")} ₫ × {nights} đêm
            </span>
            <span>{(nights * (pricePerNight ?? 0)).toLocaleString("vi-VN")} ₫</span>
          </div>
          <div className="mt-2 flex justify-between text-slate-600">
            <span>Phí dọn dẹp</span>
            <span>{(cleaningFee ?? 0).toLocaleString("vi-VN")} ₫</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-semibold">
            <span>Tổng cộng</span>
            <span>{totalPreview.toLocaleString("vi-VN")} ₫</span>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={handleCheckAvailability}
        className="mt-5 w-full py-3"
      >
        {loading ? "Đang kiểm tra..." : "Kiểm tra phòng trống"}
      </Button>

      <Button
        type="button"
        onClick={handleCreateBooking}
        className="mt-3 w-full py-3"
        disabled={!availabilityOk || bookingLoading}
      >
        {bookingLoading ? "Đang tạo booking..." : "Đặt phòng"}
      </Button>

      {message ? (
        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {message}
        </p>
      ) : null}
    </aside>
  );
}
