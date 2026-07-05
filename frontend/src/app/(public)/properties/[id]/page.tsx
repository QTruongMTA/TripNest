import { BookingForm } from "@/components/booking/BookingForm";
import { QuickFaqList } from "@/components/chat/QuickFaqList";
import { StartPropertyConversationButton } from "@/components/chat/StartPropertyConversationButton";
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

function getPolicyRows(property: PropertyDetail) {
  return [
    { label: "Hút thuốc", value: property.policies.smokingAllowed ? "Cho phép" : "Không cho phép" },
    { label: "Tiệc/sự kiện", value: property.policies.partiesAllowed ? "Cho phép" : "Không cho phép" },
    {
      label: "Vật nuôi",
      value:
        property.policies.petsPolicy === "ALLOWED"
          ? "Cho phép"
          : property.policies.petsPolicy === "ON_REQUEST"
            ? "Theo yêu cầu"
            : "Không cho phép",
    },
  ];
}

function getServiceRows(property: PropertyDetail) {
  return [
    property.services.breakfastIncluded ? { label: "Bữa sáng", value: "Có phục vụ bữa sáng" } : null,
    property.services.parkingType === "FREE" ? { label: "Chỗ đậu xe", value: "Có, miễn phí" } : null,
    property.services.parkingType === "PAID" ? { label: "Chỗ đậu xe", value: "Có, tính phí" } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
}

function getOverviewItems(property: PropertyDetail, totalBeds: number) {
  return [
    { label: "Khách tối đa", value: `${property.capacity.maxGuests} khách` },
    { label: "Phòng ngủ", value: `${property.capacity.bedroomCount} phòng` },
    { label: "Phòng tắm", value: `${property.capacity.bathrooms} phòng` },
    totalBeds > 0 ? { label: "Tổng số giường", value: `${totalBeds} giường` } : null,
    property.sizeM2 ? { label: "Diện tích", value: `${Math.round(property.sizeM2).toLocaleString("vi-VN")} m²` } : null,
    property.livingRoomSofaBeds > 0 ? { label: "Phòng khách", value: `${property.livingRoomSofaBeds} giường sofa` } : null,
    { label: "Trẻ em", value: property.childrenAllowed ? "Có tiếp đón" : "Không tiếp đón" },
    property.cribsAvailable ? { label: "Nôi/cũi", value: "Có cung cấp" } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
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
  const policyRows = getPolicyRows(property);
  const serviceRows = getServiceRows(property);
  const overviewItems = getOverviewItems(property, totalBeds);
  const mapUrl = getMapUrl(property);
  const reviewScore = getReviewScore(property);
  const locationHighlight = getLocationHighlight(property);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-4">
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
          {property.rating.count && property.rating.average ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">Được khách đánh giá tốt</p>
                  <p className="mt-1 text-sm text-slate-600">{property.rating.count} đánh giá đã ghi nhận</p>
                  <div className="mt-3">
                    <StarRating score={reviewScore} />
                  </div>
                </div>
                <div className="rounded-md bg-blue-700 px-4 py-3 text-2xl font-semibold text-white">
                  {property.rating.average.toFixed(1)}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">Chỗ nghỉ mới</p>
                  <p className="mt-1 text-sm text-slate-600">Chưa có đánh giá</p>
                  <div className="mt-3">
                    <StarRating score={0} />
                  </div>
                </div>
                <div className="rounded-md bg-blue-700 px-4 py-3 text-2xl font-semibold text-white">
                  Mới
                </div>
              </div>
            </div>
          )}

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
                  Tối đa {property.capacity.maxGuests} khách, {property.capacity.bedroomCount} phòng ngủ, {property.capacity.bathrooms} phòng tắm
                  {property.sizeM2 ? `, diện tích ${Math.round(property.sizeM2).toLocaleString("vi-VN")} m²` : ""}.
                </p>
              </div>
            </div>
          </section>

          <Section title="Tận hưởng dịch vụ đẳng cấp tại chỗ nghỉ" eyebrow="Giới thiệu">
            <p className="max-w-4xl whitespace-pre-line text-base leading-8 text-slate-700">
              {getIntroText(property)}
            </p>
          </Section>

          {property.amenities.length ? (
            <Section title="Các tiện nghi được ưa chuộng nhất">
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                {property.amenities.map((amenity) => (
                  <div key={amenity.id} className="flex min-w-[220px] items-center gap-3 text-sm font-medium text-slate-800">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-50 text-xs text-emerald-700">✓</span>
                    {amenity.name}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

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

          <Section title="Câu hỏi thường gặp">
            {property.faqs.length ? (
              <QuickFaqList propertyId={property.id} faqs={property.faqs} />
            ) : (
              <p className="rounded-lg bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                Host chưa bổ sung câu hỏi thường gặp cho chỗ nghỉ này.
              </p>
            )}
          </Section>

          <Section title="Thông tin chi tiết chỗ nghỉ">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="grid gap-3 border-b border-slate-200 pb-5 sm:grid-cols-2 lg:grid-cols-4">
                {overviewItems.map((item) => (
                  <div key={item.label} className="rounded-md bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                    <p className="mt-1 font-semibold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-4 border-b border-slate-200 pb-5 sm:grid-cols-2">
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
                {policyRows.map((rule) => (
                  <div key={rule.label} className="rounded-md bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{rule.label}</p>
                    <p className="mt-1 font-semibold text-slate-950">{rule.value}</p>
                  </div>
                ))}
                {serviceRows.map((service) => (
                  <div key={service.label} className="rounded-md bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">{service.label}</p>
                    <p className="mt-1 font-semibold text-emerald-950">{service.value}</p>
                  </div>
                ))}
                <div className="rounded-md bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Cách đặt</p>
                  <p className="mt-1 font-semibold text-slate-950">{bookingMethodLabels[property.policies.bookingMethod] ?? property.policies.bookingMethod}</p>
                </div>
                <div className="rounded-md bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Hủy phòng</p>
                  <p className="mt-1 font-semibold text-slate-950">{cancellationLabels[property.policies.cancellationPolicy] ?? property.policies.cancellationPolicy}</p>
                </div>
                {property.languages.length ? (
                  <div className="rounded-md bg-slate-50 px-4 py-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Ngôn ngữ tại chỗ lưu trú</p>
                    <p className="mt-1 font-semibold text-slate-950">{property.languages.join(", ")}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </Section>

          <Section title="Ghi chú">
            <p className="whitespace-pre-line rounded-lg bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              {property.notes?.trim() || "Host chưa bổ sung ghi chú riêng cho khách tại chỗ nghỉ này."}
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
            messageAction={<StartPropertyConversationButton propertyId={property.id} />}
          />
        </aside>
      </div>
    </main>
  );
}
