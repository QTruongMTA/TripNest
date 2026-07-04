import type { PropertyDetail } from "@/types/property";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1";

async function getProperties(ids: string[]) {
  const responses = await Promise.all(
    ids.map((id) => fetch(`${apiUrl}/properties/${id}`, { cache: "no-store" }))
  );
  if (responses.some((response) => !response.ok)) return null;
  return Promise.all(responses.map(async (response) => ((await response.json()).data as PropertyDetail)));
}

export default async function ComparePage({ searchParams }: { searchParams: { ids?: string } }) {
  const ids = Array.from(new Set(searchParams.ids?.split(",").filter(Boolean) ?? [])).slice(0, 3);
  if (ids.length < 2) notFound();
  const properties = await getProperties(ids);
  if (!properties) notFound();

  const rows: Array<{ label: string; render: (property: PropertyDetail) => React.ReactNode }> = [
    { label: "Giá mỗi đêm", render: (property) => `${property.pricePerNight.toLocaleString("vi-VN")} ₫` },
    { label: "Điểm đánh giá", render: (property) => property.rating.average ? `${property.rating.average}/5 (${property.rating.count})` : "Chưa có" },
    { label: "Sức chứa", render: (property) => `${property.capacity.maxGuests} khách` },
    { label: "Phòng ngủ", render: (property) => property.capacity.bedroomCount },
    { label: "Phòng tắm", render: (property) => property.capacity.bathrooms },
    { label: "Bữa sáng", render: (property) => property.services.breakfastIncluded ? "Đã bao gồm" : "Có thể chọn thêm" },
    { label: "Bãi đỗ xe", render: (property) => property.services.parkingType },
    { label: "Chính sách hủy", render: (property) => property.policies.cancellationPolicy },
    { label: "Tiện nghi", render: (property) => property.amenities.slice(0, 6).map((item) => item.name).join(", ") || "—" },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">TripNest Compare</p>
        <h1 className="mt-2 text-3xl font-semibold">So sánh cơ sở lưu trú</h1>
        <p className="mt-2 text-slate-600">Đối chiếu giá, sức chứa, tiện nghi và đánh giá trước khi đặt.</p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid min-w-[800px]" style={{ gridTemplateColumns: `190px repeat(${properties.length}, minmax(220px, 1fr))` }}>
          <div className="border-b border-r border-slate-200 bg-slate-50 p-4" />
          {properties.map((property) => (
            <div key={property.id} className="border-b border-r border-slate-200 p-4 last:border-r-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
                {property.thumbnailUrl ? <Image src={property.thumbnailUrl} alt={property.title} fill unoptimized className="object-cover" /> : null}
              </div>
              <p className="mt-3 text-xs uppercase tracking-wide text-teal-700">{property.type} · {property.city}</p>
              <h2 className="mt-1 text-lg font-semibold">{property.title}</h2>
            </div>
          ))}

          {rows.map((row) => (
            <div key={row.label} className="contents">
              <div className="border-b border-r border-slate-200 bg-slate-50 p-4 font-semibold text-slate-700">{row.label}</div>
              {properties.map((property) => (
                <div key={`${row.label}-${property.id}`} className="border-b border-r border-slate-200 p-4 text-sm text-slate-700 last:border-r-0">
                  {row.render(property)}
                </div>
              ))}
            </div>
          ))}

          <div className="border-r border-slate-200 bg-slate-50 p-4" />
          {properties.map((property) => (
            <div key={`action-${property.id}`} className="border-r border-slate-200 p-4 last:border-r-0">
              <Link href={`/properties/${property.id}`} className="block rounded-full bg-teal-700 px-4 py-2 text-center font-semibold text-white">
                Xem và đặt phòng
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
