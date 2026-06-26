import { PropertyCard } from "@/components/search/PropertyCard";
import { PropertyFilters } from "@/components/search/PropertyFilters";
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
  guests?: string;
  bedrooms?: string;
  bathrooms?: string;
  amenities?: string | string[];
  cancellationPolicy?: string;
  checkIn?: string;
  checkOut?: string;
};

const propertyTypeLabels: Record<string, string> = {
  HOTEL: "khách sạn",
  APARTMENT: "căn hộ",
  RESORT: "resort",
  VILLA: "biệt thự",
};

async function getProperties(searchParams: PropertiesSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => item && params.append(key, item));
    else if (value) params.set(key, value);
  }
  const query = params.toString();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/properties${query ? `?${query}` : ""}`, { cache: "no-store" });
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

function formatSearchDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

export default async function PropertiesPage({ searchParams }: { searchParams: PropertiesSearchParams }) {
  const properties = await getProperties(searchParams);
  const nights = getNights(searchParams.checkIn, searchParams.checkOut);
  const guests = Math.max(1, Number(searchParams.guests) || 2);
  const checkInLabel = formatSearchDate(searchParams.checkIn);
  const checkOutLabel = formatSearchDate(searchParams.checkOut);

  return (
    <section className="mx-auto max-w-7xl px-5 py-9 md:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">TripNest</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Tìm kiếm</h1>
        </div>
        <p className="text-sm text-slate-500">{properties.meta.total} chỗ nghỉ phù hợp</p>
      </div>

      <SearchToolbar values={searchParams} />

      <div className="mt-7 grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <PropertyFilters values={{ ...searchParams, amenities: Array.isArray(searchParams.amenities) ? searchParams.amenities.join(",") : searchParams.amenities }} />

        <div className="min-w-0">
          <div className="mb-5 border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-semibold text-slate-950">
              {searchParams.city ? `${searchParams.city}: ` : ""}{properties.meta.total} {nights ? "chỗ nghỉ còn trống" : "chỗ nghỉ phù hợp"}
            </h2>
            {nights && checkInLabel && checkOutLabel ? (
              <p className="mt-2 text-sm text-slate-600">
                {checkInLabel} – {checkOutLabel} · {nights} đêm · {guests} khách
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Chọn ngày nhận, trả phòng và số khách để xem giá chính xác cho toàn bộ kỳ nghỉ.</p>
            )}
          </div>
          <div className="grid gap-5">
            {properties.data.length > 0 ? (
              properties.data.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  nights={nights}
                  checkIn={searchParams.checkIn}
                  checkOut={searchParams.checkOut}
                  guests={guests}
                />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-lg font-semibold text-slate-800">
                  {nights ? "Không có chỗ nghỉ còn trống trong khoảng ngày này" : `Chưa có ${propertyTypeLabels[searchParams.type ?? ""] ?? "chỗ nghỉ"} đang hoạt động`}
                </p>
                <p className="mt-2 text-sm text-slate-500">Hãy thử loại chỗ nghỉ khác, thay đổi bộ lọc hoặc quay lại sau khi Host đăng thêm dữ liệu.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
