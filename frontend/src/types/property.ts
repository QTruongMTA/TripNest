export type PropertyRating = {
  average: number | null;
  count: number;
  breakdown?: {
    cleanliness: number;
    comfort: number;
    location: number;
    facilities: number;
    staff: number;
    valueForMoney: number;
  } | null;
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
  promotion?: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
  } | null;
};

export type PropertyDetail = PropertyListItem & {
  description: string;
  livingRoomSofaBeds: number;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    postalCode: string | null;
    country: string;
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
  images: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
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
  ratePlans: Array<{
    id: string;
    name: string;
    type: string;
    priceAdjustmentType: string;
    priceAdjustmentValue: number;
    cancellationPolicy: string | null;
    cancellationFreeDays: number | null;
    minStay: number | null;
    maxStay: number | null;
    breakfastIncluded: boolean;
    sortOrder: number;
  }>;
  promotions: Array<{
    id: string;
    code: string;
    description: string | null;
    discountType: string;
    discountValue: number;
    minOrderValue: number | null;
    maxUses: number | null;
    usedCount: number;
    endDate: string;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    cleanliness: number;
    comfort: number;
    location: number;
    facilities: number;
    staff: number;
    valueForMoney: number;
    comment: string;
    hostReply: string | null;
    hostRepliedAt: string | null;
    createdAt: string;
    guest: { id: string; name: string; avatar: string | null };
    images: Array<{ id: string; url: string }>;
  }>;
  createdAt: string;
  updatedAt: string;
};
