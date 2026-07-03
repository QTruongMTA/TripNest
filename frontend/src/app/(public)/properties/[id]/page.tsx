import { BookingForm } from "@/components/booking/BookingForm";
import { PropertyPhotoGallery } from "@/components/property/PropertyPhotoGallery";
import type { PropertyDetail } from "@/types/property";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

type PropertyDetailResponse = {
  data: PropertyDetail;
};

const cancellationLabels: Record<string, string> = {
  FLEXIBLE: "Linh hoạt",
  MODERATE: "Trung bình",
  STRICT: "Nghiêm ngặt",
  NON_REFUNDABLE: "Không hoàn tiền",
};

const petPolicyLabels: Record<string, string> = {
  ALLOWED: "Cho phép mang thú cưng",
  ON_REQUEST: "Thú cưng cần được host xác nhận trước",
  NOT_ALLOWED: "Không cho phép mang thú cưng",
};

const parkingLabels: Record<string, string> = {
  FREE: "Có chỗ đỗ xe miễn phí",
  PAID: "Có chỗ đỗ xe trả phí",
  NOT_AVAILABLE: "Chưa có chỗ đỗ xe",
};

const bookingMethodLabels: Record<string, string> = {
  INSTANT: "Đặt ngay",
  REQUEST: "Gửi yêu cầu đặt phòng",
};

const propertyTypeLabels: Record<string, string> = {
  HOUSE: "nhà nghỉ",
  APARTMENT: "căn hộ",
  VILLA: "biệt thự",
  HOMESTAY: "homestay",
  HOTEL: "khách sạn",
  RESORT: "resort",
  UNIQUE: "chỗ nghỉ độc đáo",
};

const reviewCategories = ["Sạch sẽ", "Thoải mái", "Vị trí", "Tiện nghi", "Đáng giá tiền"];

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

function getStreetName(property: PropertyDetail) {
  return property.address.line1.split(",")[0]?.trim() || property.address.line1;
}

function getLocationHighlight(property: PropertyDetail) {
  const provinceName = property.provinceHighlight?.provinceName ?? property.city;
  const description = property.provinceHighlight?.description;
  const suffix = description
    ? ` ${description}`
    : " thuận tiện để di chuyển và khám phá khu vực xung quanh";

  return `Nằm trên đường ${getStreetName(property)} ở ${provinceName}${suffix}.`;
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function formatTimeRange(range: { from: string | null; to: string | null }) {
  if (range.from && range.to) return `${range.from} - ${range.to}`;
  return range.from ?? range.to ?? "Chưa cập nhật";
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
  return [
    property.policies.smokingAllowed ? "Cho phép hút thuốc" : "Không hút thuốc trong chỗ nghỉ",
    property.policies.partiesAllowed ? "Cho phép tổ chức tiệc hoặc sự kiện" : "Không tổ chức tiệc hoặc sự kiện",
    property.policies.petsPolicy === "NOT_ALLOWED"
      ? "Không mang thú cưng"
      : petPolicyLabels[property.policies.petsPolicy] ?? `Chính sách thú cưng: ${property.policies.petsPolicy}`,
  ];
}

function formatBedSummary(bedroom: PropertyDetail["bedrooms"][number]) {
  const bedItems = [
    bedroom.singleBeds ? `${bedroom.singleBeds} giường đơn` : null,
    bedroom.doubleBeds ? `${bedroom.doubleBeds} giường đôi` : null,
    bedroom.kingBeds ? `${bedroom.kingBeds} giường King` : null,
    bedroom.superKingBeds ? `${bedroom.superKingBeds} giường Super King` : null,
    bedroom.bunkBeds ? `${bedroom.bunkBeds} giường tầng` : null,
    bedroom.sofaBeds ? `${bedroom.sofaBeds} giường sofa` : null,
    bedroom.futonBeds ? `${bedroom.futonBeds} nệm futon` : null,
  ].filter(Boolean);

  return bedItems.length ? bedItems.join(", ") : "Chưa cấu hình loại giường";
}

function getMapUrl(property: PropertyDetail) {
  const { latitude, longitude } = property.location;
  if (latitude === null || longitude === null) return null;
  const delta = 0.012;
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
}

function getReviewScore(property: PropertyDetail) {
  return property.rating.average ?? 0;
}

function getIntroText(property: PropertyDetail) {
  if (property.description?.trim()) return property.description;

  const typeLabel = propertyTypeLabels[property.type] ?? "chỗ nghỉ";
  return `${property.title} là ${typeLabel} tại ${property.city}, nằm gần khu vực ${getStreetName(property)}. Chỗ nghỉ phù hợp cho khách muốn lưu trú thuận tiện, dễ di chuyển và khám phá khu vực xung quanh.`;
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${score.toFixed(1)} sao`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const fill = Math.max(0, Math.min(1, score - index));
        return (
          <span key={index} className="relative inline-block h-5 w-5 text-slate-300">
            <span>★</span>
            <span className="absolute inset-0 overflow-hidden text-amber-500" style={{ width: `${fill * 100}%` }}>
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="border-t border-slate-200 py-8">
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">{eyebrow}</p> : null}
      <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
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

  const addressText = formatAddress(property);
  const totalBeds = getTotalBeds(property);
  const houseRules = formatHouseRules(property);
  const mapUrl = getMapUrl(property);
  const reviewScore = getReviewScore(property);
  const locationHighlight = getLocationHighlight(property);
  const roomRows = property.bedrooms.length
    ? property.bedrooms
    : [{ roomNumber: 1, singleBeds: 0, doubleBeds: 0, kingBeds: 0, superKingBeds: 0, bunkBeds: 0, sofaBeds: 0, futonBeds: 0 }];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            {property.type} tại {property.city}
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            {property.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {addressText}, {property.country}
          </p>
        </div>
        <a
          href="#rooms"
          className="rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          Đặt ngay
        </a>
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_350px]">
        <div>
          <PropertyPhotoGallery
            title={property.title}
            images={property.images}
            ratingAverage={property.rating.average}
            ratingCount={property.rating.count}
          />
        </div>

        <aside className="grid gap-3 lg:h-full lg:grid-rows-[auto_minmax(0,1fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">
                  {reviewScore ? "Được khách đánh giá tốt" : "Chỗ nghỉ mới"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {property.rating.count ? `${property.rating.count} đánh giá đã ghi nhận` : "Chưa có đánh giá"}
                </p>
                <div className="mt-3">
                  <StarRating score={reviewScore} />
                </div>
              </div>
              <div className="rounded-md bg-blue-700 px-4 py-3 text-2xl font-semibold text-white">
                {reviewScore ? reviewScore.toFixed(1) : "Mới"}
              </div>
            </div>
          </div>

          <div className="min-h-[260px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 lg:min-h-0">
            {mapUrl ? (
              <iframe
                title={`Bản đồ ${property.title}`}
                src={mapUrl}
                className="h-full min-h-[260px] w-full border-0"
                loading="lazy"
              />
            ) : (
              <div className="grid h-full min-h-[260px] place-items-center px-4 text-center text-sm text-slate-500">
                Host chưa cập nhật vị trí bản đồ.
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div>
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-xl font-semibold text-slate-950">Điểm nổi bật của chỗ nghỉ</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 md:row-span-2">
                <p className="font-semibold text-blue-950">Vị trí</p>
                <p className="mt-2 text-sm leading-7 text-blue-950">{locationHighlight}</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-950">{property.priceInsight.label}</p>
                <p className="mt-2 text-sm leading-6 text-emerald-900">
                  {formatCurrency(property.pricePerNight)} / đêm
                  {property.priceInsight.averagePrice
                    ? `, trung bình khu vực ${formatCurrency(property.priceInsight.averagePrice)}.`
                    : ", đang chờ thêm dữ liệu so sánh."}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">Phù hợp</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Tối đa {property.capacity.maxGuests} khách, {property.capacity.bedroomCount} phòng ngủ, {totalBeds || "chưa cập nhật"} giường.
                </p>
              </div>
            </div>
          </section>

          <Section title="Tận hưởng dịch vụ đẳng cấp tại chỗ nghỉ" eyebrow="Giới thiệu">
            <p className="max-w-4xl text-base leading-8 text-slate-700">
              {getIntroText(property)}
            </p>
          </Section>

          <Section title="Các tiện nghi được ưa chuộng nhất">
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              {property.amenities.length ? (
                property.amenities.map((amenity) => (
                  <div key={amenity.id} className="flex min-w-[220px] items-center gap-3 text-sm font-medium text-slate-800">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-50 text-xs text-emerald-700">✓</span>
                    {amenity.name}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Host chưa cập nhật tiện nghi chi tiết.</p>
              )}
            </div>
          </Section>

          <Section title="Phòng trống" eyebrow="Đặt phòng">
            <div id="rooms" className="overflow-hidden rounded-lg border border-blue-200 bg-white">
              <div className="grid bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950 md:grid-cols-[1.35fr_0.55fr_0.85fr_1.1fr_0.7fr]">
                <span>Loại chỗ nghỉ</span>
                <span>Số khách</span>
                <span>Giá hôm nay</span>
                <span>Các lựa chọn</span>
                <span>Chọn phòng</span>
              </div>
              {roomRows.map((room, index) => (
                <div
                  key={`${room.roomNumber}-${index}`}
                  className="grid gap-4 border-t border-blue-100 px-4 py-4 text-sm md:grid-cols-[1.35fr_0.55fr_0.85fr_1.1fr_0.7fr]"
                >
                  <div>
                    <p className="font-semibold text-blue-800 underline underline-offset-2">
                      {property.capacity.bedroomCount > 1 ? `Phòng ngủ ${room.roomNumber}` : property.title}
                    </p>
                    <p className="mt-2 leading-6 text-slate-600">{formatBedSummary(room)}</p>
                    <p className="mt-2 text-xs text-slate-500">{property.capacity.bathrooms} phòng tắm</p>
                  </div>
                  <div className="font-medium text-slate-800">
                    {property.capacity.maxGuests} khách
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{formatCurrency(property.pricePerNight)}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Giá cho 1 đêm</p>
                  </div>
                  <div className="space-y-2 text-sm leading-6 text-slate-700">
                    <p className="font-medium text-emerald-700">
                      {property.services.breakfastIncluded ? "Bao gồm bữa sáng" : "Có thể đặt không kèm bữa sáng"}
                    </p>
                    <p>{cancellationLabels[property.policies.cancellationPolicy] ?? property.policies.cancellationPolicy}</p>
                    <p>{property.priceInsight.label}</p>
                  </div>
                  <div>
                    <a
                      href="#booking-form"
                      className="inline-flex w-full justify-center rounded-md bg-blue-700 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-800"
                    >
                      Chọn
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Đánh giá của khách" eyebrow="Thang điểm 5 sao">
            <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
              <div className="rounded-lg bg-blue-50 p-5">
                <p className="text-5xl font-semibold text-blue-950">{reviewScore ? reviewScore.toFixed(1) : "0.0"}</p>
                <div className="mt-3">
                  <StarRating score={reviewScore} />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {property.rating.count ? `${property.rating.count} đánh giá` : "Chưa có đánh giá"}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {reviewCategories.map((category, index) => {
                  const score = reviewScore ? Math.max(0, Math.min(5, reviewScore - (index % 2 === 0 ? 0 : 0.2))) : 0;
                  return (
                    <div key={category}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-800">{category}</span>
                        <span className="text-slate-600">{score.toFixed(1)}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-700" style={{ width: `${(score / 5) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-5">
              <p className="font-semibold text-slate-950">Đọc xem khách yêu thích điều gì nhất</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Các đánh giá gần đây sẽ hiển thị tại đây sau khi hệ thống xử lý nội dung đánh giá chi tiết.
              </p>
              <button className="mt-4 rounded-md border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700">
                Đọc tất cả đánh giá
              </button>
            </div>
          </Section>

          <Section title="Thắc mắc của du khách">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <p className="font-semibold text-slate-950">Bạn có câu hỏi về chỗ nghỉ?</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Khung hỏi đáp sẽ được kết nối với hộp thư host ở bước xử lý tiếp theo.
              </p>
            </div>
          </Section>

          <Section title="Quy tắc chung">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="grid gap-4 border-b border-slate-200 pb-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">Nhận phòng</p>
                  <p className="mt-1 font-semibold text-slate-950">{formatTimeRange(property.policies.checkIn)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Trả phòng</p>
                  <p className="mt-1 font-semibold text-slate-950">{formatTimeRange(property.policies.checkOut)}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                {houseRules.map((rule) => (
                  <p key={rule}>{rule}</p>
                ))}
                <p>{bookingMethodLabels[property.policies.bookingMethod] ?? property.policies.bookingMethod}</p>
                <p>{cancellationLabels[property.policies.cancellationPolicy] ?? property.policies.cancellationPolicy}</p>
                <p>Đỗ xe: {parkingLabels[property.services.parkingType] ?? property.services.parkingType}</p>
                <p>Ngôn ngữ host: {property.languages.length ? property.languages.join(", ") : "Chưa cập nhật"}</p>
              </div>
            </div>
          </Section>

          <Section title="Ghi chú">
            <p className="rounded-lg bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              Host có thể bổ sung ghi chú riêng cho khách tại đây trong phần chỉnh sửa lưu trú.
            </p>
          </Section>
        </div>

        <aside id="booking-form" className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <BookingForm
            propertyId={property.id}
            pricePerNight={property.pricePerNight}
            cleaningFee={property.cleaningFee}
            maxGuests={property.capacity.maxGuests}
            initialCheckIn={searchParams.checkIn}
            initialCheckOut={searchParams.checkOut}
            initialGuests={searchParams.guests}
          />
        </aside>
      </div>
    </main>
  );
}
