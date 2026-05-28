import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { tourImageUrls } from "./seed-images";

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

  // ── 34 đơn vị hành chính cấp tỉnh (danh sách mới) ──────────────────────────
  const provinces = await Promise.all([
    // 6 Thành phố trực thuộc TW
    prisma.province.create({ data: { name: "Hà Nội", code: "HN", type: "THANH_PHO" } }),
    prisma.province.create({ data: { name: "Hải Phòng", code: "HP", type: "THANH_PHO" } }),
    prisma.province.create({ data: { name: "Huế", code: "HUE", type: "THANH_PHO" } }),
    prisma.province.create({ data: { name: "Đà Nẵng", code: "DNA", type: "THANH_PHO" } }),
    prisma.province.create({ data: { name: "Cần Thơ", code: "CT", type: "THANH_PHO" } }),
    prisma.province.create({ data: { name: "Thành phố Hồ Chí Minh", code: "HCM", type: "THANH_PHO" } }),
    // 28 Tỉnh
    prisma.province.create({ data: { name: "An Giang", code: "AG", type: "TINH" } }),
    prisma.province.create({ data: { name: "Bắc Ninh", code: "BN", type: "TINH" } }),
    prisma.province.create({ data: { name: "Cao Bằng", code: "CB", type: "TINH" } }),
    prisma.province.create({ data: { name: "Cà Mau", code: "CM", type: "TINH" } }),
    prisma.province.create({ data: { name: "Điện Biên", code: "DB", type: "TINH" } }),
    prisma.province.create({ data: { name: "Đồng Nai", code: "DN", type: "TINH" } }),
    prisma.province.create({ data: { name: "Đồng Tháp", code: "DT", type: "TINH" } }),
    prisma.province.create({ data: { name: "Gia Lai", code: "GL", type: "TINH" } }),
    prisma.province.create({ data: { name: "Hà Tĩnh", code: "HT", type: "TINH" } }),
    prisma.province.create({ data: { name: "Hưng Yên", code: "HY", type: "TINH" } }),
    prisma.province.create({ data: { name: "Khánh Hòa", code: "KH", type: "TINH" } }),
    prisma.province.create({ data: { name: "Lai Châu", code: "LAI", type: "TINH" } }),
    prisma.province.create({ data: { name: "Lâm Đồng", code: "LD", type: "TINH" } }),
    prisma.province.create({ data: { name: "Lạng Sơn", code: "LS", type: "TINH" } }),
    prisma.province.create({ data: { name: "Lào Cai", code: "LC", type: "TINH" } }),
    prisma.province.create({ data: { name: "Long An", code: "LA", type: "TINH" } }),
    prisma.province.create({ data: { name: "Nghệ An", code: "NA", type: "TINH" } }),
    prisma.province.create({ data: { name: "Ninh Bình", code: "NB", type: "TINH" } }),
    prisma.province.create({ data: { name: "Ninh Thuận", code: "NT", type: "TINH" } }),
    prisma.province.create({ data: { name: "Phú Thọ", code: "PT", type: "TINH" } }),
    prisma.province.create({ data: { name: "Quảng Ngãi", code: "QNG", type: "TINH" } }),
    prisma.province.create({ data: { name: "Quảng Ninh", code: "QN", type: "TINH" } }),
    prisma.province.create({ data: { name: "Quảng Trị", code: "QT", type: "TINH" } }),
    prisma.province.create({ data: { name: "Sơn La", code: "SL", type: "TINH" } }),
    prisma.province.create({ data: { name: "Tây Ninh", code: "TN", type: "TINH" } }),
    prisma.province.create({ data: { name: "Thái Nguyên", code: "TNG", type: "TINH" } }),
    prisma.province.create({ data: { name: "Thanh Hóa", code: "TH", type: "TINH" } }),
    prisma.province.create({ data: { name: "Vĩnh Long", code: "VL", type: "TINH" } }),
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
  console.log(`   ${provinces.length} tỉnh/thành phố | 0 properties | 7 tours`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

