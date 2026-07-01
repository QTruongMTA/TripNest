import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

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
        name: "Hoa hồng mặc định",
        description: "6% áp dụng cho tất cả các booking không thuộc nhóm trên",
        rate: 0.06,
        isActive: true,
      },
    ],
  });

  console.log(`  ✓ 2 commission rules`);

  console.log("\n✅ Seed hoàn tất!");
  console.log("   Admin: admin@tripnest.vn / tripnest");
  console.log(`   ${provinces.length} tỉnh/thành phố | 0 properties`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


