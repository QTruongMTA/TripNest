import Link from "next/link";
import type { PropertyListItem } from "@/types/property";
import { PropertyImage } from "@/components/property/PropertyImage";
import { SectionHeading } from "./SectionHeading";

export function ApprovedPropertiesSection({
  properties,
}: {
  properties: PropertyListItem[];
}) {
  return (
    <section className="animate-fade-up mx-auto max-w-6xl px-5 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Đã được TripNest duyệt"
          title="Chỗ nghỉ đang mở nhận khách"
          description="Các cơ sở dưới đây do host đăng và chỉ xuất hiện công khai sau khi hoàn tất xét duyệt."
        />
        <Link
          href="/properties"
          className="mb-8 text-sm font-semibold text-teal-700 hover:underline"
        >
          Xem tất cả {properties.length > 0 ? `(${properties.length}+)` : ""}
        </Link>
      </div>

      {properties.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {properties.slice(0, 8).map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-48 bg-slate-100">
                <PropertyImage
                  src={property.thumbnailUrl}
                  alt={property.title}
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                  Đã duyệt
                </span>
              </div>
              <div className="p-4">
                <p className="text-sm text-teal-700">{property.city}</p>
                <h3 className="mt-1 line-clamp-2 font-semibold text-slate-950">
                  {property.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {property.maxGuests} khách · {property.bedroomCount} phòng ngủ
                </p>
                <p className="mt-3 font-semibold text-slate-950">
                  {property.pricePerNight.toLocaleString("vi-VN")} ₫
                  <span className="font-normal text-slate-500"> / đêm</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Chưa có chỗ nghỉ nào đã được duyệt và mở nhận khách.
        </div>
      )}
    </section>
  );
}
