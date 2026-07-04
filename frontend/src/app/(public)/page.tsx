import { DestinationSection } from "@/components/home/DestinationSection";
import { ExploreVietnamSection } from "@/components/home/ExploreVietnamSection";
import { GuestFavoritesSection } from "@/components/home/GuestFavoritesSection";
import { HeroSection } from "@/components/home/HeroSection";
import { ApprovedPropertiesSection } from "@/components/home/ApprovedPropertiesSection";
import { PopularVietnamSection } from "@/components/home/PopularVietnamSection";
import { PromoBannerSection } from "@/components/home/PromoBannerSection";
import { QuickPlanSection } from "@/components/home/QuickPlanSection";
import { RubyTravelTipsSection } from "@/components/home/RubyTravelTipsSection";
import { StayTypeSection } from "@/components/home/StayTypeSection";
import { UniqueStaysSection } from "@/components/home/UniqueStaysSection";
import { WeekendDealsSection } from "@/components/home/WeekendDealsSection";
import type { PropertyListItem } from "@/types/property";

async function fetchFeaturedProperties(): Promise<PropertyListItem[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1";
    const res = await fetch(`${apiUrl}/properties?limit=50`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const properties = await fetchFeaturedProperties();
  const availableCities = Array.from(
    new Set(properties.map((property) => property.city).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "vi"));

  const weekendDeals = properties.slice(0, 3);
  const uniqueStays = properties.slice(3, 7);
  const guestFavorites = properties.slice(7, 11);

  return (
    <>
      <HeroSection availableCities={availableCities} activePropertyCount={properties.length} />
      <main className="space-y-14 pb-16 pt-16 md:space-y-16">
        <ApprovedPropertiesSection properties={properties} />
        <PromoBannerSection />
        <DestinationSection />
        <ExploreVietnamSection />
        <StayTypeSection properties={properties} />
        <WeekendDealsSection properties={weekendDeals} />
        <UniqueStaysSection properties={uniqueStays} />
        <GuestFavoritesSection properties={guestFavorites} />
        <RubyTravelTipsSection />
        <QuickPlanSection />
        <PopularVietnamSection />
      </main>
    </>
  );
}
