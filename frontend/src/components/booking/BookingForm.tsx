"use client";

import { Button } from "@/components/ui/Button";
import { getAccessToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type PaymentOption = "PAY_AT_PROPERTY" | "DEPOSIT_30" | "PAY_FULL";

type BookingFormProps = {
  propertyId: string;
  pricePerNight?: number;
  cleaningFee?: number | null;
  maxGuests?: number;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: string;
  messageAction?: ReactNode;
};

const paymentOptions: Array<{ value: PaymentOption; title: string; note: string }> = [
  {
    value: "PAY_AT_PROPERTY",
    title: "Thanh toán khi nhận phòng",
    note: "Thay đổi miễn phí trước 7 ngày từ ngày nhận phòng, sau 7 ngày tính thêm phụ phí 25% giá trị đơn.",
  },
  {
    value: "DEPOSIT_30",
    title: "Thanh toán trước 30%",
    note: "Hủy và thay đổi miễn phí trước 3 ngày từ ngày nhận phòng, sau 3 ngày tính thêm phụ phí 30% giá trị đơn.",
  },
  {
    value: "PAY_FULL",
    title: "Thanh toán toàn bộ",
    note: "Hủy và thay đổi miễn phí trước 24 giờ, sau 24 giờ không được hoàn tiền.",
  },
];

function formatCurrency(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function addDaysIso(value: string, days: number) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function getMissingDateMessage(checkIn: string, checkOut: string) {
  if (!checkIn && !checkOut) return "Vui lòng chọn ngày nhận phòng hoặc trả phòng.";
  if (!checkIn) return "Vui lòng chọn ngày nhận phòng.";
  if (!checkOut) return "Vui lòng chọn ngày trả phòng.";
  if (checkOut <= checkIn) return "Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 ngày.";
  return null;
}

function getQrUrl(amount: number) {
  const bankId = process.env.NEXT_PUBLIC_VIETQR_BANK_ID;
  const accountNo = process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NO;
  if (!bankId || !accountNo || amount <= 0) return null;

  const accountName = process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME ?? "TRIPNEST";
  const params = new URLSearchParams({
    amount: String(Math.round(amount)),
    accountName,
  });

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?${params.toString()}`;
}

export function BookingForm({
  propertyId,
  pricePerNight,
  cleaningFee,
  maxGuests,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  messageAction,
}: BookingFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const initialGuestCount = Number(initialGuests);
  const [checkIn, setCheckIn] = useState(initialCheckIn ?? "");
  const [checkOut, setCheckOut] = useState(initialCheckOut ?? "");
  const [guests, setGuests] = useState(Number.isInteger(initialGuestCount) && initialGuestCount > 0 ? initialGuestCount : 1);
  const [message, setMessage] = useState<string | null>(null);
  const [availabilityPricing, setAvailabilityPricing] = useState<{
    nights: number;
    stayPrice: number;
    cleaningFee: number;
    totalPrice: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showPaymentBox, setShowPaymentBox] = useState(false);
  const [paymentOption, setPaymentOption] = useState<PaymentOption>("PAY_AT_PROPERTY");
  const [notes, setNotes] = useState("");
  const cameFromDatedSearch = Boolean(initialCheckIn && initialCheckOut);
  const minCheckOut = checkIn ? addDaysIso(checkIn, 1) : addDaysIso(today, 1);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);
    return Math.max(0, (end.getTime() - start.getTime()) / 86400000);
  }, [checkIn, checkOut]);

  const totalPreview =
    availabilityPricing?.totalPrice ??
    (pricePerNight && nights > 0 ? nights * pricePerNight + (cleaningFee ?? 0) : null);
  const stayPreview = availabilityPricing?.stayPrice ?? nights * (pricePerNight ?? 0);
  const feePreview = availabilityPricing?.cleaningFee ?? (cleaningFee ?? 0);
  const depositAmount = totalPreview ? Math.round(totalPreview * 0.3) : 0;
  const transferAmount = paymentOption === "DEPOSIT_30" ? depositAmount : paymentOption === "PAY_FULL" ? totalPreview ?? 0 : 0;
  const qrUrl = getQrUrl(transferAmount);

  function showMessage(nextMessage: string, alert = true) {
    setMessage(nextMessage);
    if (alert) window.alert(nextMessage);
    window.setTimeout(() => setMessage((current) => (current === nextMessage ? null : current)), 4500);
  }

  function resetAvailability() {
    setAvailabilityPricing(null);
    setShowPaymentBox(false);
  }

  async function checkAvailability(options?: { silent?: boolean; alertWhenAvailable?: boolean }) {
    const missingDateMessage = getMissingDateMessage(checkIn, checkOut);
    if (missingDateMessage) {
      showMessage(missingDateMessage, !options?.silent);
      return false;
    }

    setLoading(true);
    setAvailabilityPricing(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/availability/properties/${propertyId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
      );
      const payload = await response.json();

      if (!response.ok) {
        const errorMessage = payload.error?.message ?? "Không thể kiểm tra phòng trống.";
        showMessage(errorMessage, !options?.silent);
        return false;
      }

      setAvailabilityPricing(payload.data.pricing ?? null);

      if (!payload.data.available) {
        showMessage("Ngày này đã hết phòng, vui lòng chọn ngày khác hoặc tìm kiếm chọn ngày để tìm được chỗ nghỉ ưng ý.", !options?.silent);
        return false;
      }

      if (options?.alertWhenAvailable) showMessage("Còn phòng cho khoảng thời gian này.", true);
      return true;
    } catch {
      showMessage("Không thể kết nối để kiểm tra phòng trống.", !options?.silent);
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (cameFromDatedSearch) {
      void checkAvailability({ silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOpenPaymentBox() {
    const missingDateMessage = getMissingDateMessage(checkIn, checkOut);
    if (missingDateMessage) {
      showMessage(missingDateMessage);
      return;
    }

    const available = await checkAvailability({ silent: false });
    if (!available) return;

    setShowPaymentBox(true);
  }

  async function handleCreateBooking() {
    const accessToken = getAccessToken();

    if (!accessToken) {
      const next = window.location.pathname;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setBookingLoading(true);

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
            paymentOption,
            notes,
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        const errorMessage =
          payload.error?.code === "PROPERTY_UNAVAILABLE"
            ? "Ngày này đã hết phòng, vui lòng chọn ngày khác hoặc tìm kiếm chọn ngày để tìm được chỗ nghỉ ưng ý."
            : payload.error?.message ?? "Không thể tạo booking.";
        showMessage(errorMessage);
        return;
      }

      showMessage(`Đặt phòng thành công. Mã booking: ${payload.data.id.slice(-6).toUpperCase()}`);
      setShowPaymentBox(false);
    } catch {
      showMessage("Không thể kết nối để tạo booking.");
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="rounded-lg bg-teal-950 px-4 py-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-teal-50/75">Tổng tạm tính</p>
            <p className="mt-1 text-3xl font-semibold">
              {totalPreview !== null ? formatCurrency(totalPreview) : "—"}
            </p>
            <p className="mt-1 text-sm text-teal-50/75">
              {nights > 0 ? `${nights} đêm · ${guests} khách` : "Chọn ngày để xem tổng tiền"}
            </p>
          </div>
          <div className="shrink-0 rounded-md bg-white/10 px-3 py-2 text-right">
            <p className="text-xs text-teal-50/70">Giá 1 đêm</p>
            <p className="mt-1 font-semibold">{pricePerNight ? formatCurrency(pricePerNight) : "—"}</p>
          </div>
        </div>
      </div>

      {cleaningFee ? (
        <span className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          Phí dọn dẹp {formatCurrency(cleaningFee)}
        </span>
      ) : null}

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
              const nextMinCheckOut = addDaysIso(val, 1);
              if (checkOut && checkOut < nextMinCheckOut) setCheckOut(nextMinCheckOut);
              resetAvailability();
            }}
            className="rounded-lg border border-slate-200 px-4 py-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-slate-500">Trả phòng</span>
          <input
            type="date"
            value={checkOut}
            min={minCheckOut}
            onChange={(event) => {
              const val = event.target.value;
              setCheckOut(val && val < minCheckOut ? minCheckOut : val);
              resetAvailability();
            }}
            className="rounded-lg border border-slate-200 px-4 py-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-slate-500">Số khách</span>
          <input
            type="number"
            min={1}
            max={maxGuests}
            value={guests}
            onChange={(event) => {
              setGuests(Number(event.target.value));
              resetAvailability();
            }}
            className="rounded-lg border border-slate-200 px-4 py-3"
          />
        </label>
      </div>

      {totalPreview !== null ? (
        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>
              {pricePerNight ? formatCurrency(pricePerNight) : "—"} × {nights} đêm
            </span>
            <span>{formatCurrency(stayPreview)}</span>
          </div>
          <div className="mt-2 flex justify-between text-slate-600">
            <span>Phí dọn dẹp</span>
            <span>{formatCurrency(feePreview)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-semibold">
            <span>Tổng cộng</span>
            <span>{formatCurrency(totalPreview)}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {messageAction}

        <Button
          type="button"
          onClick={handleOpenPaymentBox}
          className="w-full py-3"
          disabled={loading || bookingLoading}
        >
          {loading ? "Đang kiểm tra..." : "Đặt phòng"}
        </Button>
      </div>

      {message ? (
        <p className="fixed right-4 top-4 z-[60] max-w-sm rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl">
          {message}
        </p>
      ) : null}

      {showPaymentBox ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-teal-700">Xác nhận đặt phòng</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">Chọn phương thức thanh toán</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentBox(false)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {paymentOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition ${
                    paymentOption === option.value
                      ? "border-blue-700 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    checked={paymentOption === option.value}
                    onChange={() => setPaymentOption(option.value)}
                    className="mt-1 h-4 w-4 accent-blue-700"
                  />
                  <span>
                    <span className="block font-semibold text-slate-950">{option.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-500">{option.note}</span>
                  </span>
                </label>
              ))}
            </div>

            {paymentOption !== "PAY_AT_PROPERTY" ? (
              <div className="mt-5 grid gap-4 rounded-lg border border-dashed border-teal-200 bg-teal-50 p-4 md:grid-cols-[180px_1fr]">
                <div className="grid min-h-[180px] place-items-center rounded-md bg-white p-3">
                  {qrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrUrl} alt="Mã QR VietQR thanh toán TripNest" className="h-40 w-40 object-contain" />
                  ) : (
                    <p className="text-center text-sm text-slate-500">Thêm cấu hình VietQR để hiện mã QR.</p>
                  )}
                </div>
                <div className="text-sm leading-6 text-slate-700">
                  <p className="font-semibold text-slate-950">Số tiền cần thanh toán: {formatCurrency(transferAmount)}</p>
                  <p className="mt-2">Tên tài khoản: {process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME ?? "TRIPNEST"}</p>
                </div>
              </div>
            ) : null}

            <label className="mt-5 grid gap-2 text-sm">
              <span className="font-semibold text-slate-700">Ghi chú cho chỗ lưu trú</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Ví dụ: đến muộn sau 22h, cần thêm giường phụ..."
                className="resize-y rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-teal-600"
              />
            </label>

            <Button
              type="button"
              onClick={handleCreateBooking}
              className="mt-5 w-full py-3"
              disabled={bookingLoading}
            >
              {bookingLoading ? "Đang xác nhận..." : "Xác nhận đặt phòng"}
            </Button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
