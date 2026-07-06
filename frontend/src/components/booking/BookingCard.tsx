"use client";

import { getAccessToken } from "@/lib/auth";
import { ReviewForm } from "@/components/review/ReviewForm";
import Image from "next/image";
import { useEffect, useState } from "react";

export type TravelerBooking = {
  id: string;
  type: "PROPERTY" | "TOUR";
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  paidAmount?: number;
  cancellationRefundAmount?: number | null;
  cancellationPenaltyAmount?: number | null;
  refundStatus?: string | null;
  checkIn: string | null;
  checkOut: string | null;
  tourDate: string | null;
  numGuests: number;
  totalPrice: number;
  createdAt: string;
  cancellationReason?: string | null;
  item: {
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
  CANCELLED: "Đã hủy",
  COMPLETED: "Hoàn thành",
};

const cancelReasons = [
  "Tôi muốn thay đổi thông tin đặt chỗ",
  "Tôi đã tìm được nơi khác tốt hơn",
  "Tôi không đến địa điểm này nữa",
  "Tôi chủ động hủy",
  "Lý do khác",
];

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getStatusClass(status: string) {
  if (status === "CANCELLED") return "bg-rose-50 text-rose-700";
  if (status === "CONFIRMED") return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-700";
}

function getCancellationInfo(booking: TravelerBooking) {
  const paidAmount = booking.paidAmount ?? 0;
  if (booking.paymentMethod !== "BANK_TRANSFER" || paidAmount <= 0) {
    return {
      option: "PAY_AT_PROPERTY" as const,
      refundAmount: 0,
      penaltyAmount: 0,
      isFree: true,
    };
  }

  const isDeposit = paidAmount < booking.totalPrice;
  const cutoffHours = isDeposit ? 72 : 24;
  const checkInTime = booking.checkIn ? new Date(`${booking.checkIn}T00:00:00`).getTime() : 0;
  const hoursBeforeCheckIn = (checkInTime - Date.now()) / 3600000;
  const isFree = hoursBeforeCheckIn >= cutoffHours;

  return {
    option: isDeposit ? "DEPOSIT_30" as const : "PAY_FULL" as const,
    refundAmount: isFree ? paidAmount : 0,
    penaltyAmount: isFree ? 0 : paidAmount,
    isFree,
  };
}

export function BookingCard({
  booking,
  onCancelled,
}: {
  booking: TravelerBooking;
  onCancelled?: (bookingId: string, reason: string) => void;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(cancelReasons[0]);
  const [otherReason, setOtherReason] = useState("");
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [confirmPenaltyOpen, setConfirmPenaltyOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmSeconds, setConfirmSeconds] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCancelled = booking.status === "CANCELLED";
  const canCancel = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const isOtherReason = selectedReason === "Lý do khác";
  const cancelReason = isOtherReason ? otherReason.trim() : selectedReason;
  const cancellationInfo = getCancellationInfo(booking);
  const storedPenalty = booking.cancellationPenaltyAmount ?? 0;
  const canReport = cancellationInfo.penaltyAmount > 0 || storedPenalty > 0;
  const checkOutPassed = booking.checkOut ? new Date(`${booking.checkOut}T23:59:59`).getTime() <= Date.now() : false;
  const canReview = booking.type === "PROPERTY" && (booking.status === "COMPLETED" || (booking.status === "CONFIRMED" && checkOutPassed));

  useEffect(() => {
    if (!confirmPenaltyOpen) return;
    setConfirmSeconds(5);
    const timer = window.setInterval(() => {
      setConfirmSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [confirmPenaltyOpen]);

  async function submitCancellation() {
    const accessToken = getAccessToken();
    if (!accessToken || !cancelReason) {
      setError("Vui lòng chọn hoặc nhập lý do hủy.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/bookings/${booking.id}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: cancelReason }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error?.message ?? "Không thể hủy đặt chỗ.");
        return;
      }

      onCancelled?.(booking.id, payload.data.cancellationReason ?? cancelReason);
      setCancelOpen(false);
      setConfirmPenaltyOpen(false);
      setShowCancelReason(true);
      setMessage(payload.data.refundMessage ?? "Đã hủy đặt chỗ.");
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReport() {
    const accessToken = getAccessToken();
    if (!accessToken || !cancelReason) {
      setError("Vui lòng chọn hoặc nhập lý do báo cáo.");
      return;
    }

    setReporting(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/bookings/${booking.id}/report`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: cancelReason }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error?.message ?? "Không thể gửi báo cáo.");
        return;
      }

      setCancelOpen(false);
      setMessage("Đã gửi báo cáo tới bộ phận xử lý.");
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setReporting(false);
    }
  }

  function handleCancelClick() {
    if (!cancelReason) {
      setError("Vui lòng chọn hoặc nhập lý do hủy.");
      return;
    }

    if (cancellationInfo.penaltyAmount > 0) {
      setConfirmPenaltyOpen(true);
      return;
    }

    void submitCancellation();
  }

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="grid md:grid-cols-[220px_1fr]">
        {booking.item?.thumbnailUrl ? (
          <div className="relative min-h-[180px]">
            <Image
              src={booking.item.thumbnailUrl}
              alt={booking.item.title}
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
                {booking.type === "PROPERTY" ? "Chỗ ở" : "Tour"}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">
                {booking.item?.title ?? "Booking"}
              </h2>
              <p className="mt-1 text-slate-500">
                {booking.item?.city}, {booking.item?.country}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusClass(booking.status)}`}>
              {statusLabel[booking.status] ?? booking.status}
            </span>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-4">
            <div>
              <p className="text-slate-400">Nhận phòng</p>
              <p className="mt-1 font-medium text-slate-800">{formatDate(booking.checkIn)}</p>
            </div>
            <div>
              <p className="text-slate-400">Trả phòng</p>
              <p className="mt-1 font-medium text-slate-800">{formatDate(booking.checkOut)}</p>
            </div>
            <div>
              <p className="text-slate-400">Số khách</p>
              <p className="mt-1 font-medium text-slate-800">{booking.numGuests}</p>
            </div>
            <div>
              <p className="text-slate-400">Tổng tiền</p>
              <p className="mt-1 font-medium text-slate-800">{formatMoney(booking.totalPrice)}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {canCancel ? (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="rounded-md border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                Hủy đặt chỗ
              </button>
            ) : null}
            {isCancelled && booking.cancellationReason ? (
              <button
                type="button"
                onClick={() => setShowCancelReason((current) => !current)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {showCancelReason ? "Ẩn lý do hủy" : "Xem lý do hủy"}
              </button>
            ) : null}
            {isCancelled && canReport ? (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="rounded-md border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
              >
                Báo cáo
              </button>
            ) : null}
            {canReview ? (
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-950"
              >
                Đánh giá / đánh giá lại
              </button>
            ) : null}
          </div>

          {message ? (
            <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </div>
          ) : null}

          {isCancelled && showCancelReason && booking.cancellationReason ? (
            <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {booking.cancellationReason}
            </div>
          ) : null}
        </div>
      </div>

      {cancelOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Hủy đặt chỗ</h3>
                <p className="mt-1 text-sm text-slate-500">Chọn 1 lý do bạn muốn huỷ đặt phòng</p>
              </div>
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {cancelReasons.map((reason) => (
                <label key={reason} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:border-emerald-700">
                  <input
                    type="radio"
                    name={`cancel-reason-${booking.id}`}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="h-4 w-4 accent-emerald-800"
                  />
                  {reason}
                </label>
              ))}
            </div>

            {isOtherReason ? (
              <textarea
                value={otherReason}
                onChange={(event) => setOtherReason(event.target.value)}
                rows={4}
                className="mt-4 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-800"
                placeholder="Nhập lý do"
              />
            ) : null}

            {error ? <p className="mt-3 text-sm font-medium text-rose-700">{error}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              {canReport ? (
                <button
                  type="button"
                  onClick={submitReport}
                  disabled={reporting || !cancelReason}
                  className="rounded-md border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                >
                  {reporting ? "Đang gửi..." : "Báo cáo"}
                </button>
              ) : null}
              {canCancel ? (
                <button
                  type="button"
                  onClick={handleCancelClick}
                  disabled={submitting || !cancelReason}
                  className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-950 disabled:opacity-50"
                >
                  {submitting ? "Đang hủy..." : "Hủy đặt chỗ"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {confirmPenaltyOpen ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-950">Xác nhận hủy đặt chỗ</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Bạn sẽ mất toàn bộ tiền cọc, trị giá: <span className="font-semibold text-rose-700">{formatMoney(cancellationInfo.penaltyAmount)}</span>. Bạn có chắc muốn hủy chứ?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmPenaltyOpen(false)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitCancellation}
                disabled={confirmSeconds > 0 || submitting}
                className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirmSeconds > 0 ? `Tôi chắc chắn (${confirmSeconds}s)` : submitting ? "Đang hủy..." : "Tôi chắc chắn"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reviewOpen ? (
        <ReviewForm
          bookingId={booking.id}
          title={booking.item?.title ?? "Chỗ lưu trú"}
          onClose={() => setReviewOpen(false)}
          onSubmitted={() => setMessage("Đã gửi đánh giá. Bạn có thể đánh giá lại nếu muốn cập nhật trải nghiệm.")}
        />
      ) : null}
    </article>
  );
}
