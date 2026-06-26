import { BookingForm } from "@/components/booking/BookingForm";
import type { PropertyDetail } from "@/types/property";
import Image from "next/image";
import { notFound } from "next/navigation";

type PropertyDetailResponse = {
  data: PropertyDetail;
};

const cancellationLabels: Record<string, string> = {
  FLEXIBLE: "Linh hoạt",
  MODERATE: "Trung bình",
  STRICT: "Nghiêm ngặt",
  NON_REFUNDABLE: "Không hoàn tiền",
};

const propertyTypeLabels: Record<string, string> = {
  HOTEL: "Khách sạn",
  APARTMENT: "Căn hộ",
  RESORT: "Resort",
  VILLA: "Biệt thự",
  HOUSE: "Nhà",
  HOMESTAY: "Homestay",
  UNIQUE: "Chỗ nghỉ độc đáo",
};

const parkingLabels: Record<string, string> = {
  FREE: "Chỗ đậu xe miễn phí",
  PAID: "Chỗ đậu xe có tính phí",
  NOT_AVAILABLE: "Không có chỗ đậu xe",
};

const petLabels: Record<string, string> = {
  ALLOWED: "Cho phép thú cưng",
  ON_REQUEST: "Thú cưng theo yêu cầu",
  NOT_ALLOWED: "Không cho phép thú cưng",
};

async function getProperty(id: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/properties/${id}`,
    { cache: "no-store" }
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("Không thể tải chi tiết chỗ ở");
  }

  return ((await response.json()) as PropertyDetailResponse).data;
}

function formatAddress(property: PropertyDetail) {
  return [
    property.address.line1,
    property.address.line2,
    property.address.city,
    property.address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatTimeRange(range: { from: string | null; to: string | null }) {
  if (range.from && range.to) return `${range.from} - ${range.to}`;
  return range.from ?? range.to ?? "—";
}

function getTotalBeds(property: PropertyDetail) {
  const bedroomBeds = property.bedrooms.reduce(
    (total, bedroom) =>
      total +
      bedroom.singleBeds +
      bedroom.doubleBeds +
      bedroom.kingBeds +
      bedroom.superKingBeds +
      bedroom.bunkBeds +
      bedroom.sofaBeds +
      bedroom.futonBeds,
    0
  );
  return bedroomBeds + property.livingRoomSofaBeds;
}

function formatHouseRules(property: PropertyDetail) {
  const rules = [
    property.policies.smokingAllowed ? "Cho phép hút thuốc" : "Không hút thuốc",
    property.policies.partiesAllowed ? "Cho phép tiệc/sự kiện" : "Không tổ chức tiệc/sự kiện",
    petLabels[property.policies.petsPolicy] ?? property.policies.petsPolicy,
  ];

  return rules.join(". ");
}

function formatVnd(amount: number | null) {
  return amount === null ? "—" : `${amount.toLocaleString("vi-VN")}đ`;
}

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { checkIn?: string; checkOut?: string; guests?: string };
}) {
  const property = await getProperty(params.id);

  if (!property) {
    notFound();
  }

  const [heroImage, ...galleryImages] = property.images;
  const addressText = formatAddress(property);
  const totalBeds = getTotalBeds(property);
  const highlights = [
    `${property.capacity.maxGuests} khách`,
    `${property.capacity.bedroomCount} phòng ngủ`,
    `${totalBeds || "—"} giường`,
    `${property.capacity.bathrooms} phòng tắm`,
    ...(property.sizeM2 ? [`${Math.round(property.sizeM2)} m²`] : []),
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-700">
            {propertyTypeLabels[property.type] ?? property.type} · {property.city}
          </p>
          <h1 className="mt-2 max-w-4xl text-4xl font-semibold text-balance">
            {property.title}
          </h1>
          <p className="mt-2 text-slate-500">
            {addressText}, {property.country}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Đánh giá
          </p>
          <p className="mt-1 text-xl font-semibold">
            {property.rating.average
              ? `${property.rating.average}/5`
              : "Mới"}
          </p>
          <p className="text-sm text-slate-500">
            {property.rating.count
              ? `${property.rating.count} đánh giá`
              : "Chưa có đánh giá"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 overflow-hidden rounded-[32px] lg:grid-cols-[1.6fr_1fr]">
        {heroImage ? (
          <div className="relative min-h-[320px] lg:min-h-[430px]">
            <Image
              src={heroImage.url}
              alt={property.title}
              fill
              unoptimized
              sizes="(min-width: 1024px) 62vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="grid min-h-[320px] place-items-center bg-gradient-to-br from-teal-50 via-white to-amber-50 text-sm font-medium text-slate-400">
            Chỗ nghỉ chưa có ảnh
          </div>
        )}
        <div className="grid min-h-[320px] grid-cols-2 gap-3 lg:min-h-[430px]">
          {galleryImages.slice(0, 4).map((image, index) => (
            <div key={image.id} className="relative min-h-[154px] overflow-hidden">
              <Image
                src={image.url}
                alt=""
                fill
                unoptimized
                sizes="(min-width: 1024px) 38vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
              {index === 3 && galleryImages.length > 4 ? (
                <span className="absolute inset-0 grid place-items-center bg-slate-950/55 text-lg font-semibold text-white">
                  +{galleryImages.length - 4} ảnh
                </span>
              ) : null}
            </div>
          ))}
          {galleryImages.length === 0 ? (
            <div className="col-span-2 grid min-h-[154px] place-items-center bg-slate-100 text-sm text-slate-400">
              Ảnh bổ sung sẽ hiển thị tại đây
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-5 md:grid-cols-2">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                Điểm nổi bật
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {highlights.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <p className="text-slate-400">Nhận phòng</p>
                <p className="mt-1 font-medium text-slate-800">
                  {formatTimeRange(property.policies.checkIn)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Trả phòng</p>
                <p className="mt-1 font-medium text-slate-800">
                  {formatTimeRange(property.policies.checkOut)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Chính sách hủy</p>
                <p className="mt-1 font-medium text-slate-800">
                  {cancellationLabels[property.policies.cancellationPolicy] ??
                    property.policies.cancellationPolicy}
                  {` · miễn phí trước ${property.policies.cancellationFreeDays} ngày`}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Phương thức đặt</p>
                <p className="mt-1 font-medium text-slate-800">
                  {property.policies.bookingMethod === "INSTANT" ? "Đặt ngay" : "Gửi yêu cầu cho Host"}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Host</p>
                <p className="mt-1 font-medium text-slate-800">
                  {property.host.name ?? "Chủ chỗ nghỉ"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-semibold">Vì sao khách thích nơi này</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-400">Vị trí</p>
                <p className="mt-2 font-medium">{property.city}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Gần các điểm trải nghiệm nổi bật trong khu vực.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-400">Phù hợp</p>
                <p className="mt-2 font-medium">
                  Tối đa {property.capacity.maxGuests} khách
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Không gian đủ thoải mái cho nhóm và gia đình.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-400">Tiện nghi</p>
                <p className="mt-2 font-medium">
                  {property.amenities.length} tiện nghi
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Các tiện ích thiết yếu đã sẵn sàng cho kỳ nghỉ.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-semibold">Giới thiệu</h2>
            <p className="mt-4 max-w-4xl leading-8 text-slate-600">
              {property.description}
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                  Tiện nghi phổ biến
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Những gì chỗ ở cung cấp
                </h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {property.amenities.map((amenity) => (
                <div
                  key={amenity.id}
                  className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-700"
                >
                  {amenity.name}
                </div>
              ))}
              {property.services.breakfastIncluded ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-700">
                  Có phục vụ bữa sáng
                </div>
              ) : null}
              {property.services.parkingType !== "NOT_AVAILABLE" ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-700">
                  {parkingLabels[property.services.parkingType]}
                </div>
              ) : null}
              {property.amenities.length === 0 && !property.services.breakfastIncluded && property.services.parkingType === "NOT_AVAILABLE" ? (
                <p className="text-sm text-slate-500 sm:col-span-2">Host chưa khai báo tiện nghi.</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-semibold">Phù hợp cho gia đình</h2>
              <div className="mt-4 grid gap-2 text-sm leading-6 text-slate-600">
                <p>{property.childrenAllowed ? "Có tiếp đón trẻ em" : "Không tiếp đón trẻ em"}</p>
                <p>{property.cribsAvailable ? "Có thể cung cấp nôi/cũi" : "Không cung cấp nôi/cũi"}</p>
                {property.childPricing?.enabled ? (
                  <p>
                    Trẻ sơ sinh: {property.childPricing.infantFree ? "miễn phí" : formatVnd(property.childPricing.infantPrice)}; trẻ em đến {property.childPricing.childMaxAge} tuổi: {property.childPricing.childFree ? "miễn phí" : formatVnd(property.childPricing.childPrice)}.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-semibold">Ngôn ngữ & lưu trú</h2>
              <p className="mt-4 leading-7 text-slate-600">
                {property.languages.length > 0 ? property.languages.join(", ") : "Host chưa khai báo ngôn ngữ."}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Mở lịch trước {property.availability.window} ngày. {property.availability.longStayAllowed
                  ? `Cho phép lưu trú dài ngày, tối đa ${property.availability.maxStayNights ?? "—"} đêm.`
                  : "Không nhận kỳ lưu trú trên 30 đêm."}
              </p>
            </div>
          </div>

          {(property.ratePlans.some((plan) => plan.enabled) || property.pricing.launchDiscountEnabled || property.pricing.groupPricingEnabled) ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-semibold">Ưu đãi và loại giá</h2>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-teal-800">
                {property.pricing.launchDiscountEnabled ? <span className="rounded-full bg-teal-50 px-3 py-2">Giảm 20% cho khách đầu tiên</span> : null}
                {property.pricing.groupPricingEnabled ? <span className="rounded-full bg-teal-50 px-3 py-2">1 khách giảm {property.pricing.oneGuestDiscountPct}%</span> : null}
                {property.ratePlans.filter((plan) => plan.enabled).map((plan) => (
                  <span key={plan.type} className="rounded-full bg-teal-50 px-3 py-2">
                    {plan.type === "NON_REFUNDABLE" ? "Không hoàn tiền" : "Lưu trú theo tuần"}: giảm {plan.discountPct}%
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-semibold">Nội quy nhà</h2>
              <p className="mt-4 leading-7 text-slate-600">
                {formatHouseRules(property)}
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-semibold">Lịch bị chặn</h2>
              {property.availability.blockedDates.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {property.availability.blockedDates.slice(0, 12).map((slot) => (
                    <span
                      key={slot.date}
                      className="rounded-full bg-rose-50 px-3 py-1 text-sm text-rose-700"
                    >
                      {slot.date} · {slot.status}
                    </span>
                  ))}
                  {property.availability.blockedDates.length > 12 ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                      +{property.availability.blockedDates.length - 12} ngày khác
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-slate-600">
                  Chưa có ngày nào bị chặn công khai.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <BookingForm
            propertyId={property.id}
            pricePerNight={property.pricePerNight}
            cleaningFee={property.cleaningFee}
            maxGuests={property.capacity.maxGuests}
            bookingMethod={property.policies.bookingMethod as "INSTANT" | "REQUEST"}
            initialCheckIn={searchParams.checkIn}
            initialCheckOut={searchParams.checkOut}
            initialGuests={Math.max(1, Number(searchParams.guests) || 1)}
          />
        </div>
      </div>
    </section>
  );
}
