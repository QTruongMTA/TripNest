import { homeImages } from "./home-images";

export const destinations = [
  {
    name: "Cao Bằng",
    subtitle: "Nơi đẹp ở Tây Bắc",
    href: "/properties?cities=Sa%20Pa,Hà%20Giang,Mộc%20Châu",
    image: homeImages.destinations.caoBang,
  },
  {
    name: "Quảng Ninh",
    subtitle: "Nổi bật với Hạ Long",
    href: "/properties?cities=Hạ%20Long",
    image: homeImages.destinations.quangNinh,
  },
  {
    name: "Phú Quốc",
    subtitle: "Thiên đường biển đảo",
    href: "/properties?city=Phú%20Quốc",
    image: homeImages.destinations.phuQuoc,
  },
  {
    name: "Đà Nẵng",
    subtitle: "Phố cổ Hội An",
    href: "/properties?city=Đà%20Nẵng",
    image: homeImages.destinations.daNang,
  },
  {
    name: "Đà Lạt",
    subtitle: "Vùng đất của tình yêu",
    href: "/properties?city=Đà%20Lạt",
    image: homeImages.destinations.daLat,
  },
];

export const vietnamHighlights = [
  { name: "Hà Nội", stays: "2.981 chỗ nghỉ" },
  { name: "Hạ Long", stays: "1.204 chỗ nghỉ" },
  { name: "Sa Pa", stays: "846 chỗ nghỉ" },
  { name: "Ninh Bình", stays: "1.057 chỗ nghỉ" },
  { name: "Phú Quốc", stays: "1.132 chỗ nghỉ" },
];

export const stayTypes = [
  {
    name: "Khách sạn",
    href: "/properties?type=HOTEL",
    image: homeImages.stayTypes.hotel,
  },
  {
    name: "Căn hộ",
    href: "/properties?type=APARTMENT",
    image: homeImages.stayTypes.apartment,
  },
  {
    name: "Resort",
    href: "/properties?type=RESORT",
    image: homeImages.stayTypes.resort,
  },
  {
    name: "Biệt thự",
    href: "/properties?type=VILLA",
    image: homeImages.stayTypes.villa,
  },
];

export const weekendDeals = [
  {
    name: "An Nhiên Riverside",
    location: "Hội An",
    price: "1.240.000đ",
    oldPrice: "1.550.000đ",
    image: homeImages.weekendDeals.riverside,
  },
  {
    name: "Mây Trắng Retreat",
    location: "Đà Lạt",
    price: "980.000đ",
    oldPrice: "1.220.000đ",
    image: homeImages.weekendDeals.retreat,
  },
  {
    name: "Blue Coast Villa",
    location: "Phú Quốc",
    price: "2.350.000đ",
    oldPrice: "2.780.000đ",
    image: homeImages.weekendDeals.villa,
  },
];

export const uniqueStays = [
  {
    name: "Mekong Lodge Retreat",
    location: "Cần Thơ",
    rating: "9.1",
    reviews: "418 đánh giá",
    price: "1.420.000đ",
    image: homeImages.uniqueStays.mekong,
  },
  {
    name: "Sapa Cloud House",
    location: "Sa Pa",
    rating: "9.4",
    reviews: "562 đánh giá",
    price: "1.180.000đ",
    image: homeImages.uniqueStays.sapa,
  },
  {
    name: "Lantern Riverside",
    location: "Hội An",
    rating: "9.0",
    reviews: "337 đánh giá",
    price: "1.050.000đ",
    image: homeImages.uniqueStays.lantern,
  },
  {
    name: "Coral Bay Resort",
    location: "Nha Trang",
    rating: "8.9",
    reviews: "691 đánh giá",
    price: "2.240.000đ",
    image: homeImages.uniqueStays.coral,
  },
];

export const guestFavorites = [
  {
    name: "An Bang Garden Villa",
    location: "Hội An",
    price: "1.360.000đ",
    image: homeImages.guestFavorites.gardenVilla,
  },
  {
    name: "The Pine Studio",
    location: "Đà Lạt",
    price: "890.000đ",
    image: homeImages.guestFavorites.pineStudio,
  },
  {
    name: "Seaside Loft",
    location: "Vũng Tàu",
    price: "1.120.000đ",
    image: homeImages.guestFavorites.seasideLoft,
  },
  {
    name: "Old Quarter Nest",
    location: "Hà Nội",
    price: "960.000đ",
    image: homeImages.guestFavorites.oldQuarter,
  },
];

export const quickPlans = [
  {
    name: "Hà Nội",
    distance: "Cách đây 1 km",
    href: "/properties?city=Hà%20Nội",
  },
  {
    name: "Ninh Bình",
    distance: "Cách đây 89 km",
    href: "/properties?city=Ninh%20Bình",
  },
  {
    name: "Hải Phòng",
    distance: "Cách đây 120 km",
    href: "/properties?city=Hải%20Phòng",
  },
  {
    name: "Hạ Long",
    distance: "Cách đây 155 km",
    href: "/properties?city=Hạ%20Long",
  },
  {
    name: "Sa Pa",
    distance: "Cách đây 315 km",
    href: "/properties?city=Sa%20Pa",
  },
  {
    name: "Mộc Châu",
    distance: "Cách đây 200 km",
    href: "/properties?city=Mộc%20Châu",
  },
];

export const popularLinks = [
  "Khách sạn ở Hạ Long",
  "Khách sạn ở Hà Nội",
  "Homestay ở Sa Pa",
  "Resort ở Ninh Bình",
  "Biệt thự ở Phú Quốc",
  "Khách sạn ở Hội An",
  "Homestay ở Hà Giang",
  "Farmstay ở Mộc Châu",
  "Căn hộ ở Tây Hồ",
  "Khu nghỉ dưỡng ở Tam Cốc",
  "Nhà nghỉ ở Huế",
  "Khách sạn ở Cần Thơ",
];
