export type PropertyRating = {
  average: number | null;
  count: number;
  criteria?: {
    cleanliness: number;
    comfort: number;
    location: number;
    amenities: number;
    value: number;
  };
};

export type PropertyListItem = {
  id: string;
  title: string;
  city: string;
  country: string;
  type: string;
  pricePerNight: number;
  cleaningFee: number | null;
  maxGuests: number;
  bedroomCount: number;
  bathrooms: number;
  amenityNames?: string[];
  thumbnailUrl: string | null;
  rating: PropertyRating;
};

export type PropertyDetail = PropertyListItem & {
  description: string;
  notes: string | null;
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
  livingRoomSofaBeds: number;
  childrenAllowed: boolean;
  cribsAvailable: boolean;
  sizeM2: number | null;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    postalCode: string | null;
    country: string;
  };
  provinceHighlight: {
    provinceName: string;
    regionName: string;
    description: string;
  } | null;
  priceInsight: {
    level: "DEAL" | "MID_RANGE" | "PREMIUM" | "UNKNOWN";
    label: string;
    averagePrice: number | null;
    difference: number | null;
    comparedPropertyCount: number;
  };
  location: {
    latitude: number | null;
    longitude: number | null;
  };
  capacity: {
    maxGuests: number;
    bedroomCount: number;
    bathrooms: number;
  };
  bedrooms: Array<{
    roomNumber: number;
    singleBeds: number;
    doubleBeds: number;
    kingBeds: number;
    superKingBeds: number;
    bunkBeds: number;
    sofaBeds: number;
    futonBeds: number;
  }>;
  policies: {
    cancellationPolicy: string;
    cancellationFreeDays: number;
    mistakeProtection: boolean;
    bookingMethod: string;
    checkIn: { from: string | null; to: string | null };
    checkOut: { from: string | null; to: string | null };
    smokingAllowed: boolean;
    partiesAllowed: boolean;
    petsPolicy: string;
  };
  services: {
    breakfastIncluded: boolean;
    parkingType: string;
  };
  languages: string[];
  ratePlans: Array<{
    type: string;
    enabled: boolean;
    discountPct: number;
  }>;
  childPricing: {
    enabled: boolean;
    infantFree: boolean;
    infantPrice: number | null;
    childMaxAge: number;
    childFree: boolean;
    childPrice: number | null;
  } | null;
  images: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    criteria: {
      cleanliness: number;
      comfort: number;
      location: number;
      amenities: number;
      value: number;
    };
    comment: string;
    images: string[];
    revisionCount: number;
    createdAt: string;
    lastEditedAt: string | null;
    guest: {
      name: string;
      avatar: string | null;
    };
    stay: {
      checkIn: string | null;
      checkOut: string | null;
    };
  }>;
  amenities: Array<{
    id: string;
    name: string;
    icon: string | null;
  }>;
  host: {
    id: string;
    name: string;
    avatar: string | null;
  };
  availability: {
    blockedDates: Array<{
      date: string;
      status: "BLOCKED" | "MAINTENANCE";
    }>;
  };
  createdAt: string;
  updatedAt: string;
};
