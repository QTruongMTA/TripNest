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

export const hostProperties: HostProperty[] = [];

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
