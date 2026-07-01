import { PropertyFilters } from "@/components/search/PropertyFilters";
import { PropertyResultsClient } from "@/components/search/PropertyResultsClient";
import { SearchToolbar } from "@/components/search/SearchToolbar";
import type { PropertyListItem } from "@/types/property";

type PropertyListResponse = {
  data: PropertyListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

type PropertiesSearchParams = {
  city?: string;
  cities?: string;
  type?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  guests?: string;
  bedrooms?: string;
  bathrooms?: string;
  amenities?: string | string[];
  cancellationPolicy?: string;
  checkIn?: string;
  checkOut?: string;
};

async function getProperties(searchParams: PropertiesSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => item && params.append(key, item));
    else if (value) params.set(key, value);
  }
  const query = params.toString();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/properties${query ? `?${query}` : ""}`,
    { cache: "no-store" }
  );
  if (!response.ok) throw new Error("Không thể tải danh sách chỗ ở");
  return (await response.json()) as PropertyListResponse;
}

function getNights(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return null;
  const start = new Date(`${checkIn}T00:00:00.000Z`);
  const end = new Date(`${checkOut}T00:00:00.000Z`);
  const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
  return nights > 0 ? nights : null;
}

export default async function PropertiesPage({ searchParams }: { searchParams: PropertiesSearchParams }) {
  const properties = await getProperties(searchParams);
  const nights = getNights(searchParams.checkIn, searchParams.checkOut);
  const filterValues = {
    ...searchParams,
    amenities: Array.isArray(searchParams.amenities)
      ? searchParams.amenities.join(",")
      : searchParams.amenities,
  };

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">TripNest</p>
          <h1 className="mt-2 text-3xl font-semibold">Danh sách chỗ ở</h1>
        </div>
        <p className="text-sm text-slate-500">{properties.meta.total} chỗ ở đang hoạt động</p>
      </div>

      <SearchToolbar values={searchParams} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[290px_1fr]">
        <PropertyFilters values={filterValues} />
        <div>
          {nights ? (
            <p className="mb-4 text-sm text-slate-600">
              Giá hiển thị cho <span className="font-semibold text-slate-950">{nights} đêm</span>.
            </p>
          ) : null}
          <PropertyResultsClient properties={properties.data} nights={nights} />
        </div>
      </div>
    </section>
  );
}
