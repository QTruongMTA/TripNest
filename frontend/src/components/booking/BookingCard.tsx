import Image from "next/image";

export type TravelerBooking = {
  id: string;
  type: "PROPERTY" | "TOUR";
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paidAt: string | null;
  paymentConfirmedBy: string | null;
  checkIn: string | null;
  checkOut: string | null;
  tourDate: string | null;
  numGuests: number;
  totalPrice: number;
  settlement: {
    status: string;
    platformFee: number;
    hostAmount: number;
    availableAt: string;
    paidAt: string | null;
  } | null;
  review: {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
  } | null;
  canReview: boolean;
  createdAt: string;
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
  CHECKED_IN: "Đã nhận phòng",
  CANCELLED: "Đã hủy",
  COMPLETED: "Hoàn thành",
};

const paymentLabel: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
};

export function BookingCard({ booking }: { booking: TravelerBooking }) {
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
            <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
              {statusLabel[booking.status] ?? booking.status}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              Thanh toán: {paymentLabel[booking.paymentStatus] ?? booking.paymentStatus}
            </span>
            {booking.paymentMethod ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                Phương thức: {booking.paymentMethod}
              </span>
            ) : null}
            {booking.paymentConfirmedBy ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                Xác nhận bởi: {booking.paymentConfirmedBy === "HOST" ? "Host" : "TripNest"}
              </span>
            ) : null}
            {booking.settlement ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                Quyết toán: {booking.settlement.status}
              </span>
            ) : null}
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
          {booking.review ? (
            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-amber-700">
                Đánh giá của bạn: {"★".repeat(booking.review.rating)}
              </p>
              <p className="mt-1">{booking.review.comment}</p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
