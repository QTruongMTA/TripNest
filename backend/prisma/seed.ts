import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { propertyImageUrls, tourImageUrls } from "./seed-images";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"]! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Bắt đầu seed dữ liệu...");

  // ── Dọn dữ liệu cũ ──────────────────────────────────────────────────────────
  await prisma.dispute.deleteMany();
  await prisma.hostApprovalRequest.deleteMany();
  await prisma.operatorTask.deleteMany();
  await prisma.operatorProvinceAssignment.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.promotionRedemption.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.tourAvailability.deleteMany();
  await prisma.tourInclusion.deleteMany();
  await prisma.tourItineraryDay.deleteMany();
  await prisma.tourImage.deleteMany();
  await prisma.tour.deleteMany();
  await prisma.propertyAvailability.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.property.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.commissionRule.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.province.deleteMany();
  await prisma.user.deleteMany();

  // ── Admin cố định ────────────────────────────────────────────────────────────
  const adminPw = await bcrypt.hash("tripnest", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@tripnest.vn",
      password: adminPw,
      name: "TripNest Admin",
      phone: "0901000000",
      role: "ADMIN",
      emailVerified: true,
    },
  });

  console.log(`  ✓ Admin: admin@tripnest.vn`);

  // ── 34 Đơn vị hành chính VN (sau sát nhập 2025) ─────────────────────────────
  const provinces = await Promise.all([
    // 6 Thành phố trực thuộc TW
    prisma.province.create({ data: { name: "Hà Nội", code: "HN", type: "THANH_PHO" } }),
    prisma.province.create({ data: { name: "Hồ Chí Minh", code: "HCM", type: "THANH_PHO" } }),
    prisma.province.create({ data: { name: "Đà Nẵng", code: "DNA", type: "THANH_PHO" } }),
    prisma.province.create({ data: { name: "Hải Phòng", code: "HP", type: "THANH_PHO" } }),
    prisma.province.create({ data: { name: "Cần Thơ", code: "CT", type: "THANH_PHO" } }),
    prisma.province.create({ data: { name: "Huế", code: "HUE", type: "THANH_PHO" } }),
    // 28 Tỉnh
    prisma.province.create({ data: { name: "An Giang", code: "AG", type: "TINH" } }),
    prisma.province.create({ data: { name: "Bà Rịa - Vũng Tàu", code: "BRVT", type: "TINH" } }),
    prisma.province.create({ data: { name: "Bắc Giang", code: "BG", type: "TINH" } }),
    prisma.province.create({ data: { name: "Bắc Kạn", code: "BK", type: "TINH" } }),
    prisma.province.create({ data: { name: "Bình Dương", code: "BD", type: "TINH" } }),
    prisma.province.create({ data: { name: "Bình Định", code: "BDH", type: "TINH" } }),
    prisma.province.create({ data: { name: "Bình Thuận", code: "BTH", type: "TINH" } }),
    prisma.province.create({ data: { name: "Cà Mau", code: "CM", type: "TINH" } }),
    prisma.province.create({ data: { name: "Cao Bằng", code: "CB", type: "TINH" } }),
    prisma.province.create({ data: { name: "Đắk Lắk", code: "DLK", type: "TINH" } }),
    prisma.province.create({ data: { name: "Điện Biên", code: "DB", type: "TINH" } }),
    prisma.province.create({ data: { name: "Đồng Nai", code: "DN", type: "TINH" } }),
    prisma.province.create({ data: { name: "Đồng Tháp", code: "DT", type: "TINH" } }),
    prisma.province.create({ data: { name: "Gia Lai", code: "GL", type: "TINH" } }),
    prisma.province.create({ data: { name: "Hà Giang", code: "HG", type: "TINH" } }),
    prisma.province.create({ data: { name: "Hà Nam", code: "HN2", type: "TINH" } }),
    prisma.province.create({ data: { name: "Hà Tĩnh", code: "HT", type: "TINH" } }),
    prisma.province.create({ data: { name: "Khánh Hòa", code: "KH", type: "TINH" } }),
    prisma.province.create({ data: { name: "Lào Cai", code: "LC", type: "TINH" } }),
    prisma.province.create({ data: { name: "Long An", code: "LA", type: "TINH" } }),
    prisma.province.create({ data: { name: "Nam Định", code: "ND", type: "TINH" } }),
    prisma.province.create({ data: { name: "Ninh Bình", code: "NB", type: "TINH" } }),
    prisma.province.create({ data: { name: "Phú Thọ", code: "PT", type: "TINH" } }),
    prisma.province.create({ data: { name: "Quảng Bình", code: "QB", type: "TINH" } }),
    prisma.province.create({ data: { name: "Sơn La", code: "SL", type: "TINH" } }),
    prisma.province.create({ data: { name: "Tây Ninh", code: "TN", type: "TINH" } }),
    prisma.province.create({ data: { name: "Thanh Hóa", code: "TH", type: "TINH" } }),
    prisma.province.create({ data: { name: "Trà Vinh", code: "TV", type: "TINH" } }),
  ]);

  console.log(`  ✓ ${provinces.length} tỉnh/thành phố`);

  // ── Tiện nghi ────────────────────────────────────────────────────────────────
  const amenityNames = [
    { name: "WiFi miễn phí", icon: "wifi" },
    { name: "Hồ bơi", icon: "pool" },
    { name: "Điều hòa nhiệt độ", icon: "ac_unit" },
    { name: "Bãi đỗ xe", icon: "local_parking" },
    { name: "Bếp đầy đủ tiện nghi", icon: "kitchen" },
    { name: "Máy giặt", icon: "local_laundry_service" },
    { name: "Smart TV", icon: "tv" },
    { name: "Ban công view đẹp", icon: "balcony" },
    { name: "Phòng tập gym", icon: "fitness_center" },
    { name: "Lò sưởi", icon: "fireplace" },
  ];

  const amenities = await Promise.all(
    amenityNames.map((a) => prisma.amenity.create({ data: a }))
  );

  const [wifi, pool, ac, parking, kitchen, washer, tv, balcony, gym, heater] =
    amenities as [
      typeof amenities[0], typeof amenities[1], typeof amenities[2],
      typeof amenities[3], typeof amenities[4], typeof amenities[5],
      typeof amenities[6], typeof amenities[7], typeof amenities[8],
      typeof amenities[9],
    ];

  console.log(`  ✓ ${amenities.length} amenities`);

  // ── Mã khuyến mãi ────────────────────────────────────────────────────────────
  await prisma.promotion.create({
    data: {
      code: "WELCOME10",
      description: "Giảm 10% cho lần đặt phòng đầu tiên",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderValue: 500000,
      maxUses: 100,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      isActive: true,
    },
  });

  await prisma.promotion.create({
    data: {
      code: "SUMMER500",
      description: "Giảm 200.000đ cho đặt phòng mùa hè",
      discountType: "FIXED_AMOUNT",
      discountValue: 200000,
      minOrderValue: 1500000,
      maxUses: 50,
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-08-31"),
      isActive: true,
    },
  });

  await prisma.promotion.create({
    data: {
      code: "VIP2M",
      description: "Giảm 500.000đ cho đơn từ 5 triệu trở lên",
      discountType: "FIXED_AMOUNT",
      discountValue: 500000,
      minOrderValue: 5000000,
      maxUses: 20,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      isActive: true,
    },
  });

  await prisma.promotion.create({
    data: {
      code: "NORTH300",
      description: "Giảm 300.000đ cho chuyến đi miền Bắc",
      discountType: "FIXED_AMOUNT",
      discountValue: 300000,
      minOrderValue: 2000000,
      maxUses: 80,
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-09-30"),
      isActive: true,
    },
  });

  await prisma.promotion.create({
    data: {
      code: "WEEKEND15",
      description: "Giảm 15% cho đặt phòng cuối tuần",
      discountType: "PERCENTAGE",
      discountValue: 15,
      minOrderValue: 1200000,
      maxUses: 120,
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-08-31"),
      isActive: true,
    },
  });

  console.log(`  ✓ 5 promotions`);

  // ── Quy tắc hoa hồng ─────────────────────────────────────────────────────────
  await prisma.commissionRule.createMany({
    data: [
      {
        name: "Hoa hồng Property tiêu chuẩn",
        description: "5% trên giá trị booking property từ 1 triệu trở lên",
        rate: 0.05,
        listingType: "PROPERTY",
        minBookingValue: 1000000,
        isActive: true,
      },
      {
        name: "Hoa hồng Tour tiêu chuẩn",
        description: "8% trên giá trị booking tour từ 500k trở lên",
        rate: 0.08,
        listingType: "TOUR",
        minBookingValue: 500000,
        isActive: true,
      },
      {
        name: "Hoa hồng mặc định",
        description: "6% áp dụng cho tất cả các booking không thuộc nhóm trên",
        rate: 0.06,
        isActive: true,
      },
    ],
  });

  console.log(`  ✓ 3 commission rules`);

  // ── Chỗ ở (gán cho admin) ────────────────────────────────────────────────────
  const prop1 = await prisma.property.create({
    data: {
      title: "Villa Biển Đà Nẵng – View Biển Tuyệt Đẹp",
      description: "Villa sang trọng ngay mặt biển Mỹ Khê với view biển toàn cảnh. Không gian rộng rãi, hồ bơi riêng và sân vườn xanh mát. Phù hợp cho gia đình hoặc nhóm bạn muốn trải nghiệm kỳ nghỉ đẳng cấp.",
      addressLine1: "24 Võ Nguyên Giáp, Phước Mỹ, Sơn Trà", city: "Đà Nẵng", country: "Việt Nam",
      latitude: 16.0544, longitude: 108.2242, pricePerNight: 3500000, cleaningFee: 300000,
      maxGuests: 8, bedroomCount: 3, bathrooms: 2, type: "VILLA", status: "ACTIVE",
      cancellationPolicy: "FLEXIBLE", checkInFrom: "14:00", checkOutTo: "12:00",
      hostId: admin.id,
      amenities: { connect: [wifi, pool, ac, parking, balcony].map((a) => ({ id: a.id })) },
    },
  });

  const prop2 = await prisma.property.create({
    data: {
      title: "Căn Hộ Studio Tây Hồ – Gần Hồ Tây",
      description: "Căn hộ studio hiện đại tại khu vực Tây Hồ yên tĩnh. Thiết kế tối giản, đầy đủ nội thất cao cấp, phù hợp cho cặp đôi hay khách công tác.",
      addressLine1: "15 Xuân Diệu, Tây Hồ", city: "Hà Nội", country: "Việt Nam",
      latitude: 21.0553, longitude: 105.8262, pricePerNight: 850000, cleaningFee: 100000,
      maxGuests: 2, bedroomCount: 1, bathrooms: 1, type: "APARTMENT", status: "ACTIVE",
      cancellationPolicy: "MODERATE", checkInFrom: "15:00", checkOutTo: "11:00",
      hostId: admin.id,
      amenities: { connect: [wifi, ac, tv, kitchen].map((a) => ({ id: a.id })) },
    },
  });

  const prop3 = await prisma.property.create({
    data: {
      title: "Homestay Bản Làng Sapa – Trải Nghiệm Văn Hóa H'Mông",
      description: "Nhà sàn truyền thống của người H'Mông giữa lòng bản Hầu Thào, nhìn ra ruộng bậc thang tuyệt đẹp. Bữa sáng tự nấu được bao gồm.",
      addressLine1: "Thôn Hầu Thào, Sapa", city: "Sapa", country: "Việt Nam",
      latitude: 22.3363, longitude: 103.8438, pricePerNight: 650000, cleaningFee: 80000,
      maxGuests: 4, bedroomCount: 2, bathrooms: 1, type: "HOMESTAY", status: "ACTIVE",
      cancellationPolicy: "FLEXIBLE", checkInFrom: "13:00", checkOutTo: "11:00",
      hostId: admin.id,
      amenities: { connect: [wifi, heater, balcony].map((a) => ({ id: a.id })) },
    },
  });

  const prop4 = await prisma.property.create({
    data: {
      title: "Resort Ven Biển Phú Quốc – Sang Trọng Đẳng Cấp",
      description: "Resort 5 sao tư nhân nằm trên bãi biển riêng tại Phú Quốc. Hồ bơi vô cực, phòng gym hiện đại, bếp đầy đủ.",
      addressLine1: "Bãi Trường, Dương Tơ, Phú Quốc", city: "Phú Quốc", country: "Việt Nam",
      latitude: 10.2899, longitude: 103.9840, pricePerNight: 6500000, cleaningFee: 500000,
      maxGuests: 10, bedroomCount: 4, bathrooms: 3, type: "RESORT", status: "ACTIVE",
      cancellationPolicy: "STRICT", checkInFrom: "14:00", checkOutTo: "12:00",
      hostId: admin.id,
      amenities: { connect: [wifi, pool, ac, parking, kitchen, gym, balcony].map((a) => ({ id: a.id })) },
    },
  });

  const prop5 = await prisma.property.create({
    data: {
      title: "Khách Sạn Vịnh Hạ Long – Gần Bến Tàu",
      description: "Khách sạn hiện đại tại Bãi Cháy, thuận tiện di chuyển ra cảng tàu. Phòng sáng, ban công thoáng.",
      addressLine1: "Bãi Cháy, Hạ Long", city: "Hạ Long", country: "Việt Nam",
      latitude: 20.9517, longitude: 107.0808, pricePerNight: 1200000, cleaningFee: 120000,
      maxGuests: 3, bedroomCount: 1, bathrooms: 1, type: "HOTEL", status: "ACTIVE",
      cancellationPolicy: "MODERATE", checkInFrom: "14:00", checkOutTo: "12:00",
      hostId: admin.id,
      amenities: { connect: [wifi, ac, parking, balcony].map((a) => ({ id: a.id })) },
    },
  });

  const prop6 = await prisma.property.create({
    data: {
      title: "Lodge Đá Hà Giang – View Núi",
      description: "Lodge nhỏ giữa cao nguyên đá, cửa sổ lớn nhìn ra thung lũng. Phù hợp khách thích không khí mộc mạc.",
      addressLine1: "Quản Bạ, Hà Giang", city: "Hà Giang", country: "Việt Nam",
      latitude: 23.0686, longitude: 105.0113, pricePerNight: 780000, cleaningFee: 80000,
      maxGuests: 4, bedroomCount: 2, bathrooms: 1, type: "HOMESTAY", status: "ACTIVE",
      cancellationPolicy: "FLEXIBLE", checkInFrom: "13:00", checkOutTo: "11:00",
      hostId: admin.id,
      amenities: { connect: [wifi, heater, balcony].map((a) => ({ id: a.id })) },
    },
  });

  const prop7 = await prisma.property.create({
    data: {
      title: "Farmstay Mộc Châu – Giữa Đồi Chè",
      description: "Farmstay xanh mát giữa đồi chè, sân vườn rộng và khu bếp chung.",
      addressLine1: "Tân Lập, Mộc Châu", city: "Mộc Châu", country: "Việt Nam",
      latitude: 20.9228, longitude: 104.7525, pricePerNight: 920000, cleaningFee: 90000,
      maxGuests: 5, bedroomCount: 2, bathrooms: 1, type: "HOMESTAY", status: "ACTIVE",
      cancellationPolicy: "FLEXIBLE", checkInFrom: "14:00", checkOutTo: "11:00",
      hostId: admin.id,
      amenities: { connect: [wifi, kitchen, parking, balcony].map((a) => ({ id: a.id })) },
    },
  });

  const prop8 = await prisma.property.create({
    data: {
      title: "Retreat Tam Cốc – Ven Núi",
      description: "Khu nghỉ nhỏ gần Tam Cốc với sân hiên nhìn ra núi đá vôi.",
      addressLine1: "Tam Cốc, Ninh Bình", city: "Ninh Bình", country: "Việt Nam",
      latitude: 20.2157, longitude: 105.9372, pricePerNight: 1450000, cleaningFee: 120000,
      maxGuests: 4, bedroomCount: 2, bathrooms: 1, type: "RESORT", status: "ACTIVE",
      cancellationPolicy: "MODERATE", checkInFrom: "14:00", checkOutTo: "12:00",
      hostId: admin.id,
      amenities: { connect: [wifi, pool, ac, parking, balcony].map((a) => ({ id: a.id })) },
    },
  });

  const prop9 = await prisma.property.create({
    data: {
      title: "Villa Vườn Hội An – Gần Phố Cổ",
      description: "Villa yên tĩnh có hồ bơi nhỏ, sân vườn và xe đạp miễn phí, cách phố cổ vài phút.",
      addressLine1: "Cẩm Châu, Hội An", city: "Hội An", country: "Việt Nam",
      latitude: 15.8801, longitude: 108.3380, pricePerNight: 1850000, cleaningFee: 150000,
      maxGuests: 5, bedroomCount: 2, bathrooms: 2, type: "VILLA", status: "ACTIVE",
      cancellationPolicy: "MODERATE", checkInFrom: "14:00", checkOutTo: "12:00",
      hostId: admin.id,
      amenities: { connect: [wifi, pool, ac, kitchen, balcony].map((a) => ({ id: a.id })) },
    },
  });

  const prop10 = await prisma.property.create({
    data: {
      title: "Cabin Thông Đà Lạt – Săn Mây Sáng Sớm",
      description: "Cabin gỗ giữa đồi thông, có lò sưởi và ban công rộng nhìn xuống thung lũng.",
      addressLine1: "Trại Mát, Đà Lạt", city: "Đà Lạt", country: "Việt Nam",
      latitude: 11.9450, longitude: 108.4810, pricePerNight: 1350000, cleaningFee: 120000,
      maxGuests: 4, bedroomCount: 2, bathrooms: 1, type: "HOUSE", status: "ACTIVE",
      cancellationPolicy: "FLEXIBLE", checkInFrom: "14:00", checkOutTo: "11:00",
      hostId: admin.id,
      amenities: { connect: [wifi, heater, balcony, kitchen].map((a) => ({ id: a.id })) },
    },
  });

  const prop11 = await prisma.property.create({
    data: {
      title: "Khách Sạn Biển Nha Trang – View Vịnh",
      description: "Khách sạn sát biển, phòng sáng, có hồ bơi tầng thượng và buffet sáng.",
      addressLine1: "Trần Phú, Nha Trang", city: "Nha Trang", country: "Việt Nam",
      latitude: 12.2388, longitude: 109.1967, pricePerNight: 1650000, cleaningFee: 100000,
      maxGuests: 3, bedroomCount: 1, bathrooms: 1, type: "HOTEL", status: "ACTIVE",
      cancellationPolicy: "MODERATE", checkInFrom: "14:00", checkOutTo: "12:00",
      hostId: admin.id,
      amenities: { connect: [wifi, pool, ac, balcony, gym].map((a) => ({ id: a.id })) },
    },
  });

  const prop12 = await prisma.property.create({
    data: {
      title: "Nhà Sông Cần Thơ – Bến Ninh Kiều",
      description: "Nhà nghỉ phong cách địa phương gần bến Ninh Kiều, phù hợp gia đình nhỏ.",
      addressLine1: "Ninh Kiều, Cần Thơ", city: "Cần Thơ", country: "Việt Nam",
      latitude: 10.0342, longitude: 105.7832, pricePerNight: 780000, cleaningFee: 70000,
      maxGuests: 4, bedroomCount: 2, bathrooms: 1, type: "HOUSE", status: "ACTIVE",
      cancellationPolicy: "FLEXIBLE", checkInFrom: "13:00", checkOutTo: "11:00",
      hostId: admin.id,
      amenities: { connect: [wifi, ac, kitchen].map((a) => ({ id: a.id })) },
    },
  });

  const prop13 = await prisma.property.create({
    data: {
      title: "Căn Hộ Ven Biển Vũng Tàu",
      description: "Căn hộ hiện đại gần Bãi Sau, có bếp riêng và ban công nhìn biển.",
      addressLine1: "Thùy Vân, Vũng Tàu", city: "Vũng Tàu", country: "Việt Nam",
      latitude: 10.3460, longitude: 107.0843, pricePerNight: 1150000, cleaningFee: 100000,
      maxGuests: 4, bedroomCount: 2, bathrooms: 1, type: "APARTMENT", status: "ACTIVE",
      cancellationPolicy: "MODERATE", checkInFrom: "14:00", checkOutTo: "12:00",
      hostId: admin.id,
      amenities: { connect: [wifi, ac, kitchen, washer, balcony].map((a) => ({ id: a.id })) },
    },
  });

  const prop14 = await prisma.property.create({
    data: {
      title: "Khách Sạn Cố Đô Huế",
      description: "Khách sạn boutique gần Đại Nội, thiết kế pha nét truyền thống và hiện đại.",
      addressLine1: "Lê Lợi, Huế", city: "Huế", country: "Việt Nam",
      latitude: 16.4637, longitude: 107.5909, pricePerNight: 980000, cleaningFee: 80000,
      maxGuests: 3, bedroomCount: 1, bathrooms: 1, type: "HOTEL", status: "ACTIVE",
      cancellationPolicy: "FLEXIBLE", checkInFrom: "14:00", checkOutTo: "12:00",
      hostId: admin.id,
      amenities: { connect: [wifi, ac, parking].map((a) => ({ id: a.id })) },
    },
  });

  const prop15 = await prisma.property.create({
    data: {
      title: "Nhà Phố Hải Phòng – Gần Nhà Hát Lớn",
      description: "Nhà phố tiện nghi cho nhóm bạn, gần trung tâm và nhiều quán ăn địa phương.",
      addressLine1: "Hồng Bàng, Hải Phòng", city: "Hải Phòng", country: "Việt Nam",
      latitude: 20.8449, longitude: 106.6881, pricePerNight: 1280000, cleaningFee: 100000,
      maxGuests: 6, bedroomCount: 3, bathrooms: 2, type: "HOUSE", status: "ACTIVE",
      cancellationPolicy: "MODERATE", checkInFrom: "14:00", checkOutTo: "11:00",
      hostId: admin.id,
      amenities: { connect: [wifi, ac, kitchen, washer, parking].map((a) => ({ id: a.id })) },
    },
  });

  const prop16 = await prisma.property.create({
    data: {
      title: "Resort Ghềnh Ráng Quy Nhơn",
      description: "Resort ven biển với hồ bơi, nhà hàng và khu vườn nhiệt đới.",
      addressLine1: "Ghềnh Ráng, Quy Nhơn", city: "Quy Nhơn", country: "Việt Nam",
      latitude: 13.7563, longitude: 109.2193, pricePerNight: 2450000, cleaningFee: 180000,
      maxGuests: 5, bedroomCount: 2, bathrooms: 2, type: "RESORT", status: "ACTIVE",
      cancellationPolicy: "STRICT", checkInFrom: "14:00", checkOutTo: "12:00",
      hostId: admin.id,
      amenities: { connect: [wifi, pool, ac, parking, balcony, gym].map((a) => ({ id: a.id })) },
    },
  });

  console.log(`  ✓ 16 properties`);

  // ── Ảnh chỗ ở ────────────────────────────────────────────────────────────────
  await prisma.propertyImage.createMany({
    data: [
      ...propertyImageUrls.daNangVilla.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop1.id })),
      ...propertyImageUrls.tayHoStudio.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop2.id })),
      ...propertyImageUrls.sapaHomestay.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop3.id })),
      ...propertyImageUrls.phuQuocResort.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop4.id })),
      ...propertyImageUrls.haLongHotel.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop5.id })),
      ...propertyImageUrls.haGiangLodge.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop6.id })),
      ...propertyImageUrls.mocChauFarmstay.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop7.id })),
      ...propertyImageUrls.ninhBinhRetreat.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop8.id })),
      ...propertyImageUrls.hoiAnVilla.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop9.id })),
      ...propertyImageUrls.daLatCabin.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop10.id })),
      ...propertyImageUrls.nhaTrangHotel.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop11.id })),
      ...propertyImageUrls.canThoHouse.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop12.id })),
      ...propertyImageUrls.vungTauApartment.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop13.id })),
      ...propertyImageUrls.hueHotel.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop14.id })),
      ...propertyImageUrls.haiPhongHouse.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop15.id })),
      ...propertyImageUrls.quyNhonResort.map((url, i) => ({ url, isPrimary: i === 0, propertyId: prop16.id })),
    ],
  });

  console.log(`  ✓ property images`);

  // ── Chặn lịch mẫu ────────────────────────────────────────────────────────────
  await prisma.propertyAvailability.createMany({
    data: [
      { propertyId: prop1.id, date: new Date("2026-06-14"), status: "BLOCKED", reason: "Chủ nhà giữ chỗ cho gia đình" },
      { propertyId: prop1.id, date: new Date("2026-06-15"), status: "MAINTENANCE", reason: "Bảo trì hồ bơi" },
      { propertyId: prop2.id, date: new Date("2026-06-20"), status: "BLOCKED", reason: "Không nhận khách ngày này" },
      { propertyId: prop4.id, date: new Date("2026-07-01"), status: "MAINTENANCE", reason: "Bảo trì hệ thống điều hòa" },
    ],
  });

  // ── Tours ─────────────────────────────────────────────────────────────────────
  const tour1 = await prisma.tour.create({
    data: {
      title: "Tour 3 Ngày Đà Nẵng – Hội An – Bà Nà Hills",
      description: "Hành trình khám phá bộ ba điểm đến nổi tiếng nhất miền Trung: phố cổ Hội An lãng mạn, cầu Vàng Bà Nà Hills ngoạn mục và bãi biển Mỹ Khê trong xanh.",
      city: "Đà Nẵng", country: "Việt Nam", pricePerPerson: 1500000, durationDays: 3,
      minGroupSize: 2, maxGroupSize: 15, category: "BEACH", status: "ACTIVE",
      cancellationHours: 48, cancellationPolicy: "FLEXIBLE", hostId: admin.id,
    },
  });

  const tour2 = await prisma.tour.create({
    data: {
      title: "Trekking Sapa – Chinh Phục Fansipan 2 Ngày 1 Đêm",
      description: "Trekking qua các bản làng dân tộc H'Mông, Dao Đỏ, chiêm ngưỡng ruộng bậc thang kỳ vĩ và leo cáp treo khám phá đỉnh Fansipan.",
      city: "Sapa", country: "Việt Nam", pricePerPerson: 1800000, durationDays: 2,
      minGroupSize: 4, maxGroupSize: 12, category: "ADVENTURE", status: "ACTIVE",
      cancellationHours: 72, cancellationPolicy: "MODERATE", hostId: admin.id,
    },
  });

  const tour3 = await prisma.tour.create({
    data: {
      title: "Tour Ẩm Thực Hà Nội – Khám Phá 36 Phố Phường",
      description: "Trải nghiệm 1 ngày đắm chìm trong ẩm thực đường phố Hà Nội: bún bò, bún chả, phở, bánh mì và cà phê trứng.",
      city: "Hà Nội", country: "Việt Nam", pricePerPerson: 450000, durationDays: 1,
      minGroupSize: 2, maxGroupSize: 20, category: "FOOD", status: "ACTIVE",
      cancellationHours: 24, cancellationPolicy: "FLEXIBLE", hostId: admin.id,
    },
  });

  const tour4 = await prisma.tour.create({
    data: {
      title: "Cruising Hạ Long 2 Ngày 1 Đêm – Kayak & Hang Động",
      description: "Du thuyền 2 ngày 1 đêm trên Vịnh Hạ Long, khám phá hang động, chèo kayak và câu mực đêm.",
      city: "Hạ Long", country: "Việt Nam", pricePerPerson: 2200000, durationDays: 2,
      minGroupSize: 2, maxGroupSize: 30, category: "NATURE", status: "ACTIVE",
      cancellationHours: 72, cancellationPolicy: "STRICT", hostId: admin.id,
    },
  });

  const tour5 = await prisma.tour.create({
    data: {
      title: "Khám Phá Mù Cang Chải – Mùa Vàng Lúa Chín",
      description: "Tour 3 ngày chinh phục ruộng bậc thang Mù Cang Chải mùa lúa chín vàng, cắm trại và giao lưu cùng đồng bào.",
      city: "Mù Cang Chải", country: "Việt Nam", pricePerPerson: 2800000, durationDays: 3,
      minGroupSize: 4, maxGroupSize: 15, category: "ADVENTURE", status: "ACTIVE",
      cancellationHours: 96, cancellationPolicy: "MODERATE", hostId: admin.id,
    },
  });

  const tour6 = await prisma.tour.create({
    data: {
      title: "Phố Cổ Hội An – Đêm Hoa Đăng & Làng Nghề",
      description: "Tour 1 ngày tham quan làng gốm Thanh Hà, làng rau Trà Quế, thả đèn hoa đăng trên sông Hoài.",
      city: "Hội An", country: "Việt Nam", pricePerPerson: 380000, durationDays: 1,
      minGroupSize: 2, maxGroupSize: 25, category: "CULTURAL", status: "ACTIVE",
      cancellationHours: 24, cancellationPolicy: "FLEXIBLE", hostId: admin.id,
    },
  });

  const tour7 = await prisma.tour.create({
    data: {
      title: "Lặn Biển Phú Quốc – Khám Phá San Hô",
      description: "Tour lặn biển 1 ngày tại vùng biển phía Nam Phú Quốc, khám phá rạn san hô đa dạng cùng hướng dẫn viên chuyên nghiệp.",
      city: "Phú Quốc", country: "Việt Nam", pricePerPerson: 990000, durationDays: 1,
      minGroupSize: 2, maxGroupSize: 20, category: "BEACH", status: "ACTIVE",
      cancellationHours: 48, cancellationPolicy: "MODERATE", hostId: admin.id,
    },
  });

  console.log(`  ✓ 7 tours`);

  // ── Ảnh tour ─────────────────────────────────────────────────────────────────
  await prisma.tourImage.createMany({
    data: [
      ...tourImageUrls.daNangTour.map((url, i) => ({ url, isPrimary: i === 0, tourId: tour1.id })),
      ...tourImageUrls.sapaTour.map((url, i) => ({ url, isPrimary: i === 0, tourId: tour2.id })),
      ...tourImageUrls.haNoiTour.map((url, i) => ({ url, isPrimary: i === 0, tourId: tour3.id })),
      ...tourImageUrls.haLongCruise.map((url, i) => ({ url, isPrimary: i === 0, tourId: tour4.id })),
      ...tourImageUrls.ninhBinhTour.map((url, i) => ({ url, isPrimary: i === 0, tourId: tour5.id })),
      ...tourImageUrls.hoiAnTour.map((url, i) => ({ url, isPrimary: i === 0, tourId: tour6.id })),
      ...tourImageUrls.phuQuocTour.map((url, i) => ({ url, isPrimary: i === 0, tourId: tour7.id })),
    ],
  });

  // ── Lộ trình tour ────────────────────────────────────────────────────────────
  await prisma.tourItineraryDay.createMany({
    data: [
      { tourId: tour1.id, dayNumber: 1, title: "Đà Nẵng – Hội An", description: "Đến Đà Nẵng, tham quan Cầu Rồng, Chùa Linh Ứng. Chiều di chuyển Hội An, dạo phố cổ." },
      { tourId: tour1.id, dayNumber: 2, title: "Bà Nà Hills – Cầu Vàng", description: "Cáp treo lên Bà Nà Hills, check-in Cầu Vàng, thăm làng Pháp cổ kính." },
      { tourId: tour1.id, dayNumber: 3, title: "Biển Mỹ Khê – Bay về", description: "Tắm biển Mỹ Khê buổi sáng, mua sắm hải sản, ra sân bay." },
      { tourId: tour2.id, dayNumber: 1, title: "Hà Nội → Sapa", description: "Xe giường nằm đêm từ Hà Nội, đến Sapa sáng sớm. Trekking bản Cát Cát, Bản Hồ." },
      { tourId: tour2.id, dayNumber: 2, title: "Fansipan", description: "Cáp treo lên đỉnh Fansipan 3.143m. Chiều về Hà Nội bằng tàu hỏa." },
      { tourId: tour4.id, dayNumber: 1, title: "Lên tàu – Khám phá vịnh", description: "Khởi hành từ cảng Tuần Châu, ghé Hang Sửng Sốt, bơi lội, ăn tối trên tàu." },
      { tourId: tour4.id, dayNumber: 2, title: "Kayak & quay về", description: "Chèo kayak buổi sáng, thăm làng chài nổi, ăn trưa trên tàu, về cảng." },
      { tourId: tour5.id, dayNumber: 1, title: "Hà Nội → Mù Cang Chải", description: "Di chuyển lên Mù Cang Chải, chiều ngắm ruộng bậc thang từ đỉnh đèo Khau Phạ." },
      { tourId: tour5.id, dayNumber: 2, title: "Trekking bản làng", description: "Trekking qua các bản La Pán Tẩn, Chế Cu Nha, gặp gỡ đồng bào Mông." },
      { tourId: tour5.id, dayNumber: 3, title: "Chụp ảnh & về Hà Nội", description: "Chụp ảnh mùa vàng sáng sớm, về Hà Nội buổi tối." },
    ],
  });

  // ── Vật phẩm đi kèm ──────────────────────────────────────────────────────────
  await prisma.tourInclusion.createMany({
    data: [
      { tourId: tour1.id, type: "INCLUDED", item: "Xe đưa đón sân bay" },
      { tourId: tour1.id, type: "INCLUDED", item: "2 đêm khách sạn 3 sao" },
      { tourId: tour1.id, type: "INCLUDED", item: "Vé cáp treo Bà Nà Hills" },
      { tourId: tour1.id, type: "EXCLUDED", item: "Bữa ăn trưa và tối" },
      { tourId: tour2.id, type: "INCLUDED", item: "Xe giường nằm Hà Nội – Lào Cai" },
      { tourId: tour2.id, type: "INCLUDED", item: "Hướng dẫn viên người địa phương" },
      { tourId: tour2.id, type: "INCLUDED", item: "Vé cáp treo Fansipan" },
      { tourId: tour2.id, type: "EXCLUDED", item: "Chi phí cá nhân" },
      { tourId: tour4.id, type: "INCLUDED", item: "2 bữa ăn trên tàu" },
      { tourId: tour4.id, type: "INCLUDED", item: "Dụng cụ chèo kayak" },
      { tourId: tour4.id, type: "EXCLUDED", item: "Đồ uống có cồn" },
    ],
  });

  // ── Lịch tour ─────────────────────────────────────────────────────────────────
  const tourDates = [
    { tourId: tour1.id, date: new Date("2026-06-01"), slotsTotal: 15 },
    { tourId: tour1.id, date: new Date("2026-06-15"), slotsTotal: 15 },
    { tourId: tour1.id, date: new Date("2026-07-01"), slotsTotal: 15 },
    { tourId: tour2.id, date: new Date("2026-06-05"), slotsTotal: 12 },
    { tourId: tour2.id, date: new Date("2026-06-20"), slotsTotal: 12 },
    { tourId: tour3.id, date: new Date("2026-06-01"), slotsTotal: 20 },
    { tourId: tour3.id, date: new Date("2026-06-08"), slotsTotal: 20 },
    { tourId: tour4.id, date: new Date("2026-06-10"), slotsTotal: 30 },
    { tourId: tour4.id, date: new Date("2026-06-25"), slotsTotal: 30 },
    { tourId: tour5.id, date: new Date("2026-09-20"), slotsTotal: 15 },
    { tourId: tour5.id, date: new Date("2026-10-05"), slotsTotal: 15 },
    { tourId: tour6.id, date: new Date("2026-06-01"), slotsTotal: 25 },
    { tourId: tour7.id, date: new Date("2026-06-01"), slotsTotal: 20 },
    { tourId: tour7.id, date: new Date("2026-06-15"), slotsTotal: 20 },
  ];

  await prisma.tourAvailability.createMany({ data: tourDates });

  console.log(`  ✓ tour itineraries, inclusions & availability`);

  console.log("\n✅ Seed hoàn tất!");
  console.log("   Admin: admin@tripnest.vn / tripnest");
  console.log(`   ${provinces.length} tỉnh/thành phố | 16 properties | 7 tours`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

