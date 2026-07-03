"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

const MIN_PROPERTY_IMAGES = 8;

type HostProperty = {
  id: string;
  code: string;
  title: string;
  address: string;
  city: string;
  country: string;
  status: string;
  type: string;
  pricePerNight: number;
  maxGuests: number;
  bedroomCount: number;
  bathrooms: number;
  thumbnailUrl?: string | null;
  bookings: number;
  arrivals: number;
  departures: number;
  reviews: number;
  cancellations: number;
  revenue: number;
  occupancy: number;
  createdAt: string;
};

type HostBooking = {
  id: string;
  status: string;
  paymentStatus: string;
  checkIn: string | null;
  checkOut: string | null;
  numGuests: number;
  totalPrice: number;
  guest: { name?: string | null; email: string };
  property: { id: string; title: string } | null;
};

type PhotoItem = {
  id: string;
  name: string;
  url: string;
  file: File;
  isMain: boolean;
};

type TabKey = "home" | "calendar" | "promotions" | "bookings" | "inbox" | "finance" | "analytics";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "home", label: "Trang chủ" },
  { key: "calendar", label: "Lịch & giá" },
  { key: "promotions", label: "Khuyến mãi" },
  { key: "bookings", label: "Đặt phòng" },
  { key: "inbox", label: "Hộp thư" },
  { key: "finance", label: "Tài chính" },
  { key: "analytics", label: "Phân tích" },
];

function formatCurrency(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function compressImageToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      const maxSide = 1400;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(imageUrl);
        reject(new Error("Cannot prepare image"));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(imageUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Cannot load image"));
    };

    image.src = imageUrl;
  });
}

async function uploadPropertyImage(file: File, token: string) {
  const imageData = await compressImageToDataUrl(file);
  const response = await api.post<{ data: { url: string } }>(
    "/host/property-images",
    { imageData },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data.data.url;
}

export default function EditPropertyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = params.id;
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [property, setProperty] = useState<HostProperty | null>(null);
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const propertyBookings = useMemo(
    () => bookings.filter((booking) => booking.property?.id === propertyId),
    [bookings, propertyId]
  );

  const revenue = useMemo(
    () => propertyBookings.reduce((total, booking) => total + booking.totalPrice, 0),
    [propertyBookings]
  );

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push(`/login?next=/host/properties/${propertyId}`);
      return;
    }

    Promise.all([
      api.get("/host/properties", { headers: { Authorization: `Bearer ${token}` } }),
      api.get("/host/bookings", { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
    ])
      .then(([propertiesResponse, bookingsResponse]) => {
        const properties = (propertiesResponse.data.data ?? []) as HostProperty[];
        setProperty(properties.find((item) => item.id === propertyId) ?? null);
        setBookings((bookingsResponse.data.data ?? []) as HostBooking[]);
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? "Không thể tải thông tin chỗ nghỉ."))
      .finally(() => setLoading(false));
  }, [propertyId, router]);

  function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const validFiles = Array.from(files).filter((file) => {
      const isImage = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type);
      return isImage && file.size <= 47 * 1024 * 1024;
    });

    const nextPhotos = validFiles.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}-${crypto.randomUUID()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      file,
      isMain: photos.length === 0 && index === 0,
    }));

    setPhotos((current) => [...current, ...nextPhotos]);
    setMessage("");
    setError("");
  }

  function removePhoto(id: string) {
    const removed = photos.find((photo) => photo.id === id);
    if (removed) URL.revokeObjectURL(removed.url);
    const nextPhotos = photos.filter((photo) => photo.id !== id);
    setPhotos(nextPhotos.some((photo) => photo.isMain) ? nextPhotos : nextPhotos.map((photo, index) => ({ ...photo, isMain: index === 0 })));
  }

  function makeMain(id: string) {
    setPhotos((current) => current.map((photo) => ({ ...photo, isMain: photo.id === id })));
  }

  async function saveImages(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      router.push(`/login?next=/host/properties/${propertyId}`);
      return;
    }

    if (photos.length < MIN_PROPERTY_IMAGES) {
      setError(`Vui lòng chọn ít nhất ${MIN_PROPERTY_IMAGES} ảnh thật của chỗ nghỉ.`);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const orderedPhotos = [
        ...photos.filter((photo) => photo.isMain),
        ...photos.filter((photo) => !photo.isMain),
      ];
      const imageUrls = await Promise.all(orderedPhotos.map((photo) => uploadPropertyImage(photo.file, token)));
      await api.patch(
        `/host/properties/${propertyId}/images`,
        { imageUrls },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage("Đã lưu bộ ảnh thật cho chỗ nghỉ. Trang chi tiết sẽ dùng các ảnh này để mở gallery.");
      setProperty((current) => current ? { ...current, thumbnailUrl: imageUrls[0] } : current);
    } catch (err: unknown) {
      const responseMessage = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(responseMessage ?? "Không thể lưu ảnh. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl">
      {loading ? <p className="text-sm text-slate-500">Đang tải chỗ nghỉ...</p> : null}
      {!loading && !property ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Không tìm thấy chỗ nghỉ hoặc bạn không có quyền chỉnh sửa.
        </div>
      ) : null}

      {property ? (
        <>
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-teal-950/5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="relative h-24 w-32 overflow-hidden rounded-md bg-slate-100">
                  {property.thumbnailUrl ? (
                    <Image src={property.thumbnailUrl} alt={property.title} fill unoptimized sizes="128px" className="object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-slate-500">Chưa có ảnh</div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">{property.code}</p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{property.title}</h1>
                  <p className="mt-2 text-sm text-slate-600">{property.address}</p>
                </div>
              </div>
              <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {property.status === "ACTIVE" ? "Đang hoạt động" : property.status}
              </div>
            </div>
          </header>

          <nav className="mt-5 flex gap-2 overflow-x-auto border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? "border-blue-700 text-blue-700"
                    : "border-transparent text-slate-600 hover:text-slate-950"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="mt-6">
            {activeTab === "home" ? (
              <HomeTab
                property={property}
                photos={photos}
                saving={saving}
                message={message}
                error={error}
                onAddPhotos={addPhotos}
                onRemovePhoto={removePhoto}
                onMakeMain={makeMain}
                onSaveImages={saveImages}
              />
            ) : null}
            {activeTab === "calendar" ? <CalendarTab property={property} /> : null}
            {activeTab === "promotions" ? <PromotionsTab property={property} /> : null}
            {activeTab === "bookings" ? <BookingsTab bookings={propertyBookings} /> : null}
            {activeTab === "inbox" ? <InboxTab /> : null}
            {activeTab === "finance" ? <FinanceTab revenue={revenue} bookings={propertyBookings.length} /> : null}
            {activeTab === "analytics" ? <AnalyticsTab property={property} bookings={propertyBookings.length} revenue={revenue} /> : null}
          </div>
        </>
      ) : null}
    </main>
  );
}

function HomeTab({
  property,
  photos,
  saving,
  message,
  error,
  onAddPhotos,
  onRemovePhoto,
  onMakeMain,
  onSaveImages,
}: {
  property: HostProperty;
  photos: PhotoItem[];
  saving: boolean;
  message: string;
  error: string;
  onAddPhotos: (files: FileList | null) => void;
  onRemovePhoto: (id: string) => void;
  onMakeMain: (id: string) => void;
  onSaveImages: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const remainingPhotos = Math.max(0, MIN_PROPERTY_IMAGES - photos.length);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-teal-950/5">
        <h2 className="text-xl font-semibold text-slate-950">Ảnh và thông tin hiển thị</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Tải tối thiểu {MIN_PROPERTY_IMAGES} ảnh thật. Ảnh đầu tiên sẽ là ảnh chính trên trang tìm kiếm và gallery chi tiết.
        </p>

        <form onSubmit={onSaveImages} className="mt-5">
          <label className="grid min-h-[150px] cursor-pointer place-items-center rounded-md border border-dashed border-slate-400 bg-slate-50 px-4 py-8 text-center transition hover:border-teal-600 hover:bg-teal-50">
            <span className="font-semibold text-slate-950">Chọn ảnh thật của chỗ nghỉ</span>
            <span className="mt-2 text-sm text-slate-600">jpg, png hoặc webp, tối đa 47MB mỗi file</span>
            <span className="mt-4 rounded-md border border-teal-700 bg-white px-4 py-2 text-sm font-semibold text-teal-700">Tải ảnh lên</span>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => {
                onAddPhotos(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>

          <p className={`mt-3 text-sm font-medium ${remainingPhotos > 0 ? "text-amber-700" : "text-emerald-700"}`}>
            {remainingPhotos > 0 ? `Cần thêm ${remainingPhotos} ảnh nữa để lưu.` : "Đã đủ số ảnh tối thiểu để lưu."}
          </p>

          {photos.length ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {photos.map((photo) => (
                <div key={photo.id} className={`relative aspect-[4/3] overflow-hidden rounded-md border-2 bg-slate-100 ${photo.isMain ? "border-amber-500" : "border-slate-200"}`}>
                  {photo.isMain ? <span className="absolute left-2 top-0 z-10 rounded-b bg-amber-500 px-2 py-1 text-xs font-semibold text-white">Ảnh chính</span> : null}
                  <button type="button" onClick={() => onMakeMain(photo.id)} className="relative block h-full w-full" aria-label={`Đặt ${photo.name} làm ảnh chính`}>
                    <Image src={photo.url} alt={photo.name} fill unoptimized sizes="(min-width: 1280px) 25vw, 50vw" className="object-cover" />
                  </button>
                  <button type="button" onClick={() => onRemovePhoto(photo.id)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-lg font-semibold text-slate-700 shadow-md transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Xóa ${photo.name}`}>×</button>
                </div>
              ))}
            </div>
          ) : null}

          {error ? <p className="mt-5 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          {message ? <p className="mt-5 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>{saving ? "Đang lưu ảnh..." : "Lưu bộ ảnh"}</Button>
            <a href="/host/properties" className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50">Quay lại danh sách</a>
          </div>
        </form>
      </section>

      <aside className="space-y-4">
        <SummaryCard label="Giá/đêm" value={formatCurrency(property.pricePerNight)} />
        <SummaryCard label="Sức chứa" value={`${property.maxGuests} khách · ${property.bedroomCount} phòng ngủ`} />
        <SummaryCard label="Đặt phòng" value={`${property.bookings} đơn`} />
      </aside>
    </div>
  );
}

function CalendarTab({ property }: { property: HostProperty }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-950">Lịch & giá</h2>
        <div className="mt-5 grid grid-cols-7 overflow-hidden rounded-lg border border-slate-200 text-center text-sm">
          {Array.from({ length: 35 }).map((_, index) => (
            <div key={index} className="min-h-24 border border-slate-100 p-2 text-left">
              <p className="font-semibold text-slate-700">{index + 1}</p>
              <p className="mt-3 text-xs text-emerald-700">{formatCurrency(property.pricePerNight)}</p>
            </div>
          ))}
        </div>
      </section>
      <aside className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="font-semibold text-slate-950">Khung chỉnh giá</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">Sau này host có thể cập nhật giá theo ngày, đóng/mở phòng và số lượng phòng còn bán.</p>
      </aside>
    </div>
  );
}

function PromotionsTab({ property }: { property: HostProperty }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-semibold text-slate-950">Chương trình khuyến mãi</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {["Ưu đãi đặt sớm", "Ưu đãi phút chót", "Giảm giá theo tuần"].map((item) => (
          <div key={item} className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-950">{item}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Khung thiết lập cho {property.title}, phần xử lý chi tiết sẽ nối sau.</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BookingsTab({ bookings }: { bookings: HostBooking[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-semibold text-slate-950">Đặt phòng</h2>
      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
        <div className="grid bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 md:grid-cols-5">
          <span>Khách</span>
          <span>Ngày ở</span>
          <span>Số khách</span>
          <span>Thanh toán</span>
          <span>Trạng thái</span>
        </div>
        {bookings.length ? bookings.map((booking) => (
          <div key={booking.id} className="grid gap-2 border-t border-slate-100 px-4 py-3 text-sm md:grid-cols-5">
            <span>{booking.guest.name ?? booking.guest.email}</span>
            <span>{booking.checkIn ?? "—"} → {booking.checkOut ?? "—"}</span>
            <span>{booking.numGuests}</span>
            <span>{formatCurrency(booking.totalPrice)}</span>
            <span>{booking.status}</span>
          </div>
        )) : (
          <p className="border-t border-slate-100 px-4 py-5 text-sm text-slate-500">Chưa có đơn đặt phòng cho chỗ nghỉ này.</p>
        )}
      </div>
    </section>
  );
}

function InboxTab() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-semibold text-slate-950">Hộp thư</h2>
      <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-6 text-sm leading-6 text-slate-600">
        Khung hội thoại với khách sẽ hiển thị tại đây, bao gồm câu hỏi trước khi đặt và tin nhắn sau khi đặt phòng.
      </div>
    </section>
  );
}

function FinanceTab({ revenue, bookings }: { revenue: number; bookings: number }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-semibold text-slate-950">Tài chính</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Doanh thu ghi nhận" value={formatCurrency(revenue)} />
        <SummaryCard label="Số đơn" value={`${bookings} đơn`} />
        <SummaryCard label="Thanh toán chờ xử lý" value="Đang cập nhật" />
      </div>
    </section>
  );
}

function AnalyticsTab({ property, bookings, revenue }: { property: HostProperty; bookings: number; revenue: number }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-semibold text-slate-950">Phân tích</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Lượt đặt" value={`${bookings}`} />
        <SummaryCard label="Doanh thu" value={formatCurrency(revenue)} />
        <SummaryCard label="Công suất" value={`${property.occupancy}%`} />
        <SummaryCard label="Huỷ đặt" value={`${property.cancellations}`} />
      </div>
      <div className="mt-5 h-56 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        Khung biểu đồ hiệu suất sẽ được kết nối với dữ liệu lượt xem, chuyển đổi và doanh thu theo thời gian.
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
