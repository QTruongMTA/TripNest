export type HostProperty = {
  id: string;
  name: string;
  address: string;
  city: string;
  status: "open" | "review" | "paused";
  bookings: number;
  arrivals: number;
  departures: number;
  reviews: number;
  cancellations: number;
  revenue: number;
  occupancy: number;
  rating: number;
};

export const hostProperties: HostProperty[] = [
  {
    id: "16555872",
    name: "TripNest Riverside Studio",
    address: "236 Hoàng Quốc Việt, Nghĩa Đô, Hà Nội",
    city: "Hà Nội",
    status: "open",
    bookings: 7,
    arrivals: 2,
    departures: 1,
    reviews: 4,
    cancellations: 0,
    revenue: 18400000,
    occupancy: 74,
    rating: 9.1,
  },
  {
    id: "40827163",
    name: "An Nhiên Garden Homestay",
    address: "12 Trần Phú, Cẩm Châu, Hội An",
    city: "Hội An",
    status: "review",
    bookings: 3,
    arrivals: 1,
    departures: 0,
    reviews: 2,
    cancellations: 1,
    revenue: 7200000,
    occupancy: 52,
    rating: 8.8,
  },
  {
    id: "73094618",
    name: "Saigon Compact Suite",
    address: "45 Nguyễn Thị Minh Khai, Quận 1, TP. Hồ Chí Minh",
    city: "TP. Hồ Chí Minh",
    status: "paused",
    bookings: 0,
    arrivals: 0,
    departures: 0,
    reviews: 0,
    cancellations: 0,
    revenue: 0,
    occupancy: 0,
    rating: 0,
  },
];

export function generatePropertyId(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000000;
  }
  return String(hash).padStart(8, "0");
}

export function getStatusLabel(status: HostProperty["status"]) {
  if (status === "open") return "Mở / Có thể đặt phòng";
  if (status === "review") return "Đang chờ duyệt";
  return "Tạm dừng nhận đặt phòng";
}

export function getStatusClass(status: HostProperty["status"]) {
  if (status === "open") return "bg-emerald-500";
  if (status === "review") return "bg-amber-500";
  return "bg-slate-400";
}
