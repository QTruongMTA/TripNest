"use client";

import { Button } from "@/components/ui/Button";
import { getAccessToken, getStoredUser } from "@/lib/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type HostBooking = {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paidAt: string | null;
  checkIn: string | null;
  checkOut: string | null;
  numGuests: number;
  totalPrice: number;
  notes: string | null;
  createdAt: string;
  settlement: {
    status: string;
    platformFee: number;
    hostAmount: number;
    availableAt: string;
    paidAt: string | null;
  } | null;
  guest: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  property: {
    id: string;
    title: string;
    city: string;
    country: string;
    thumbnailUrl: string | null;
  } | null;
};

const statusLabel: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  CHECKED_IN: "Đã nhận phòng",
  CANCELLED: "Đã hủy",
  COMPLETED: "Hoàn thành",
};

export default function HostBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = getAccessToken();
    const user = getStoredUser();

    if (!accessToken) {
      router.push("/login?next=/host/bookings");
      return;
    }

    if (user && user.role !== "HOST" && user.role !== "ADMIN") {
      router.push("/");
      return;
    }

    loadBookings(accessToken);
  }, [router]);

  async function loadBookings(accessToken: string) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/host/bookings`,
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

  async function updateStatus(id: string, action: "confirm" | "cancel") {
    const accessToken = getAccessToken();
    if (!accessToken) return;

    setUpdatingId(id);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/host/bookings/${id}/${action}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error?.message ?? "Không thể cập nhật booking.");
        return;
      }

      setBookings((current) =>
        current.map((booking) =>
          booking.id === id ? { ...booking, status: payload.data.status } : booking
        )
      );
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateFlow(id: string, action: "check-in" | "check-out") {
    const accessToken = getAccessToken();
    if (!accessToken) return;

    setUpdatingId(id);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/host/bookings/${id}/${action}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error?.message ?? "Không thể cập nhật booking.");
        return;
      }

      setBookings((current) =>
        current.map((booking) =>
          booking.id === id
            ? {
                ...booking,
                status: payload.data.status,
                settlement: payload.data.settlement ?? booking.settlement,
              }
            : booking
        )
      );
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">
          Host
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Đơn đặt của khách</h1>
      </div>

      {loading ? <p className="text-slate-500">Đang tải booking...</p> : null}
      {error ? (
        <p className="mb-5 rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && bookings.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 p-8 text-slate-500">
          Chưa có đơn đặt nào cho các chỗ ở của bạn.
        </div>
      ) : null}

      <div className="grid gap-5">
        {bookings.map((booking) => (
          <article
            key={booking.id}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
          >
            <div className="grid md:grid-cols-[220px_1fr]">
              {booking.property?.thumbnailUrl ? (
                <div className="relative min-h-[180px]">
                  <Image
                    src={booking.property.thumbnailUrl}
                    alt={booking.property.title}
                    fill
                    unoptimized
                    sizes="(min-width: 768px) 220px, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="min-h-[180px] bg-slate-100" />
              )}

              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-emerald-700">
                      {booking.property?.city}
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold">
                      {booking.property?.title}
                    </h2>
                    <p className="mt-1 text-slate-500">
                      Khách: {booking.guest.name} · {booking.guest.email}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                    {statusLabel[booking.status] ?? booking.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-4">
                  <div>
                    <p className="text-slate-400">Nhận phòng</p>
                    <p className="mt-1 font-medium text-slate-800">
                      {booking.checkIn ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Trả phòng</p>
                    <p className="mt-1 font-medium text-slate-800">
                      {booking.checkOut ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Số khách</p>
                    <p className="mt-1 font-medium text-slate-800">
                      {booking.numGuests}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Tổng tiền</p>
                    <p className="mt-1 font-medium text-slate-800">
                      {booking.totalPrice.toLocaleString("vi-VN")} ₫
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  <span className="rounded-full bg-slate-100 px-3 py-1">Thanh toán: {booking.paymentStatus}</span>
                  {booking.paymentMethod ? <span className="rounded-full bg-slate-100 px-3 py-1">Phương thức: {booking.paymentMethod}</span> : null}
                  {booking.settlement ? <span className="rounded-full bg-slate-100 px-3 py-1">Quyết toán: {booking.settlement.status}</span> : null}
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedId((current) => current === booking.id ? null : booking.id)}
                  className="mt-4 text-sm font-semibold text-emerald-700 hover:underline"
                >
                  {expandedId === booking.id ? "Ẩn chi tiết" : "Xem chi tiết booking"}
                </button>

                {expandedId === booking.id ? (
                  <div className="mt-4 grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <Detail label="Booking ID" value={booking.id} />
                    <Detail label="Điện thoại khách" value={booking.guest.phone ?? "Chưa cung cấp"} />
                    <Detail label="Ngày thanh toán" value={booking.paidAt ? new Date(booking.paidAt).toLocaleString("vi-VN") : "Chưa thanh toán"} />
                    <Detail label="Ghi chú" value={booking.notes || "Không có ghi chú"} />
                    <Detail label="Phí TripNest" value={booking.settlement ? `${booking.settlement.platformFee.toLocaleString("vi-VN")} ₫` : "Chưa quyết toán"} />
                    <Detail label="Host thực nhận" value={booking.settlement ? `${booking.settlement.hostAmount.toLocaleString("vi-VN")} ₫` : "Chưa quyết toán"} />
                  </div>
                ) : null}

                {booking.status === "PENDING" ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => updateStatus(booking.id, "confirm")}
                      disabled={updatingId === booking.id}
                    >
                      Xác nhận
                    </Button>
                    <button
                      type="button"
                      onClick={() => updateStatus(booking.id, "cancel")}
                      disabled={updatingId === booking.id}
                      className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Hủy
                    </button>
                  </div>
                ) : booking.status === "CONFIRMED" && booking.paymentStatus === "PAID" ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => updateFlow(booking.id, "check-in")}
                      disabled={updatingId === booking.id}
                    >
                      Check-in
                    </Button>
                  </div>
                ) : booking.status === "CHECKED_IN" ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => updateFlow(booking.id, "check-out")}
                      disabled={updatingId === booking.id}
                    >
                      Check-out
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 break-all font-medium text-slate-800">{value}</p>
    </div>
  );
}
