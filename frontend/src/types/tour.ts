export type TourRating = {
  average: number | null;
  count: number;
};

export type TourListItem = {
  id: string;
  title: string;
  city: string;
  country: string;
  category: string;
  pricePerPerson: number;
  durationDays: number;
  minGroupSize: number;
  maxGroupSize: number;
  thumbnailUrl: string | null;
  rating: TourRating;
};

export type TourDetail = TourListItem & {
  description: string;
  cancellationHours: number | null;
  cancellationPolicy: string | null;
  images: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
  itinerary: Array<{
    id: string;
    dayNumber: number;
    title: string;
    description: string;
  }>;
  inclusions: {
    included: string[];
    excluded: string[];
  };
  availability: Array<{
    date: string;
    slotsTotal: number;
    slotsBooked: number;
    slotsRemaining: number;
  }>;
  host: {
    id: string;
    name: string;
    avatar: string | null;
  };
  createdAt: string;
  updatedAt: string;
};
