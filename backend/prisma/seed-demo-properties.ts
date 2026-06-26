import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"]! });
const prisma = new PrismaClient({ adapter });

type DemoProperty = {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  type: "HOTEL" | "APARTMENT" | "RESORT" | "VILLA";
  price: number;
  maxGuests: number;
  bedroomCount: number;
  bathrooms: number;
  sizeM2: number;
  images: string[];
  amenities: string[];
};

const AMENITY_ICONS: Record<string, string> = {
  "WiFi miễn phí":         "wifi",
  "Hồ bơi":                "pool",
  "Điều hòa nhiệt độ":     "ac_unit",
  "Bãi đỗ xe":             "local_parking",
  "Bếp đầy đủ tiện nghi":  "kitchen",
  "Máy giặt":              "local_laundry_service",
  "Smart TV":              "tv",
  "Ban công view đẹp":     "balcony",
  "Phòng tập gym":         "fitness_center",
  "Lò sưởi":               "fireplace",
  "TV màn hình phẳng":     "tv",
  "Minibar":               "liquor",
  "Nhìn ra vườn":          "yard",
  "Ban công":              "balcony",
  "Bếp":                   "kitchen",
  "Bếp nhỏ":               "microwave",
  "Hệ thống sưởi":         "heat",
  "Sân thượng / hiên":     "deck",
  "Phòng xông hơi":        "hot_tub",
  "Tầm nhìn ra khung cảnh": "panorama",
};

const imagePools = {
  HOTEL: [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1400&q=85",
  ],
  APARTMENT: [
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=85",
  ],
  RESORT: [
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=85",
  ],
  VILLA: [
    "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85",
  ],
};

const demoProperties: DemoProperty[] = [
  { id: "demo-hotel-hanoi-lotus", title: "Lotus Grand Hà Nội", description: "Khách sạn thanh lịch giữa trung tâm Hà Nội, phòng nghỉ ngập ánh sáng và tầm nhìn thành phố.", address: "18 Tràng Thi, Hoàn Kiếm", city: "Hà Nội", type: "HOTEL", price: 1250000, maxGuests: 2, bedroomCount: 1, bathrooms: 1, sizeM2: 36, images: imagePools.HOTEL, amenities: ["WiFi miễn phí", "Điều hòa nhiệt độ", "TV màn hình phẳng", "Minibar"] },
  { id: "demo-hotel-hoian-heritage", title: "Heritage Lantern Hotel", description: "Không gian di sản ấm áp bên phố cổ Hội An với sân vườn, hồ bơi và bữa sáng địa phương.", address: "42 Nguyễn Thái Học, Minh An", city: "Hội An", type: "HOTEL", price: 980000, maxGuests: 3, bedroomCount: 1, bathrooms: 1, sizeM2: 40, images: [imagePools.HOTEL[1]!, imagePools.HOTEL[2]!, imagePools.HOTEL[0]!], amenities: ["WiFi miễn phí", "Hồ bơi", "Điều hòa nhiệt độ", "Nhìn ra vườn"] },
  { id: "demo-hotel-danang-azure", title: "Azure Bay Đà Nẵng", description: "Khách sạn hiện đại gần biển Mỹ Khê, phù hợp cho kỳ nghỉ ngắn ngày và chuyến công tác.", address: "126 Võ Nguyên Giáp, Sơn Trà", city: "Đà Nẵng", type: "HOTEL", price: 1450000, maxGuests: 4, bedroomCount: 2, bathrooms: 2, sizeM2: 58, images: [imagePools.HOTEL[2]!, imagePools.HOTEL[0]!, imagePools.HOTEL[1]!], amenities: ["WiFi miễn phí", "Điều hòa nhiệt độ", "TV màn hình phẳng", "Ban công"] },
  { id: "demo-apartment-hanoi-skyline", title: "Skyline Residence Tây Hồ", description: "Căn hộ cao tầng tối giản với bếp riêng, ban công rộng và góc ngắm hoàng hôn Hồ Tây.", address: "88 Xuân Diệu, Tây Hồ", city: "Hà Nội", type: "APARTMENT", price: 1100000, maxGuests: 4, bedroomCount: 2, bathrooms: 2, sizeM2: 72, images: imagePools.APARTMENT, amenities: ["WiFi miễn phí", "Bếp", "Máy giặt", "Ban công", "TV màn hình phẳng"] },
  { id: "demo-apartment-saigon-river", title: "Saigon River Loft", description: "Căn hộ phong cách đô thị bên sông Sài Gòn, đầy đủ tiện nghi cho cả kỳ nghỉ dài ngày.", address: "15 Nguyễn Hữu Cảnh, Bình Thạnh", city: "Thành phố Hồ Chí Minh", type: "APARTMENT", price: 1350000, maxGuests: 3, bedroomCount: 1, bathrooms: 1, sizeM2: 54, images: [imagePools.APARTMENT[1]!, imagePools.APARTMENT[2]!, imagePools.APARTMENT[0]!], amenities: ["WiFi miễn phí", "Bếp", "Máy giặt", "Điều hòa nhiệt độ", "Hồ bơi"] },
  { id: "demo-apartment-dalat-pine", title: "Pine Hill Apartment Đà Lạt", description: "Căn hộ ấm cúng giữa đồi thông, có bếp nhỏ và ô cửa lớn nhìn xuống thung lũng.", address: "27 Đặng Thái Thân, Phường 3", city: "Đà Lạt", type: "APARTMENT", price: 890000, maxGuests: 4, bedroomCount: 2, bathrooms: 1, sizeM2: 62, images: [imagePools.APARTMENT[2]!, imagePools.APARTMENT[0]!, imagePools.APARTMENT[1]!], amenities: ["WiFi miễn phí", "Bếp nhỏ", "Máy giặt", "Hệ thống sưởi", "Nhìn ra vườn"] },
  { id: "demo-resort-phuquoc-coral", title: "Coral Sands Phú Quốc", description: "Khu nghỉ dưỡng nhiệt đới sát biển với hồ bơi vô cực, bữa sáng và những buổi chiều đầy nắng.", address: "Bãi Trường, Dương Tơ", city: "Phú Quốc", type: "RESORT", price: 2850000, maxGuests: 4, bedroomCount: 2, bathrooms: 2, sizeM2: 86, images: imagePools.RESORT, amenities: ["WiFi miễn phí", "Hồ bơi", "Điều hòa nhiệt độ", "Minibar", "Ban công"] },
  { id: "demo-resort-ninhbinh-valley", title: "Hidden Valley Ninh Bình", description: "Retreat yên tĩnh giữa núi đá vôi và cánh đồng xanh, lý tưởng cho chuyến nghỉ dưỡng chậm rãi.", address: "Thôn Hải Nham, Hoa Lư", city: "Ninh Bình", type: "RESORT", price: 1950000, maxGuests: 3, bedroomCount: 1, bathrooms: 1, sizeM2: 48, images: [imagePools.RESORT[1]!, imagePools.RESORT[2]!, imagePools.RESORT[0]!], amenities: ["WiFi miễn phí", "Hồ bơi", "Nhìn ra vườn", "Sân thượng / hiên"] },
  { id: "demo-resort-nhatrang-horizon", title: "Horizon Resort Nha Trang", description: "Khu nghỉ dưỡng hướng vịnh với phòng rộng, ban công riêng và chuỗi tiện ích thư giãn bên biển.", address: "08 Phạm Văn Đồng, Vĩnh Hải", city: "Nha Trang", type: "RESORT", price: 2350000, maxGuests: 5, bedroomCount: 2, bathrooms: 2, sizeM2: 92, images: [imagePools.RESORT[2]!, imagePools.RESORT[0]!, imagePools.RESORT[1]!], amenities: ["WiFi miễn phí", "Hồ bơi", "Phòng xông hơi", "Ban công", "Điều hòa nhiệt độ"] },
  { id: "demo-villa-hoian-anbang", title: "An Bàng Pool Villa", description: "Biệt thự riêng tư gần biển An Bàng với hồ bơi xanh, khu bếp mở và sân vườn đầy nắng.", address: "Tổ 6, Khối An Bàng", city: "Hội An", type: "VILLA", price: 3200000, maxGuests: 8, bedroomCount: 4, bathrooms: 4, sizeM2: 240, images: imagePools.VILLA, amenities: ["WiFi miễn phí", "Hồ bơi", "Bếp", "Máy giặt", "Sân thượng / hiên"] },
  { id: "demo-villa-dalat-misty", title: "Misty Pine Villa Đà Lạt", description: "Biệt thự trên sườn đồi có lò sưởi, phòng khách lớn và khoảng vườn riêng giữa rừng thông.", address: "09 Đường Hoa Hồng, Hồ Tuyền Lâm", city: "Đà Lạt", type: "VILLA", price: 2600000, maxGuests: 10, bedroomCount: 5, bathrooms: 4, sizeM2: 280, images: [imagePools.VILLA[1]!, imagePools.VILLA[2]!, imagePools.VILLA[0]!], amenities: ["WiFi miễn phí", "Hệ thống sưởi", "Bếp", "Máy giặt", "Nhìn ra vườn"] },
  { id: "demo-villa-halong-sky", title: "Hạ Long Sky Villa", description: "Biệt thự hiện đại trên đồi, ôm trọn tầm nhìn vịnh Hạ Long cùng không gian sinh hoạt sang trọng.", address: "Đồi Monaco, Bãi Cháy", city: "Hạ Long", type: "VILLA", price: 3750000, maxGuests: 12, bedroomCount: 6, bathrooms: 5, sizeM2: 360, images: [imagePools.VILLA[2]!, imagePools.VILLA[0]!, imagePools.VILLA[1]!], amenities: ["WiFi miễn phí", "Hồ bơi", "Bếp", "Ban công", "Tầm nhìn ra khung cảnh"] },
];

async function main() {
  const password = await bcrypt.hash("TripNestDemo!2026", 12);
  const demoHost = await prisma.user.upsert({
    where: { email: "demo-host@tripnest.vn" },
    update: { name: "TripNest Demo Host", role: "HOST", isActive: true },
    create: { email: "demo-host@tripnest.vn", password, name: "TripNest Demo Host", role: "HOST", emailVerified: true },
  });

  for (const item of demoProperties) {
    await prisma.property.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        description: item.description,
        addressLine1: item.address,
        city: item.city,
        type: item.type,
        pricePerNight: item.price,
        maxGuests: item.maxGuests,
        bedroomCount: item.bedroomCount,
        bathrooms: item.bathrooms,
        sizeM2: item.sizeM2,
        status: "ACTIVE",
        bookingMethod: "INSTANT",
        hostId: demoHost.id,
      },
      create: {
        id: item.id,
        title: item.title,
        description: item.description,
        addressLine1: item.address,
        city: item.city,
        country: "Việt Nam",
        type: item.type,
        pricePerNight: item.price,
        maxGuests: item.maxGuests,
        bedroomCount: item.bedroomCount,
        bathrooms: item.bathrooms,
        childrenAllowed: true,
        cribsAvailable: true,
        sizeM2: item.sizeM2,
        breakfastIncluded: item.type === "HOTEL" || item.type === "RESORT",
        parkingType: "FREE",
        bookingMethod: "INSTANT",
        cancellationPolicy: "FLEXIBLE",
        cancellationFreeDays: 5,
        checkInFrom: "14:00",
        checkInTo: "22:00",
        checkOutFrom: "07:00",
        checkOutTo: "11:00",
        availabilityWindow: 365,
        longStayAllowed: item.type === "APARTMENT",
        maxStayNights: item.type === "APARTMENT" ? 60 : null,
        status: "ACTIVE",
        hostId: demoHost.id,
      },
    });

    await prisma.propertyImage.deleteMany({ where: { propertyId: item.id } });
    await prisma.propertyImage.createMany({ data: item.images.map((url, index) => ({ propertyId: item.id, url, isPrimary: index === 0 })) });
    await prisma.propertyBedroom.deleteMany({ where: { propertyId: item.id } });
    await prisma.propertyBedroom.createMany({ data: Array.from({ length: item.bedroomCount }, (_, index) => ({ propertyId: item.id, roomNumber: index + 1, kingBeds: 1 })) });
    await prisma.propertyLanguage.deleteMany({ where: { propertyId: item.id } });
    await prisma.propertyLanguage.createMany({ data: [{ propertyId: item.id, language: "Tiếng Việt" }, { propertyId: item.id, language: "Tiếng Anh" }] });
    await prisma.property.update({
      where: { id: item.id },
      data: {
        amenities: {
          set: [],
          connectOrCreate: item.amenities.map((name) => ({
            where: { name },
            create: { name, icon: AMENITY_ICONS[name] ?? null },
          })),
        },
      },
    });
  }

  // Backfill icons for any amenity that was previously created without one
  for (const [name, icon] of Object.entries(AMENITY_ICONS)) {
    await prisma.amenity.updateMany({ where: { name, icon: null }, data: { icon } });
  }

  const realListings = await prisma.property.updateMany({
    where: { id: { not: { startsWith: "demo-" } } },
    data: { bookingMethod: "REQUEST" },
  });

  console.log(`✨ Đã thêm/cập nhật ${demoProperties.length} chỗ nghỉ demo đặt tức thì.`);
  console.log(`🏠 Đã chuyển ${realListings.count} chỗ nghỉ thật sang chế độ Host duyệt.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
