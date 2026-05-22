import { FilterPanel } from "@/components/search/FilterPanel";
import { PropertyCard } from "@/components/search/PropertyCard";
export default function SearchPage() {
  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[280px_1fr]">
      <FilterPanel />
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Kết quả tìm kiếm</h1>
        <PropertyCard
          property={{
            id: "sample",
            title: "TripNest Riverside",
            city: "Hồ Chí Minh",
            country: "Việt Nam",
            type: "HOUSE",
            pricePerNight: 1250000,
            cleaningFee: null,
            maxGuests: 4,
            bedroomCount: 2,
            bathrooms: 1,
            thumbnailUrl: null,
            rating: { average: null, count: 0 },
          }}
        />
      </div>
    </section>
  );
}
