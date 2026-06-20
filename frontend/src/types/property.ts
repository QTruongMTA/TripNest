export type PropertyRating = {
  average: number | null;
  count: number;
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
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    guest: {
      name: string;
      avatar: string | null;
    };
  }>;
  availability: {
    blockedDates: Array<{
      date: string;
      status: "BLOCKED" | "MAINTENANCE";
    }>;
  };
  createdAt: string;
  updatedAt: string;
};
