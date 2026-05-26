import { DestinationSection } from "@/components/home/DestinationSection";
import { ExploreVietnamSection } from "@/components/home/ExploreVietnamSection";
import { GuestFavoritesSection } from "@/components/home/GuestFavoritesSection";
import { HeroSection } from "@/components/home/HeroSection";
import { PopularVietnamSection } from "@/components/home/PopularVietnamSection";
import { PromoBannerSection } from "@/components/home/PromoBannerSection";
import { QuickPlanSection } from "@/components/home/QuickPlanSection";
import { StayTypeSection } from "@/components/home/StayTypeSection";
import { UniqueStaysSection } from "@/components/home/UniqueStaysSection";
import { WeekendDealsSection } from "@/components/home/WeekendDealsSection";

type PropertyItem = {
  id: string;
  title: string;
  city: string;
  pricePerNight: number;
  thumbnailUrl: string | null;
  rating: { average: number | null; count: number };
};

async function fetchFeaturedProperties(): Promise<PropertyItem[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
    const res = await fetch(`${apiUrl}/properties?limit=11`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const properties = await fetchFeaturedProperties();

  const weekendDeals = properties.slice(0, 3);
  const uniqueStays = properties.slice(3, 7);
  const guestFavorites = properties.slice(7, 11);

  return (
    <>
      <HeroSection />
      <main className="space-y-14 pb-16 pt-16 md:space-y-16">
        <PromoBannerSection />
        <DestinationSection />
        <ExploreVietnamSection />
        <StayTypeSection />
        <WeekendDealsSection properties={weekendDeals} />
        <UniqueStaysSection properties={uniqueStays} />
        <GuestFavoritesSection properties={guestFavorites} />
        <QuickPlanSection />
        <PopularVietnamSection />
      </main>
    </>
  );
}
