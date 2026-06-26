import type { PropertyListItem } from "@/types/property";
import Image from "next/image";
import Link from "next/link";

const propertyTypeLabels: Record<string, string> = {
  HOTEL: "Khách sạn",
  APARTMENT: "Căn hộ",
  RESORT: "Resort",
  VILLA: "Biệt thự",
  HOUSE: "Nhà",
  HOMESTAY: "Homestay",
  UNIQUE: "Chỗ nghỉ độc đáo",
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

export function PropertyCard({
  property,
  nights,
  checkIn,
  checkOut,
  guests,
}: {
  property: PropertyListItem;
  nights?: number | null;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}) {
  const total = nights ? property.pricePerNight * nights + (property.cleaningFee ?? 0) : null;
  const query = new URLSearchParams();
  if (checkIn) query.set("checkIn", checkIn);
  if (checkOut) query.set("checkOut", checkOut);
  if (guests) query.set("guests", String(guests));
  const detailHref = `/properties/${property.id}${query.size ? `?${query.toString()}` : ""}`;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-[0_18px_50px_rgba(15,118,110,0.12)]">
      <div className="grid md:grid-cols-[220px_minmax(0,1fr)_210px]">
        <Link href={detailHref} className="relative min-h-[210px] overflow-hidden bg-slate-100">
          {property.thumbnailUrl ? (
            <Image
              src={property.thumbnailUrl}
              alt={property.title}
              fill
              unoptimized
              sizes="(min-width: 768px) 220px, 100vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-teal-50 via-white to-amber-50 text-sm font-medium text-slate-400">
              Chưa có ảnh
            </div>
          )}
        </Link>

        <div className="min-w-0 p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-teal-700">
            <span>{propertyTypeLabels[property.type] ?? property.type}</span>
            <span className="text-slate-300">•</span>
            <span>{property.city}</span>
          </div>
          <Link href={detailHref} className="mt-2 block text-xl font-semibold leading-tight text-slate-950 transition hover:text-teal-800">
            {property.title}
          </Link>
          <p className="mt-3 text-sm text-slate-600">
            {property.maxGuests} khách · {property.bedroomCount} phòng ngủ · {property.bathrooms} phòng tắm
          </p>
          {property.amenityNames?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {property.amenityNames.slice(0, 3).map((amenity) => (
                <span key={amenity} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
                  {amenity}
                </span>
              ))}
            </div>
          ) : null}
          <p className={`mt-4 text-sm font-medium ${nights ? "text-emerald-700" : "text-slate-500"}`}>
            {nights ? "Còn trống trong khoảng ngày đã chọn" : "Chọn ngày để kiểm tra phòng trống"}
          </p>
        </div>

        <div className="flex flex-col justify-between border-t border-slate-100 bg-slate-50/70 p-5 text-right md:border-l md:border-t-0">
          <div>
            <p className="text-xs text-slate-500">
              {nights ? `${nights} đêm${guests ? `, ${guests} khách` : ""}` : "Giá cho 1 đêm"}
            </p>
            <p className="mt-2 text-sm text-slate-500">Mỗi đêm</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatVnd(property.pricePerNight)}</p>
            {total !== null ? (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-500">Tổng cho {nights} đêm</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-teal-900">{formatVnd(total)}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {property.cleaningFee ? "Đã gồm phí dọn dẹp" : "Không có phí dọn dẹp"}
                </p>
              </div>
            ) : null}
          </div>
          <Link href={detailHref} className="mt-5 inline-flex justify-center rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-950">
            Xem chỗ trống
          </Link>
        </div>
      </div>
    </article>
  );
}
