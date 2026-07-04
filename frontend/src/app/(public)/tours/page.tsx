import { TourCard } from "@/components/search/TourCard";
import type { TourListItem } from "@/types/tour";

type TourListResponse = {
  data: TourListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

async function getTours() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1"}/tours`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Không thể tải danh sách tour");
  }

  return (await response.json()) as TourListResponse;
}

export default async function ToursPage() {
  const tours = await getTours();

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">
            TripNest
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Danh sách tour</h1>
        </div>
        <p className="text-sm text-slate-500">
          {tours.meta.total} tour đang hoạt động
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {tours.data.map((tour) => (
          <TourCard key={tour.id} tour={tour} />
        ))}
      </div>
    </section>
  );
}
