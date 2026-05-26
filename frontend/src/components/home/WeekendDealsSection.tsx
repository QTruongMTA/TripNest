import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "./SectionHeading";

type PropertyItem = {
  id: string;
  title: string;
  city: string;
  pricePerNight: number;
  thumbnailUrl: string | null;
  rating: { average: number | null; count: number };
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800";

function formatVND(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

export function WeekendDealsSection({ properties }: { properties: PropertyItem[] }) {
  if (properties.length === 0) return null;

  return (
    <section id="uu-dai" className="animate-fade-up mx-auto max-w-6xl px-5 md:px-6">
      <SectionHeading
        eyebrow="Nổi bật tuần này"
        title="Những lựa chọn đang được đặt nhiều"
        description="Các chỗ nghỉ chất lượng cao đang sẵn sàng đón khách — từ biệt thự ven biển đến retreat giữa núi rừng."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {properties.map((property) => (
          <Link key={property.id} href={`/properties/${property.id}`}>
            <article className="card-lift overflow-hidden rounded-lg bg-white shadow-sm shadow-teal-950/5">
              <div className="relative h-60">
                <Image
                  src={property.thumbnailUrl ?? FALLBACK_IMAGE}
                  alt={property.title}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover"
                />
                {property.rating.average !== null && (
                  <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-teal-800 backdrop-blur-sm">
                    ★ {property.rating.average.toFixed(1)}
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm text-teal-700">{property.city}</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">{property.title}</h3>
                <div className="mt-4">
                  <span className="text-2xl font-semibold text-teal-800">{formatVND(property.pricePerNight)}</span>
                  <span className="ml-1 text-sm text-slate-500">/ đêm</span>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
