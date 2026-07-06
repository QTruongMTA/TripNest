"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ChatConversation } from "@/components/chat/ChatWidget";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";

const MIN_PROPERTY_IMAGES = 8;

type HostProperty = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  notes?: string | null;
  faqs?: PropertyFaq[];
  address: string;
  city: string;
  country: string;
  status: string;
  type: string;
  pricePerNight: number;
  cleaningFee?: number | null;
  maxGuests: number;
  bedroomCount: number;
  bathrooms: number;
  livingRoomSofaBeds?: number;
  childrenAllowed?: boolean;
  cribsAvailable?: boolean;
  sizeM2?: number | null;
  breakfastIncluded?: boolean;
  parkingType?: string;
  smokingAllowed?: boolean;
  partiesAllowed?: boolean;
  petsPolicy?: string;
  checkInFrom?: string | null;
  checkInTo?: string | null;
  checkOutFrom?: string | null;
  checkOutTo?: string | null;
  languages?: string[];
  amenities?: Array<{
    id: string;
    name: string;
    icon?: string | null;
  }>;
  thumbnailUrl?: string | null;
  images?: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
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

type PropertyImageItem = {
  id: string;
  url: string;
  isPrimary: boolean;
};

type PropertyFaq = {
  id: string;
  question: string;
  answer: string;
};

type TabKey = "home" | "settings" | "promotions" | "bookings" | "inbox" | "finance" | "analytics";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "home", label: "Trang chủ" },
  { key: "settings", label: "Cài đặt" },
  { key: "promotions", label: "Khuyến mãi" },
  { key: "bookings", label: "Đặt phòng" },
  { key: "inbox", label: "Hộp thư" },
  { key: "finance", label: "Tài chính" },
  { key: "analytics", label: "Phân tích" },
];

function formatCurrency(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function parseMoneyInput(value: string) {
  return value.replace(/\D/g, "");
}

function formatMoneyInput(value: string) {
  const digits = parseMoneyInput(value);
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
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
  const hostName = useAuthStore((state) => state.user?.displayName || state.user?.name || state.user?.email || "Host TripNest");
  const propertyId = params.id;
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [property, setProperty] = useState<HostProperty | null>(null);
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [imageItems, setImageItems] = useState<PropertyImageItem[]>([]);
  const [originalImageSignature, setOriginalImageSignature] = useState("");
  const [imageOrderSaving, setImageOrderSaving] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailError, setDetailError] = useState("");
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
        const selectedProperty = properties.find((item) => item.id === propertyId) ?? null;
        setProperty(selectedProperty);
        const selectedImages = selectedProperty?.images ?? [];
        setImageItems(selectedImages);
        setOriginalImageSignature(selectedImages.map((image) => image.url).join("|"));
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

  async function saveImages(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      router.push(`/login?next=/host/properties/${propertyId}`);
      return;
    }

    if (!photos.length) {
      setError("Vui lòng chọn ít nhất 1 ảnh để tải lên.");
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
      const uploadedImageUrls = await Promise.all(orderedPhotos.map((photo) => uploadPropertyImage(photo.file, token)));
      const existingImageUrls = imageItems.map((image) => image.url);
      const imageUrls = [...existingImageUrls, ...uploadedImageUrls];
      await api.patch(
        `/host/properties/${propertyId}/images`,
        { imageUrls },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage("Đã tải ảnh lên. Bạn có thể sắp xếp lại vị trí ảnh ở khung phía trên.");
      const nextImages = imageUrls.map((url, index) => ({ id: `${url}-${index}`, url, isPrimary: index === 0 }));
      setImageItems(nextImages);
      setOriginalImageSignature(imageUrls.join("|"));
      setProperty((current) => current ? { ...current, thumbnailUrl: imageUrls[0], images: nextImages } : current);
      photos.forEach((photo) => URL.revokeObjectURL(photo.url));
      setPhotos([]);
    } catch (err: unknown) {
      const responseMessage = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(responseMessage ?? "Không thể lưu ảnh. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function saveImageOrder() {
    const token = getAccessToken();
    if (!token) {
      router.push(`/login?next=/host/properties/${propertyId}`);
      return;
    }

    if (!imageItems.length) {
      setError("Cần có ít nhất 1 ảnh để lưu thứ tự hiển thị.");
      return;
    }

    setImageOrderSaving(true);
    setError("");
    setMessage("");

    try {
      const imageUrls = imageItems.map((image) => image.url);
      await api.patch(
        `/host/properties/${propertyId}/images`,
        { imageUrls },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const nextImages = imageItems.map((image, index) => ({ ...image, isPrimary: index === 0 }));
      setImageItems(nextImages);
      setOriginalImageSignature(imageUrls.join("|"));
      setProperty((current) => current ? { ...current, thumbnailUrl: imageUrls[0], images: nextImages } : current);
      setMessage("Đã lưu thứ tự ảnh hiển thị trên trang khách.");
    } catch (err: unknown) {
      const responseMessage = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(responseMessage ?? "Không thể lưu thứ tự ảnh. Vui lòng thử lại.");
    } finally {
      setImageOrderSaving(false);
    }
  }

  function resetImageOrder() {
    setImageItems(property?.images ?? []);
    setError("");
    setMessage("");
  }

  async function savePropertyDetails(payload: Partial<Pick<HostProperty, "description" | "notes" | "faqs">>) {
    const token = getAccessToken();
    if (!token) {
      router.push(`/login?next=/host/properties/${propertyId}`);
      return;
    }

    setDetailSaving(true);
    setDetailError("");

    try {
      const response = await api.patch<{ data: Pick<HostProperty, "id" | "description" | "notes" | "faqs"> }>(
        `/host/properties/${propertyId}/details`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProperty((current) => current ? { ...current, ...response.data.data } : current);
    } catch (err: unknown) {
      const responseMessage = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setDetailError(responseMessage ?? "Không thể lưu thông tin chi tiết. Vui lòng thử lại.");
    } finally {
      setDetailSaving(false);
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
          <header className="border-b border-slate-200 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
                  {hostName} - {property.title}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Điều chỉnh chỗ lưu trú</h1>
                <p className="mt-2 text-sm text-slate-600">{property.address}</p>
              </div>
              <a href="/host/properties" className="rounded-md border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50">
                Quay lại danh sách
              </a>
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
                imageItems={imageItems}
                setImageItems={setImageItems}
                imageOrderDirty={imageItems.map((image) => image.url).join("|") !== originalImageSignature}
                imageOrderSaving={imageOrderSaving}
                onSaveImageOrder={saveImageOrder}
                onResetImageOrder={resetImageOrder}
                photos={photos}
                saving={saving}
                message={message}
                error={error}
                detailSaving={detailSaving}
                detailError={detailError}
                onAddPhotos={addPhotos}
                onRemovePhoto={removePhoto}
                onSaveImages={saveImages}
                onSaveDetails={savePropertyDetails}
              />
            ) : null}
            {activeTab === "settings" ? <SettingsTab property={property} /> : null}
            {activeTab === "promotions" ? <PromotionsTab property={property} /> : null}
            {activeTab === "bookings" ? <BookingsTab bookings={propertyBookings} /> : null}
            {activeTab === "inbox" ? <InboxTab propertyId={property.id} /> : null}
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
  imageItems,
  setImageItems,
  imageOrderDirty,
  imageOrderSaving,
  onSaveImageOrder,
  onResetImageOrder,
  photos,
  saving,
  message,
  error,
  detailSaving,
  detailError,
  onAddPhotos,
  onRemovePhoto,
  onSaveImages,
  onSaveDetails,
}: {
  property: HostProperty;
  imageItems: PropertyImageItem[];
  setImageItems: (images: PropertyImageItem[]) => void;
  imageOrderDirty: boolean;
  imageOrderSaving: boolean;
  onSaveImageOrder: () => void;
  onResetImageOrder: () => void;
  photos: PhotoItem[];
  saving: boolean;
  message: string;
  error: string;
  detailSaving: boolean;
  detailError: string;
  onAddPhotos: (files: FileList | null) => void;
  onRemovePhoto: (id: string) => void;
  onSaveImages: (event: FormEvent<HTMLFormElement>) => void;
  onSaveDetails: (payload: Partial<Pick<HostProperty, "description" | "notes" | "faqs">>) => Promise<void>;
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-emerald-900/10 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900">Thiết lập chỗ ở</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Ảnh hiển thị trên trang chỗ nghỉ</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveImageOrder}
              disabled={!imageOrderDirty || imageOrderSaving}
              className={`h-10 rounded-md px-5 text-sm font-semibold transition ${
                imageOrderDirty
                  ? "bg-emerald-900 text-white hover:bg-emerald-950"
                  : "cursor-not-allowed bg-slate-200 text-slate-500"
              }`}
            >
              {imageOrderSaving ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              type="button"
              onClick={onResetImageOrder}
              disabled={!imageOrderDirty || imageOrderSaving}
              className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-xl font-light text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Hoàn tác thứ tự ảnh"
            >
              ×
            </button>
          </div>
        </div>

        <ImageDisplaySetup
          propertyTitle={property.title}
          imageItems={imageItems}
          setImageItems={setImageItems}
          dirty={imageOrderDirty}
          saving={imageOrderSaving}
          onSave={onSaveImageOrder}
          onReset={onResetImageOrder}
        />
      </div>

      <form onSubmit={onSaveImages} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <label className="grid min-h-[62px] w-full cursor-pointer place-items-center rounded-lg border border-dashed border-emerald-800/50 bg-emerald-50/40 px-4 py-3 text-center transition hover:bg-emerald-50">
          <span className="font-semibold text-emerald-950">Chọn ảnh để tải lên</span>
          <span className="mt-1 text-xs text-slate-500">jpg, png hoặc webp, tối đa 47MB mỗi file</span>
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

        {photos.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
              >
                <div className="relative h-full w-full">
                  <Image src={photo.url} alt={photo.name} fill unoptimized sizes="(min-width: 1280px) 25vw, 50vw" className="object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => onRemovePhoto(photo.id)}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-lg font-semibold text-slate-700 shadow-md transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`Xóa ${photo.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {error ? <p className="mt-5 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {message ? <p className="mt-5 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="submit" disabled={saving} className="rounded-md bg-emerald-900 hover:bg-emerald-950">
            {saving ? "Đang tải lên..." : "Tải lên"}
          </Button>
        </div>
      </form>

      <PropertyDetailsEditor
        property={property}
        saving={detailSaving}
        error={detailError}
        onSaveDetails={onSaveDetails}
      />
    </section>
  );
}

function createFaqId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `faq-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function DetailTextSection({
  title,
  body,
  placeholder,
  onEdit,
}: {
  title: string;
  body: string;
  placeholder: string;
  onEdit: () => void;
}) {
  return (
    <section className="border-t border-slate-200 py-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-teal-800 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
        >
          Điều chỉnh
        </button>
      </div>
      <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-5 text-sm leading-7 text-slate-600">
        {body.trim() || placeholder}
      </p>
    </section>
  );
}

function DetailTextModal({
  title,
  value,
  saving,
  onClose,
  onSave,
}: {
  title: string;
  value: string;
  saving: boolean;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const dirty = draft.trim() !== value.trim();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-2xl">
        <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
        <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="detail-content">
          Nội dung
        </label>
        <textarea
          id="detail-content"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={8}
          className="mt-2 w-full resize-y rounded-md border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          placeholder="Nhập nội dung hiển thị cho khách..."
        />
        <div className="mt-5 flex justify-end gap-3">
          {dirty ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => onSave(draft)}
              className="rounded-md bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

function PropertyDetailsEditor({
  property,
  saving,
  error,
  onSaveDetails,
}: {
  property: HostProperty;
  saving: boolean;
  error: string;
  onSaveDetails: (payload: Partial<Pick<HostProperty, "description" | "notes" | "faqs">>) => Promise<void>;
}) {
  const [editingText, setEditingText] = useState<"description" | "notes" | null>(null);
  const [faqDrafts, setFaqDrafts] = useState<PropertyFaq[]>(property.faqs ?? []);
  const faqs = property.faqs ?? [];

  useEffect(() => {
    setFaqDrafts(property.faqs ?? []);
  }, [property.faqs]);

  function updateFaqDraft(id: string, value: string) {
    setFaqDrafts((current) => current.map((faq) => (faq.id === id ? { ...faq, question: value } : faq)));
  }

  function addFaqDraft() {
    setFaqDrafts((current) => [...current, { id: createFaqId(), question: "", answer: "" }]);
  }

  async function saveFaq(faq: PropertyFaq) {
    const nextFaqs = faqDrafts
      .map((item) => (item.id === faq.id ? { ...faq, question: faq.question.trim(), answer: "" } : { ...item, answer: "" }))
      .filter((item) => item.question.trim());
    await onSaveDetails({ faqs: nextFaqs });
  }

  async function removeFaq(id: string) {
    const nextFaqs = faqDrafts.filter((faq) => faq.id !== id);
    setFaqDrafts(nextFaqs);
    await onSaveDetails({ faqs: nextFaqs });
  }

  function isFaqDirty(faq: PropertyFaq) {
    const original = faqs.find((item) => item.id === faq.id);
    if (!original) return Boolean(faq.question.trim());
    return original.question !== faq.question;
  }

  const hasPendingFaq = faqDrafts.some((faq) => !faqs.some((item) => item.id === faq.id) || isFaqDirty(faq));

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900">Thông tin chi tiết chỗ nghỉ</p>
      <div className="mt-3">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Nội dung hiển thị trên trang khách</h2>
      </div>

      <div className="mt-6">
        <DetailTextSection
          title="Giới thiệu"
          body={property.description ?? ""}
          placeholder="Host chưa bổ sung phần giới thiệu cho chỗ nghỉ này."
          onEdit={() => setEditingText("description")}
        />

        <section className="border-t border-slate-200 py-6">
          <h3 className="text-xl font-semibold text-slate-950">Câu hỏi thường gặp</h3>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {faqDrafts.map((faq) => {
              const dirty = isFaqDirty(faq);
              return (
                <div key={faq.id} className="grid gap-3 border-b border-slate-200 px-4 py-4 last:border-b-0 md:grid-cols-[1fr_auto]">
                  <input
                    value={faq.question}
                    onChange={(event) => updateFaqDraft(faq.id, event.target.value)}
                    className="min-h-11 rounded-md border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                    placeholder="Thêm câu hỏi"
                  />
                  <div className="flex items-center justify-end gap-2">
                    {dirty ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => saveFaq(faq)}
                        className="grid h-10 w-10 place-items-center rounded-md bg-teal-800 text-lg font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Lưu câu hỏi"
                      >
                        ✓
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => removeFaq(faq.id)}
                      className="grid h-10 w-10 place-items-center rounded-md bg-rose-600 text-xl font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Xóa câu hỏi"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              disabled={hasPendingFaq || saving}
              onClick={addFaqDraft}
              className="flex min-h-14 w-full items-center px-4 text-left text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
            >
              Thêm câu hỏi
            </button>
          </div>
        </section>

        <DetailTextSection
          title="Ghi chú"
          body={property.notes ?? ""}
          placeholder="Host chưa bổ sung ghi chú riêng cho khách."
          onEdit={() => setEditingText("notes")}
        />
      </div>

      {error ? <p className="mt-5 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {editingText ? (
        <DetailTextModal
          title={editingText === "description" ? "Giới thiệu" : "Ghi chú"}
          value={(editingText === "description" ? property.description : property.notes) ?? ""}
          saving={saving}
          onClose={() => setEditingText(null)}
          onSave={async (value) => {
            await onSaveDetails({ [editingText]: value });
            setEditingText(null);
          }}
        />
      ) : null}
    </section>
  );
}

function ImageDisplaySetup({
  propertyTitle,
  imageItems,
  setImageItems,
  dirty,
  saving,
  onSave,
  onReset,
}: {
  propertyTitle: string;
  imageItems: PropertyImageItem[];
  setImageItems: (images: PropertyImageItem[]) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const visibleImages = imageItems.slice(0, MIN_PROPERTY_IMAGES);
  const extraCount = Math.max(0, imageItems.length - MIN_PROPERTY_IMAGES);

  function moveImage(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const draggedIndex = imageItems.findIndex((image) => image.id === draggedId);
    const targetIndex = imageItems.findIndex((image) => image.id === targetId);
    if (draggedIndex < 0 || targetIndex < 0) return;

    const nextImages = [...imageItems];
    const [draggedImage] = nextImages.splice(draggedIndex, 1);
    nextImages.splice(targetIndex, 0, draggedImage);
    setImageItems(nextImages);
  }

  return (
    <div className="mt-6">
      {visibleImages.length ? (
        <div className="grid gap-2 overflow-hidden rounded-xl bg-white">
          <div className="grid gap-2 lg:grid-cols-[2fr_1fr]">
            <DraggableImageSlot
              image={visibleImages[0]}
              label="Ảnh chính"
              alt={propertyTitle}
              className="min-h-[330px] lg:min-h-[430px]"
              onMove={moveImage}
              onOpen={() => setGalleryOpen(true)}
            />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {visibleImages.slice(1, 3).map((image, index) => (
                <DraggableImageSlot
                  key={image.id}
                  image={image}
                  label={`Ảnh ${index + 2}`}
                  alt={`${propertyTitle} ${index + 2}`}
                  className="min-h-[160px] lg:min-h-0"
                  onMove={moveImage}
                  onOpen={() => setGalleryOpen(true)}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {visibleImages.slice(3, 8).map((image, index) => {
              const position = index + 4;
              const isLast = position === MIN_PROPERTY_IMAGES && extraCount > 0;
              return (
                <DraggableImageSlot
                  key={image.id}
                  image={image}
                  label={`Ảnh ${position}`}
                  alt={`${propertyTitle} ${position}`}
                  className="aspect-[1.55]"
                  onMove={moveImage}
                  onOpen={() => setGalleryOpen(true)}
                  overlay={isLast ? `+${extraCount} ảnh` : undefined}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid min-h-[260px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
          Chưa có ảnh thật. Hãy tải ảnh ở khung bên dưới để bắt đầu sắp xếp vị trí hiển thị.
        </div>
      )}

      {galleryOpen ? (
        <HostImageLibraryModal
          propertyTitle={propertyTitle}
          images={imageItems}
          dirty={dirty}
          saving={saving}
          onMove={moveImage}
          onSave={onSave}
          onReset={onReset}
          onClose={() => setGalleryOpen(false)}
        />
      ) : null}
    </div>
  );
}

function HostImageLibraryModal({
  propertyTitle,
  images,
  dirty,
  saving,
  onMove,
  onSave,
  onReset,
  onClose,
}: {
  propertyTitle: string;
  images: PropertyImageItem[];
  dirty: boolean;
  saving: boolean;
  onMove: (draggedId: string, targetId: string) => void;
  onSave: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/55 p-2 text-slate-950 sm:p-5">
      <div className="mx-auto flex h-full max-w-[1680px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="grid h-16 shrink-0 grid-cols-[160px_minmax(0,1fr)_260px] items-center border-b border-slate-200 px-5">
          <div />
          <h2 className="truncate text-center text-lg font-semibold">{propertyTitle}</h2>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onReset}
              disabled={!dirty || saving}
              className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-xl font-light text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Hoàn tác thứ tự ảnh"
            >
              ×
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || saving}
              className={`h-10 rounded-md px-5 text-sm font-semibold transition ${
                dirty ? "bg-emerald-900 text-white hover:bg-emerald-950" : "cursor-not-allowed bg-slate-200 text-slate-500"
              }`}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 text-sm font-semibold text-slate-950"
            >
              Đóng <span className="ml-3 text-3xl font-light align-middle">×</span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {images.map((image, index) => (
              <DraggableImageSlot
                key={image.id}
                image={image}
                label={index === 0 ? "Ảnh chính" : index < MIN_PROPERTY_IMAGES ? `Ảnh ${index + 1}` : "Ảnh thư viện"}
                alt={`${propertyTitle} ${index + 1}`}
                className="aspect-[1.42]"
                onMove={onMove}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DraggableImageSlot({
  image,
  label,
  alt,
  className,
  onMove,
  overlay,
  onOpen,
}: {
  image?: PropertyImageItem;
  label: string;
  alt: string;
  className: string;
  onMove: (draggedId: string, targetId: string) => void;
  overlay?: string;
  onOpen?: () => void;
}) {
  if (!image) {
    return <div className={`rounded-lg border border-dashed border-slate-300 bg-slate-50 ${className}`} />;
  }

  return (
    <div
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/plain", image.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onMove(event.dataTransfer.getData("text/plain"), image.id);
      }}
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={(event) => {
        if (onOpen && (event.key === "Enter" || event.key === " ")) onOpen();
      }}
      className={`group relative cursor-grab overflow-hidden rounded-lg bg-slate-100 active:cursor-grabbing ${className}`}
    >
      <Image
        src={image.url}
        alt={alt}
        fill
        unoptimized
        sizes="(min-width: 1024px) 45vw, 100vw"
        className={`object-cover transition duration-300 group-hover:scale-[1.02] ${overlay ? "brightness-75" : ""}`}
      />
      <span className="absolute left-3 top-3 rounded bg-emerald-950/90 px-3 py-1 text-xs font-semibold text-white shadow-sm">
        {label}
      </span>
      {overlay ? (
        <span className="absolute inset-0 grid place-items-center bg-slate-950/35 text-xl font-semibold text-white underline decoration-2 underline-offset-4">
          {overlay}
        </span>
      ) : null}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyHomeTab({
  property,
  bookings,
  revenue,
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
  bookings: HostBooking[];
  revenue: number;
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
  const latestBooking = bookings[0];
  const completionItems = [
    { title: "Đồng bộ hóa phòng trống để tránh quá tải đặt phòng", action: "Đồng bộ phòng trống", done: false },
    { title: "Đăng hình ảnh thích hợp của chỗ nghỉ để thu hút khách", action: "Đăng ảnh", done: Boolean(property.thumbnailUrl) },
    { title: "Thêm tiện nghi phòng", action: "Thêm tiện nghi phòng", done: false },
    { title: "Thêm các tiện nghi và dịch vụ của chỗ nghỉ", action: "Thêm tiện nghi", done: false },
    { title: "Xem trước trang chỗ nghỉ", action: "Xem trước trang chỗ nghỉ", done: true },
  ];
  const completedItems = completionItems.filter((item) => item.done).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-5">
        <HostNotice tone="warning" title="Cập nhật quan trọng">
          Quý vị nên tăng cường bảo mật bằng cách tạo danh sách email được chấp thuận có thể liên hệ với khách. Vào menu Chỗ nghỉ, rồi vào Tùy chọn tin nhắn nhắn tin và thêm email qua mục Cài đặt bảo mật.
        </HostNotice>
        <HostNotice tone="warning" title="Cập nhật quan trọng">
          Khách đang quan tâm đến chính sách hủy linh hoạt. Hãy kiểm tra lại điều kiện đặt phòng để tăng cơ hội nhận đơn.
        </HostNotice>
        <HostNotice tone="info" title="Yêu cầu bổ sung thông tin">
          Quý vị sẽ cần cung cấp thêm thông tin để TripNest kiểm tra và tối ưu trang chỗ nghỉ. Bổ sung đầy đủ sẽ giúp chỗ nghỉ hiển thị tốt hơn.
        </HostNotice>
        <HostNotice tone="danger" title="Giá không hoàn tiền vẫn chưa khả dụng">
          Hiện tại khách chỉ có thể đặt chỗ nghỉ nếu quý vị cài đặt giá linh động. Sau khi xác thực xong, giá không hoàn tiền sẽ khả dụng.
        </HostNotice>

        <section>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-slate-950">{property.title}</h2>
            <span className="rounded-sm bg-rose-600 px-2 py-1 text-xs font-semibold text-white">
              {property.status === "ACTIVE" ? "Đang nhận đặt phòng" : "Đóng / Không thể đặt phòng"}
            </span>
          </div>
        </section>

        <section className="rounded-sm border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-slate-950">
              Thiết lập cơ bản ({completedItems} / {completionItems.length} đã hoàn tất)
            </h3>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-rose-600" style={{ width: `${(completedItems / completionItems.length) * 100}%` }} />
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {completionItems.map((item, index) => (
              <SetupTask key={item.title} title={item.title} action={item.action} done={item.done} open={index === 1}>
                {index === 1 ? (
                  <form onSubmit={onSaveImages} className="mt-4 rounded-sm bg-slate-50 p-4">
                    <p className="text-sm leading-6 text-slate-600">
                      Tải tối thiểu {MIN_PROPERTY_IMAGES} ảnh thật. Ảnh đầu tiên sẽ là ảnh chính trên trang tìm kiếm và gallery chi tiết.
                    </p>
                    <label className="mt-4 grid min-h-[120px] cursor-pointer place-items-center rounded-sm border border-dashed border-blue-400 bg-white px-4 py-6 text-center transition hover:bg-blue-50">
                      <span className="font-semibold text-blue-700">Tải ảnh lên</span>
                      <span className="mt-1 text-xs text-slate-500">jpg, png hoặc webp, tối đa 47MB mỗi file</span>
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
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {photos.map((photo) => (
                          <div key={photo.id} className={`relative aspect-[4/3] overflow-hidden rounded-sm border-2 bg-slate-100 ${photo.isMain ? "border-amber-500" : "border-slate-200"}`}>
                            {photo.isMain ? <span className="absolute left-2 top-0 z-10 rounded-b bg-amber-500 px-2 py-1 text-xs font-semibold text-white">Ảnh chính</span> : null}
                            <button type="button" onClick={() => onMakeMain(photo.id)} className="relative block h-full w-full" aria-label={`Đặt ${photo.name} làm ảnh chính`}>
                              <Image src={photo.url} alt={photo.name} fill unoptimized sizes="(min-width: 1280px) 25vw, 50vw" className="object-cover" />
                            </button>
                            <button type="button" onClick={() => onRemovePhoto(photo.id)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-lg font-semibold text-slate-700 shadow-md transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Xóa ${photo.name}`}>×</button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {error ? <p className="mt-4 rounded-sm bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
                    {message ? <p className="mt-4 rounded-sm bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button type="submit" disabled={saving} className="rounded-sm bg-blue-700 hover:bg-blue-800">
                        {saving ? "Đang lưu ảnh..." : "Lưu bộ ảnh"}
                      </Button>
                      <a href={`/properties/${property.id}`} className="rounded-sm border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">Xem trang khách</a>
                    </div>
                  </form>
                ) : null}
              </SetupTask>
            ))}
            <button type="button" className="w-full px-5 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-50">
              Xem thêm 2 công việc khác
            </button>
          </div>
        </section>

        <HostPanel title="Đặt phòng">
          <div className="grid min-h-44 place-items-center border-t border-slate-100 px-6 py-8 text-center">
            <div>
              <p className="text-sm leading-6 text-slate-600">
                Thông tin trong mục này giúp quý vị lên kế hoạch trong ngày tốt hơn. Quý vị có thể lọc thời gian đến/rời và các sự kiện khác theo ngày hoặc khoảng thời gian.
              </p>
              <a href="/host/bookings" className="mt-4 inline-flex rounded-sm border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700">
                Xem tất cả đặt phòng
              </a>
            </div>
          </div>
        </HostPanel>

        <HostPanel title="Đặt phòng mới nhất">
          {latestBooking ? (
            <div className="grid gap-3 border-t border-slate-100 px-5 py-4 text-sm md:grid-cols-[1fr_1fr_auto]">
              <div>
                <p className="font-semibold text-slate-950">{latestBooking.guest.name ?? latestBooking.guest.email}</p>
                <p className="mt-1 text-blue-700">{latestBooking.id.slice(-8).toUpperCase()}</p>
              </div>
              <p className="text-slate-600">{latestBooking.checkIn ?? "—"} - {latestBooking.checkOut ?? "—"} · {latestBooking.numGuests} khách</p>
              <p className="font-semibold text-slate-950">{formatCurrency(latestBooking.totalPrice)}</p>
            </div>
          ) : (
            <p className="border-t border-slate-100 px-5 py-8 text-center text-sm text-slate-500">Chưa có đặt phòng mới cho chỗ nghỉ này.</p>
          )}
        </HostPanel>

        <HostPanel title="Các tin nhắn chưa trả lời">
          <div className="grid min-h-40 place-items-center border-t border-slate-100 px-6 py-8 text-center">
            <div>
              <p className="text-sm leading-6 text-slate-600">
                Tại đây, quý vị sẽ có thể xem tất cả tin nhắn chưa đọc, cùng như yêu cầu của khách về tùy chọn giường và thời gian nhận phòng.
              </p>
              <button className="mt-4 rounded-sm border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700">
                Cài đặt tùy chọn nhắn tin
              </button>
            </div>
          </div>
        </HostPanel>

        <HostPanel title="Điểm chỗ nghỉ">
          <div className="border-t border-slate-100 px-5 py-5">
            <div className="flex items-center justify-between text-sm">
              <span>Điểm trang chỗ nghỉ</span>
              <span className="font-semibold">{property.thumbnailUrl ? "68%" : "48%"}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-orange-500" style={{ width: property.thumbnailUrl ? "68%" : "48%" }} />
            </div>
            <p className="mt-3 text-sm text-slate-500">Trung bình khu vực 93%</p>
          </div>
        </HostPanel>

        <HostPanel title={`Nhu cầu cho ${property.city}`}>
          <div className="grid gap-4 border-t border-slate-100 px-5 py-5 text-sm md:grid-cols-4">
            <Metric label="Thay đổi về nhu cầu của khách" value="Tăng 14%" tone="success" />
            <Metric label="Thời gian tìm kiếm" value="Không xác định ngày" />
            <Metric label="Thời gian lưu trú" value="Không xác định nhất" />
            <Metric label="Top quốc gia" value="Việt Nam" />
          </div>
        </HostPanel>

        <HostPanel title="Hiệu suất hoạt động">
          <div className="grid gap-4 border-t border-slate-100 px-5 py-5 text-sm md:grid-cols-4">
            <Metric label="Giá trung bình hằng ngày" value={formatCurrency(property.pricePerNight)} />
            <Metric label="Tỷ lệ hủy" value={`${property.cancellations || 0}%`} />
            <Metric label="Doanh thu" value={formatCurrency(revenue)} />
            <Metric label="Số đêm đã lưu trú" value={`${bookings.length}`} />
          </div>
        </HostPanel>

        <HostPanel title="Hiệu suất kết quả tìm kiếm">
          <div className="grid gap-4 border-t border-slate-100 px-5 py-5 text-sm md:grid-cols-3">
            <Metric label="Lượt xem trên kết quả tìm kiếm" value="2,506" />
            <Metric label="Lượt xem trang chỗ nghỉ" value="61" />
            <Metric label="Đặt phòng đã nhận" value={`${bookings.length}`} />
          </div>
        </HostPanel>
      </div>

      <aside className="space-y-5">
        <section className="rounded-sm border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5">
            <h3 className="font-semibold text-slate-950">Đang chờ xử lý</h3>
            <p className="mt-2 text-sm text-slate-600">Quý vị có <span className="font-semibold text-blue-700">1 hóa đơn chưa thanh toán.</span></p>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-950">Đề xuất</h3>
              <button className="text-xs font-semibold text-blue-700">Tìm thêm đề xuất</button>
            </div>
            <div className="mt-4 divide-y divide-slate-200">
              {[
                ["Thêm ảnh chỗ nghỉ", "10+ ảnh chỗ nghỉ, bao gồm ảnh bên ngoài, có thể tăng lượng đặt phòng"],
                ["Thu hút thêm khách bằng ảnh khu bếp có gắn thẻ", "Khi khách biết khu bếp trông ra sao, khả năng họ đặt chỗ sẽ cao hơn."],
                ["Thêm ảnh phòng tắm để thu hút nhiều khách hơn", "Khách nhìn thấy phòng tắm trông ra sao có khả năng đặt chỗ cao hơn."],
                ["Tăng số lượng đơn đặt lên trung bình 30%", "Tiếp cận khách đặt trên điện thoại di động và nhận về thêm trung bình 30% đơn đặt."],
                ["Thêm độ linh động cho đặt phòng không hoàn tiền", "Giúp khách dễ dàng đổi lịch hơn mà vẫn giữ được doanh thu."],
              ].map(([title, body]) => (
                <div key={title} className="py-4">
                  <p className="font-semibold text-slate-950">{title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{body}</p>
                  <button className="mt-2 text-sm font-semibold text-blue-700">Tìm hiểu thêm</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

type SettingsSection = "property" | "pricing";

const amenitySections = [
  { title: "Tiện nghi chung", items: ["Điều hòa nhiệt độ", "Hệ thống sưởi", "WiFi miễn phí", "Trạm sạc xe điện"] },
  { title: "Nấu nướng và giặt rửa", items: ["Bếp", "Bếp nhỏ", "Máy giặt"] },
  { title: "Giải trí", items: ["TV màn hình phẳng", "Hồ bơi", "Bể sục", "Minibar", "Phòng xông hơi"] },
  { title: "Không gian ngoài trời và tầm nhìn", items: ["Ban công", "Nhìn ra vườn", "Sân thượng / hiên", "Tầm nhìn ra khung cảnh"] },
];

const languageOptions = ["Tiếng Anh", "Tiếng Pháp", "Tiếng Trung", "Tiếng Tây Ban Nha", "Tiếng Việt"];
const extraLanguageOptions = ["Tiếng Ba Lan", "Tiếng Bồ Đào Nha", "Tiếng Hàn", "Tiếng Indonesia", "Tiếng Nhật", "Tiếng Nga", "Tiếng Thái", "Tiếng Ý"];
const timeOptions = ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

type PropertySetupDraft = {
  title: string;
  location: string;
  basePrice: string;
  maxGuests: string;
  bedroomCount: string;
  livingRooms: string;
  bathrooms: string;
  childrenAllowed: boolean;
  cribsAvailable: boolean;
  sizeM2: string;
  amenities: string;
  services: string;
  languages: string;
  smokingAllowed: boolean;
  partiesAllowed: boolean;
  petsPolicy: string;
  checkInFrom: string;
  checkInTo: string;
  checkOutFrom: string;
  checkOutTo: string;
};

function SettingsTab({ property }: { property: HostProperty }) {
  const [section, setSection] = useState<SettingsSection>("property");

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-emerald-900/15 bg-white p-2 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { key: "property" as const, label: "Thiết lập chỗ nghỉ" },
            { key: "pricing" as const, label: "Lịch & giá" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSection(item.key)}
              className={`rounded-md px-4 py-3 text-sm font-semibold transition ${
                section === item.key ? "bg-emerald-900 text-white" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-950"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {section === "property" ? <PropertySetupPanel property={property} /> : null}
      {section === "pricing" ? <PricingCalendarPanel property={property} /> : null}
    </section>
  );
}

function PropertySetupPanel({ property }: { property: HostProperty }) {
  const [draft, setDraft] = useState<PropertySetupDraft>(() => ({
    title: property.title,
    location: property.address,
    basePrice: String(property.pricePerNight),
    maxGuests: String(property.maxGuests),
    bedroomCount: String(property.bedroomCount),
    livingRooms: String(property.livingRoomSofaBeds ?? 0),
    bathrooms: String(property.bathrooms),
    childrenAllowed: property.childrenAllowed ?? true,
    cribsAvailable: property.cribsAvailable ?? false,
    sizeM2: property.sizeM2 ? String(Math.round(property.sizeM2)) : "",
    amenities: property.amenities?.map((amenity) => amenity.name).join(", ") ?? "",
    services: getServiceSummary(property),
    languages: property.languages?.join(", ") || "Tiếng Việt",
    smokingAllowed: property.smokingAllowed ?? false,
    partiesAllowed: property.partiesAllowed ?? false,
    petsPolicy: getPetPolicyLabel(property.petsPolicy),
    checkInFrom: property.checkInFrom ?? "15:00",
    checkInTo: property.checkInTo ?? "18:00",
    checkOutFrom: property.checkOutFrom ?? "08:00",
    checkOutTo: property.checkOutTo ?? "11:00",
  }));
  const [status, setStatus] = useState("");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");
  const [approvalFiles, setApprovalFiles] = useState<string[]>([]);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const mapUrl = getPropertyMapUrl(draft.location);

  function updateDraft(field: keyof PropertySetupDraft, value: string | boolean) {
    setDraft((current) => ({ ...current, [field]: value }));
    setStatus("");
  }

  function toggleDraftList(field: "amenities" | "languages", item: string) {
    setDraft((current) => ({ ...current, [field]: toggleCsvItem(current[field], item) }));
    setStatus("");
  }

  function addDraftLanguage(item: string) {
    if (!item) return;
    setDraft((current) => ({ ...current, languages: addCsvItem(current.languages, item) }));
    setStatus("");
  }

  function submitSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Đã lưu thay đổi");
  }

  async function submitSensitiveChange() {
    if (!approvalReason.trim()) {
      setStatus("Vui lòng nhập lý do thay đổi.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setStatus("Vui lòng đăng nhập lại để gửi yêu cầu.");
      return;
    }

    setSettingsSaving(true);
    try {
      await api.post(
        `/host/properties/${property.id}/change-requests`,
        {
          title: draft.title,
          location: draft.location,
          pricePerNight: Number(draft.basePrice),
          reason: approvalReason,
          documents: approvalFiles,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApprovalOpen(false);
      setApprovalReason("");
      setApprovalFiles([]);
      setStatus("Đã lưu thay đổi");
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setStatus(message ?? "Không thể gửi yêu cầu duyệt.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function saveOperationalSettings(successMessage: string) {
    const token = getAccessToken();
    if (!token) {
      setStatus("Vui lòng đăng nhập lại để lưu thay đổi.");
      return;
    }

    setSettingsSaving(true);
    try {
      await api.patch(
        `/host/properties/${property.id}/operational-settings`,
        {
          amenities: csvToList(draft.amenities),
          languages: csvToList(draft.languages),
          services: {
            breakfastIncluded: csvToList(draft.services).includes("Bữa sáng"),
            parkingType: serviceParkingType(draft.services),
          },
          details: {
            livingRoomSofaBeds: Number(draft.livingRooms) || 0,
            bedroomCount: Number(draft.bedroomCount) || 0,
            bathrooms: Number(draft.bathrooms) || 1,
            maxGuests: Number(draft.maxGuests) || 1,
            childrenAllowed: draft.childrenAllowed,
            cribsAvailable: draft.cribsAvailable,
            sizeM2: draft.sizeM2 ? Number(draft.sizeM2) : null,
          },
          rules: {
            smokingAllowed: draft.smokingAllowed,
            partiesAllowed: draft.partiesAllowed,
            petsPolicy: petPolicyValue(draft.petsPolicy),
            checkInFrom: draft.checkInFrom,
            checkInTo: draft.checkInTo,
            checkOutFrom: draft.checkOutFrom,
            checkOutTo: draft.checkOutTo,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus(successMessage);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setStatus(message ?? "Không thể lưu thay đổi.");
    } finally {
      setSettingsSaving(false);
    }
  }

  return (
    <form onSubmit={submitSetup} className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-emerald-900/15 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="px-5 pt-5">
            <h2 className="text-xl font-semibold text-emerald-950">Thiết lập chỗ nghỉ</h2>
            <p className="mt-1 text-sm text-slate-500">{property.code}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setApprovalOpen(true);
              setStatus("");
            }}
            className="mr-5 mt-5 rounded-md bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-950"
          >
            Lưu thay đổi
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-lg border border-emerald-900/10 bg-emerald-50/40 p-4">
            <div className="grid gap-4">
              <Field label="Tên chỗ nghỉ" value={draft.title} onChange={(value) => updateDraft("title", value)} />
              <Field label="Vị trí" value={draft.location} onChange={(value) => updateDraft("location", value)} />
              <Field label="Mức giá gốc" value={formatMoneyInput(draft.basePrice)} onChange={(value) => updateDraft("basePrice", parseMoneyInput(value))} suffix="VND" />
            </div>

            {approvalOpen ? (
              <div className="mt-5 rounded-lg border border-emerald-900/20 bg-white p-4 shadow-sm">
                <label className="block">
                  <span className="text-sm font-semibold text-emerald-950">Lý do thay đổi</span>
                  <textarea
                    value={approvalReason}
                    onChange={(event) => setApprovalReason(event.target.value)}
                    placeholder="Nhập lý do thay đổi..."
                    rows={4}
                    className="mt-2 w-full resize-none rounded-md border border-emerald-900/20 bg-emerald-50/30 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-800"
                  />
                </label>
                <label className="mt-4 flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-emerald-900/25 bg-emerald-50/40 px-4 py-3 text-center text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50">
                  Upload ảnh minh chứng
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(event) => setApprovalFiles(Array.from(event.target.files ?? []).map((file) => file.name))}
                  />
                  <span className="mt-1 text-xs font-medium text-slate-500">
                    {approvalFiles.length ? `${approvalFiles.length} ảnh đã chọn` : "jpg, png hoặc webp"}
                  </span>
                </label>
                <div className="mt-4 flex justify-start gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setApprovalOpen(false);
                      setApprovalReason("");
                      setApprovalFiles([]);
                    }}
                    className="rounded-md border border-emerald-900/25 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={submitSensitiveChange}
                    disabled={settingsSaving}
                    className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-950"
                  >
                    {settingsSaving ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-h-[320px] overflow-hidden rounded-lg border border-emerald-900/15 bg-emerald-950">
            <iframe
              title={`Bản đồ ${draft.title}`}
              src={mapUrl}
              className="h-full min-h-[320px] w-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-emerald-900/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-emerald-950">Chi tiết chỗ nghỉ</h3>
          <button
            type="button"
            onClick={() => saveOperationalSettings("Đã cập nhật chi tiết chỗ nghỉ.")}
            disabled={settingsSaving}
            className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-950 disabled:cursor-not-allowed disabled:bg-emerald-900/60"
          >
            {settingsSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Stepper label="Phòng khách" value={Number(draft.livingRooms) || 0} min={0} onChange={(value) => updateDraft("livingRooms", String(value))} />
          <Stepper label="Phòng ngủ" value={Number(draft.bedroomCount) || 0} min={0} onChange={(value) => updateDraft("bedroomCount", String(value))} />
          <Stepper label="Phòng tắm" value={Number(draft.bathrooms) || 0} min={1} onChange={(value) => updateDraft("bathrooms", String(value))} />
          <Stepper label="Số khách" value={Number(draft.maxGuests) || 1} min={1} onChange={(value) => updateDraft("maxGuests", String(value))} />
          <div className="xl:col-span-2">
            <InlineField label="Diện tích" value={draft.sizeM2} onChange={(value) => updateDraft("sizeM2", value.replace(/\D/g, ""))} suffix="m²" />
          </div>
          <Toggle label="Đón tiếp trẻ em" checked={draft.childrenAllowed} onChange={(value) => updateDraft("childrenAllowed", value)} />
          <Toggle label="Có nôi/cũi" checked={draft.cribsAvailable} onChange={(value) => updateDraft("cribsAvailable", value)} />
        </div>
      </section>

      <section className="rounded-lg border border-emerald-900/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-emerald-950">Tiện ích và dịch vụ</h3>
          <button
            type="button"
            onClick={() => saveOperationalSettings("Đã cập nhật tiện ích và dịch vụ lên chi tiết chỗ ở.")}
            disabled={settingsSaving}
            className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-950"
          >
            {settingsSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.1fr)]">
          <AmenityChecklist selected={csvToList(draft.amenities)} onToggle={(item) => toggleDraftList("amenities", item)} />
          <div className="space-y-5">
            <div className="rounded-lg border border-emerald-900/15 p-5">
              <p className="font-semibold text-slate-950">Dịch vụ tại chỗ nghỉ</p>
              <div className="mt-4 grid gap-3">
                <CheckOption label="Bữa sáng" checked={csvToList(draft.services).includes("Bữa sáng")} onChange={() => updateDraft("services", toggleCsvItem(draft.services, "Bữa sáng"))} />
                <CheckOption label="Chỗ đậu xe miễn phí" checked={csvToList(draft.services).includes("Chỗ đậu xe miễn phí")} onChange={() => updateDraft("services", toggleCsvItem(draft.services, "Chỗ đậu xe miễn phí"))} />
                <CheckOption label="Chỗ đậu xe tính phí" checked={csvToList(draft.services).includes("Chỗ đậu xe tính phí")} onChange={() => updateDraft("services", toggleCsvItem(draft.services, "Chỗ đậu xe tính phí"))} />
              </div>
            </div>
            <LanguageCombobox selected={csvToList(draft.languages)} onToggle={(item) => toggleDraftList("languages", item)} onAdd={addDraftLanguage} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-emerald-900/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-emerald-950">Quy định chung</h3>
          <button
            type="button"
            onClick={() => saveOperationalSettings("Đã cập nhật quy định chung lên chi tiết chỗ ở.")}
            disabled={settingsSaving}
            className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-950"
          >
            {settingsSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Toggle label="Cho phép hút thuốc" checked={draft.smokingAllowed} onChange={(value) => updateDraft("smokingAllowed", value)} />
          <Toggle label="Cho phép tiệc/sự kiện" checked={draft.partiesAllowed} onChange={(value) => updateDraft("partiesAllowed", value)} />
          <InlineSelectField label="Vật nuôi" value={draft.petsPolicy} options={["Cho phép", "Theo yêu cầu", "Không cho phép"]} onChange={(value) => updateDraft("petsPolicy", value)} />
        </div>
        <div className="mt-6 rounded-lg border border-emerald-900/15 p-5">
          <TimeRangeSelect title="Nhận phòng" from={draft.checkInFrom} to={draft.checkInTo} onFrom={(value) => updateDraft("checkInFrom", value)} onTo={(value) => updateDraft("checkInTo", value)} />
          <div className="mt-7">
            <TimeRangeSelect title="Trả phòng" from={draft.checkOutFrom} to={draft.checkOutTo} onFrom={(value) => updateDraft("checkOutFrom", value)} onTo={(value) => updateDraft("checkOutTo", value)} />
          </div>
        </div>
      </section>

      {status ? <p role="status" className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{status}</p> : null}
    </form>
  );
}

function PricingCalendarPanel({ property }: { property: HostProperty }) {
  const today = new Date();
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(today));
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [priceInput, setPriceInput] = useState(String(property.pricePerNight));
  const [rateStatus, setRateStatus] = useState("");
  const minPrice = Math.round(property.pricePerNight * 0.7);
  const maxPrice = Math.round(property.pricePerNight * 1.3);
  const previewPrice = Number(priceInput);
  const selectedPrice = Number.isFinite(previewPrice) && previewPrice > 0 ? previewPrice : customPrices[selectedDate] ?? property.pricePerNight;
  const commission = Math.round(selectedPrice * 0.15);
  const hostRevenue = selectedPrice - commission;
  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const rangeStart = toDateKey(calendarDays[0]);
  const rangeEndDate = new Date(calendarDays[calendarDays.length - 1]);
  rangeEndDate.setDate(rangeEndDate.getDate() + 1);
  const rangeEnd = toDateKey(rangeEndDate);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    api.get(`/host/properties/${property.id}/daily-rates?from=${rangeStart}&to=${rangeEnd}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        const rates = (response.data.data?.rates ?? []) as Array<{ date: string; pricePerNight: number }>;
        setCustomPrices((current) => ({
          ...current,
          ...Object.fromEntries(rates.map((rate) => [rate.date, rate.pricePerNight])),
        }));
      })
      .catch(() => undefined);
  }, [property.id, rangeEnd, rangeStart]);

  function saveDailyPrice() {
    const nextPrice = Number(priceInput);
    if (!Number.isFinite(nextPrice) || nextPrice < minPrice || nextPrice > maxPrice) {
      setRateStatus(`Thay đổi mức giá không thành công. Vui lòng nhập trong khoảng ${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}.`);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setRateStatus("Vui lòng đăng nhập lại để lưu giá.");
      return;
    }

    api.patch(
      `/host/properties/${property.id}/daily-rates`,
      { rates: [{ date: selectedDate, pricePerNight: nextPrice }] },
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(() => {
        setCustomPrices((current) => ({ ...current, [selectedDate]: nextPrice }));
        setPriceInput(String(nextPrice));
        setRateStatus("Thay đổi mức giá thành công. Mức giá chỉ áp dụng cho đơn đặt phòng được tạo sau khi lưu giá.");
      })
      .catch((error) => {
        const code = error.response?.data?.error?.code;
        setRateStatus(
          code === "DAILY_RATE_OUT_OF_RANGE"
            ? `Thay đổi mức giá không thành công. Vui lòng nhập trong khoảng ${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}.`
            : "Thay đổi mức giá không thành công."
        );
      });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-lg border border-emerald-900/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-emerald-950">Lịch & giá</h2>
            <p className="mt-1 text-sm text-slate-500">Giới hạn điều chỉnh: {formatCurrency(minPrice)} - {formatCurrency(maxPrice)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMonthDate(addMonths(monthDate, -1))} className="grid h-10 w-10 place-items-center rounded-md border border-emerald-900/20 text-emerald-950 hover:bg-emerald-50" aria-label="Tháng trước">
              ‹
            </button>
            <p className="min-w-[150px] text-center text-sm font-semibold text-emerald-950">
              {monthDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
            </p>
            <button type="button" onClick={() => setMonthDate(addMonths(monthDate, 1))} className="grid h-10 w-10 place-items-center rounded-md border border-emerald-900/20 text-emerald-950 hover:bg-emerald-50" aria-label="Tháng sau">
              ›
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">Giá khách trả</span>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-800">TripNest 15%</span>
            <span className="rounded-full bg-lime-50 px-3 py-1 text-lime-800">Doanh thu host</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 overflow-hidden rounded-lg border border-slate-200 text-sm">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
            <div key={day} className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-500">{day}</div>
          ))}
          {calendarDays.map((date) => {
            const dateKey = toDateKey(date);
            const price = customPrices[dateKey] ?? property.pricePerNight;
            const isSelected = dateKey === selectedDate;
            const isAdjusted = Boolean(customPrices[dateKey]);
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => {
                  setSelectedDate(dateKey);
                  setPriceInput(String(price));
                }}
                className={`min-h-[118px] border border-slate-100 p-2 text-left transition hover:bg-emerald-50 ${
                  isSelected ? "bg-emerald-50 ring-2 ring-inset ring-emerald-800" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{date.getDate()}</span>
                  {isAdjusted ? <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">Sửa</span> : null}
                </div>
                <PriceLine tone="guest" value={price} />
                <PriceLine tone="fee" value={Math.round(price * 0.15)} />
                <PriceLine tone="revenue" value={Math.round(price * 0.85)} />
              </button>
            );
          })}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-lg border border-emerald-900/15 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-emerald-950">Chỉnh giá theo ngày</h3>
          <p className="mt-2 text-sm font-medium text-slate-600">{selectedDate}</p>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">Giá khách trả</span>
            <div className="mt-2 flex overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-emerald-800">
              <span className="border-r border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500">VND</span>
              <input
                value={formatMoneyInput(priceInput)}
                onChange={(event) => setPriceInput(parseMoneyInput(event.target.value))}
                inputMode="numeric"
                className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
              />
            </div>
          </label>
          <div className="mt-4 grid gap-2 text-sm">
            <SummaryLine label="TripNest 15%" value={commission} tone="fee" />
            <SummaryLine label="Doanh thu sau hoa hồng" value={hostRevenue} tone="revenue" />
          </div>
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
            Chỉ áp dụng cho đơn đặt phòng được tạo sau khi lưu giá.
          </p>
          {rateStatus ? <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">{rateStatus}</p> : null}
          <button type="button" onClick={saveDailyPrice} className="mt-5 w-full rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-950">
            Lưu giá
          </button>
        </section>
      </aside>
    </div>
  );
}

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-2 flex overflow-hidden rounded-md border border-emerald-900/20 bg-white focus-within:border-emerald-800">
        <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 px-3 py-2 text-sm outline-none" />
        {suffix ? <span className="border-l border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function InlineField({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix?: string }) {
  return (
    <label className="flex min-h-[86px] overflow-hidden rounded-md border border-emerald-900/15 bg-white focus-within:border-emerald-800">
      <span className="flex w-40 shrink-0 items-center border-r border-emerald-900/15 px-4 text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex min-w-0 flex-1 items-center">
        <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 px-4 py-3 text-sm outline-none" />
        {suffix ? <span className="border-l border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md border border-emerald-900/20 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-800">
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function InlineSelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="flex min-h-[66px] overflow-hidden rounded-md border border-emerald-900/15 bg-white focus-within:border-emerald-800">
      <span className="flex w-32 shrink-0 items-center border-r border-emerald-900/15 px-4 text-sm font-semibold text-slate-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none">
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex h-full min-h-[66px] items-center justify-between gap-3 rounded-md border border-emerald-900/15 px-4 py-3">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-emerald-900" />
    </label>
  );
}

function CheckOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 text-sm text-slate-900">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-5 w-5 rounded border-slate-300 accent-emerald-800" />
      <span>{label}</span>
    </label>
  );
}

function AmenityChecklist({ selected, onToggle }: { selected: string[]; onToggle: (item: string) => void }) {
  return (
    <div className="rounded-lg border border-emerald-900/15 p-5">
      {amenitySections.map((section, index) => (
        <div key={section.title} className={index > 0 ? "mt-8 border-t border-slate-200 pt-8" : ""}>
          <p className="font-semibold text-slate-950">{section.title}</p>
          <div className="mt-4 grid gap-3">
            {section.items.map((item) => (
              <CheckOption key={item} label={item} checked={selected.includes(item)} onChange={() => onToggle(item)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LanguageCombobox({ selected, onToggle, onAdd }: { selected: string[]; onToggle: (item: string) => void; onAdd: (item: string) => void }) {
  const availableExtra = extraLanguageOptions.filter((language) => !selected.includes(language));

  return (
    <div className="rounded-lg border border-emerald-900/15 p-5">
      <p className="font-semibold text-slate-950">Ngôn ngữ</p>
      <div className="mt-4 grid gap-3">
        {languageOptions.map((item) => (
          <CheckOption key={item} label={item} checked={selected.includes(item)} onChange={() => onToggle(item)} />
        ))}
      </div>
      <div className="mt-7 border-t border-slate-200 pt-6">
        <p className="font-semibold text-slate-950">Thêm các ngôn ngữ khác</p>
        <select
          defaultValue=""
          onChange={(event) => {
            onAdd(event.target.value);
            event.currentTarget.value = "";
          }}
          className="mt-4 w-full rounded-md border border-emerald-900/25 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-800"
        >
          <option value="" disabled>Chọn thêm ngôn ngữ</option>
          {availableExtra.map((language) => (
            <option key={language} value={language}>{language}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TimeRangeSelect({ title, from, to, onFrom, onTo }: { title: string; from: string; to: string; onFrom: (value: string) => void; onTo: (value: string) => void }) {
  return (
    <div>
      <p className="font-semibold text-slate-950">{title}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SelectField label="Từ" value={from} options={timeOptions} onChange={onFrom} />
        <SelectField label="Đến" value={to} options={timeOptions} onChange={onTo} />
      </div>
    </div>
  );
}

function Stepper({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (value: number) => void }) {
  return (
    <div className="rounded-md border border-emerald-900/15 px-4 py-3">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid h-9 w-9 place-items-center rounded-md border border-emerald-900/20 text-xl text-emerald-950 hover:bg-emerald-50"
          aria-label={`Giảm ${label}`}
        >
          -
        </button>
        <span className="min-w-10 text-center text-lg font-semibold text-emerald-950">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="grid h-9 w-9 place-items-center rounded-md bg-emerald-900 text-xl text-white hover:bg-emerald-950"
          aria-label={`Tăng ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function PriceLine({ tone, value }: { tone: "guest" | "fee" | "revenue"; value: number }) {
  const classes = {
    guest: "bg-emerald-50 text-emerald-800",
    fee: "bg-rose-50 text-rose-800",
    revenue: "bg-lime-50 text-lime-800",
  }[tone];

  return <p className={`mt-1 rounded px-2 py-1 text-[11px] font-semibold ${classes}`}>{formatCurrency(value)}</p>;
}

function SummaryLine({ label, value, tone }: { label: string; value: number; tone: "guest" | "fee" | "revenue" }) {
  const classes = {
    guest: "text-emerald-800",
    fee: "text-rose-800",
    revenue: "text-lime-800",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
      <span className="text-slate-600">{label}</span>
      <span className={`font-semibold ${classes}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function getServiceSummary(property: HostProperty) {
  return [
    property.breakfastIncluded ? "Bữa sáng" : null,
    property.parkingType === "FREE" ? "Chỗ đậu xe miễn phí" : null,
    property.parkingType === "PAID" ? "Chỗ đậu xe tính phí" : null,
  ].filter(Boolean).join(", ");
}

function csvToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function addCsvItem(value: string, item: string) {
  const next = new Set(csvToList(value));
  next.add(item);
  return Array.from(next).join(", ");
}

function toggleCsvItem(value: string, item: string) {
  const next = new Set(csvToList(value));
  if (next.has(item)) {
    next.delete(item);
  } else {
    next.add(item);
  }
  return Array.from(next).join(", ");
}

function getPetPolicyLabel(value?: string) {
  if (value === "ALLOWED") return "Cho phép";
  if (value === "ON_REQUEST") return "Theo yêu cầu";
  return "Không cho phép";
}

function petPolicyValue(label: string) {
  if (label === "Cho phép") return "ALLOWED";
  if (label === "Theo yêu cầu") return "ON_REQUEST";
  return "NOT_ALLOWED";
}

function serviceParkingType(value: string) {
  const services = csvToList(value);
  if (services.includes("Chỗ đậu xe miễn phí")) return "FREE";
  if (services.includes("Chỗ đậu xe tính phí")) return "PAID";
  return "NOT_AVAILABLE";
}

function getPropertyMapUrl(address: string) {
  const query = encodeURIComponent(address || "Việt Nam");
  return `https://www.google.com/maps?q=${query}&output=embed`;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildCalendarDays(anchor: Date) {
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstWeekday);

  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

type HostVoucher = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  quantity: number;
  usedCount: number;
  expiresAt: string;
  voucherType: string;
  conditions: Array<"MIN_ORDER_500K" | "MIN_GUESTS_5">;
  status: "ACTIVE" | "FULL" | "EXPIRED" | "INACTIVE";
};

type VoucherDraft = {
  code: string;
  expiresAt: string;
  quantity: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: string;
  voucherType: string;
  customType: string;
  conditions: Array<"MIN_ORDER_500K" | "MIN_GUESTS_5">;
};

const voucherTypeOptions = ["Giảm giá Ngày lễ", "Khai trương", "Khách hàng thân thiết", "Khác"];
const voucherConditionOptions: Array<{ value: "MIN_ORDER_500K" | "MIN_GUESTS_5"; label: string }> = [
  { value: "MIN_ORDER_500K", label: "Giá trị hoá đơn từ 500.000đ trở lên" },
  { value: "MIN_GUESTS_5", label: "Đặt phòng từ 5 người trở lên" },
];

function generateVoucherCode() {
  const letters = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
  const digits = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join("");
  return `${letters}${digits}`;
}

function defaultVoucherDraft(): VoucherDraft {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return {
    code: generateVoucherCode(),
    expiresAt: expiresAt.toISOString().slice(0, 10),
    quantity: "100",
    discountType: "PERCENTAGE",
    discountValue: "10",
    voucherType: "Giảm giá Ngày lễ",
    customType: "",
    conditions: [],
  };
}

function voucherConditionLabel(value: "MIN_ORDER_500K" | "MIN_GUESTS_5") {
  return voucherConditionOptions.find((item) => item.value === value)?.label ?? value;
}

function voucherDiscountLabel(voucher: Pick<HostVoucher, "discountType" | "discountValue">) {
  return voucher.discountType === "PERCENTAGE" ? `${voucher.discountValue}%` : formatCurrency(voucher.discountValue);
}

function PromotionsTab({ property }: { property: HostProperty }) {
  const [vouchers, setVouchers] = useState<HostVoucher[]>([]);
  const [draft, setDraft] = useState<VoucherDraft>(() => defaultVoucherDraft());
  const [boxOpen, setBoxOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HostVoucher | null>(null);
  const [toast, setToast] = useState("");

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => current === message ? "" : current);
    }, 3200);
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    api.get(`/host/properties/${property.id}/vouchers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => setVouchers(response.data.data ?? []))
      .catch(() => showToast("Không thể tải danh sách voucher."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.id]);

  function updateDraft(field: keyof VoucherDraft, value: string | VoucherDraft["conditions"]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleCondition(condition: "MIN_ORDER_500K" | "MIN_GUESTS_5") {
    setDraft((current) => ({
      ...current,
      conditions: current.conditions.includes(condition)
        ? current.conditions.filter((item) => item !== condition)
        : [...current.conditions, condition],
    }));
  }

  async function createVoucher() {
    const token = getAccessToken();
    if (!token) {
      showToast("Vui lòng đăng nhập lại để tạo voucher.");
      return;
    }

    const voucherType = draft.voucherType === "Khác" ? draft.customType.trim() || "Khác" : draft.voucherType;
    try {
      const response = await api.post(
        `/host/properties/${property.id}/vouchers`,
        {
          code: draft.code,
          expiresAt: draft.expiresAt,
          quantity: Number(draft.quantity),
          discountType: draft.discountType,
          discountValue: Number(draft.discountValue),
          voucherType,
          conditions: draft.conditions,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVouchers((current) => [response.data.data, ...current]);
      setDraft(defaultVoucherDraft());
      setBoxOpen(false);
      showToast("Đã tạo voucher khuyến mãi.");
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      showToast(message ?? "Không thể tạo voucher.");
    }
  }

  async function deleteVoucher(voucher: HostVoucher) {
    const token = getAccessToken();
    if (!token) return;
    await api.delete(`/host/properties/${property.id}/vouchers/${voucher.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setVouchers((current) => current.filter((item) => item.id !== voucher.id));
    setDeleteTarget(null);
    showToast("Đã xoá voucher.");
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    showToast(`Đã sao chép mã ${code}.`);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Voucher khuyến mãi</h2>
          <p className="mt-1 text-sm text-slate-500">{property.title}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft(defaultVoucherDraft());
            setBoxOpen(true);
          }}
          className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-950"
        >
          Thêm voucher
        </button>
      </div>

      {boxOpen ? (
        <div className="mt-5 rounded-lg border border-emerald-900/15 bg-emerald-50/40 p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Mã voucher</span>
              <input
                value={draft.code}
                onChange={(event) => updateDraft("code", event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                className="mt-2 w-full rounded-md border border-emerald-900/20 bg-white px-3 py-2 text-sm font-semibold tracking-[0.16em] outline-none focus:border-emerald-800"
              />
            </label>
            <button type="button" onClick={() => updateDraft("code", generateVoucherCode())} className="self-end rounded-md border border-emerald-900/25 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-white">
              Xuất mã tự động
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Hết hạn voucher</span>
              <input type="date" value={draft.expiresAt} onChange={(event) => updateDraft("expiresAt", event.target.value)} className="mt-2 w-full rounded-md border border-emerald-900/20 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-800" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Số lượng</span>
              <div className="mt-2 grid grid-cols-[42px_1fr_42px] overflow-hidden rounded-md border border-emerald-900/20 bg-white">
                <button type="button" onClick={() => updateDraft("quantity", String(Math.max(1, Number(draft.quantity) - 10)))} className="border-r border-slate-200 font-semibold text-emerald-900">-</button>
                <input value={draft.quantity} onChange={(event) => updateDraft("quantity", event.target.value.replace(/\D/g, ""))} className="min-w-0 px-3 py-2 text-center text-sm outline-none" inputMode="numeric" />
                <button type="button" onClick={() => updateDraft("quantity", String((Number(draft.quantity) || 0) + 10))} className="border-l border-slate-200 font-semibold text-emerald-900">+</button>
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Giá trị giảm</span>
              <div className="mt-2 grid grid-cols-[1fr_110px] overflow-hidden rounded-md border border-emerald-900/20 bg-white">
                <input value={draft.discountType === "FIXED_AMOUNT" ? formatMoneyInput(draft.discountValue) : draft.discountValue} onChange={(event) => updateDraft("discountValue", draft.discountType === "FIXED_AMOUNT" ? parseMoneyInput(event.target.value) : event.target.value.replace(/\D/g, ""))} className="min-w-0 px-3 py-2 text-sm outline-none" inputMode="numeric" />
                <select value={draft.discountType} onChange={(event) => updateDraft("discountType", event.target.value as VoucherDraft["discountType"])} className="border-l border-slate-200 bg-white px-2 py-2 text-sm outline-none">
                  <option value="PERCENTAGE">%</option>
                  <option value="FIXED_AMOUNT">VND</option>
                </select>
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Loại voucher</span>
              <select value={draft.voucherType} onChange={(event) => updateDraft("voucherType", event.target.value)} className="mt-2 w-full rounded-md border border-emerald-900/20 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-800">
                {voucherTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>

          {draft.voucherType === "Khác" ? (
            <input value={draft.customType} onChange={(event) => updateDraft("customType", event.target.value)} placeholder="Nhập loại voucher" className="mt-4 w-full rounded-md border border-emerald-900/20 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-800" />
          ) : null}

          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700">Điều kiện</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {voucherConditionOptions.map((condition) => (
                <label key={condition.value} className="flex items-center gap-3 rounded-md border border-emerald-900/15 bg-white px-3 py-2 text-sm text-slate-800">
                  <input type="checkbox" checked={draft.conditions.includes(condition.value)} onChange={() => toggleCondition(condition.value)} className="h-4 w-4 accent-emerald-900" />
                  {condition.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={createVoucher} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-950">Lưu voucher</button>
            <button type="button" onClick={() => setBoxOpen(false)} className="rounded-md border border-emerald-900/20 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-white">Huỷ</button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {vouchers.length ? vouchers.map((voucher) => {
          const danger = voucher.status === "EXPIRED" || voucher.status === "FULL";
          return (
            <div key={voucher.id} className={`rounded-lg border p-4 ${danger ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-3 py-1 font-semibold tracking-[0.12em] ${danger ? "bg-rose-700 text-white" : "bg-emerald-900 text-white"}`}>{voucher.code}</span>
                    <button type="button" onClick={() => copyCode(voucher.code)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">Sao chép</button>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{voucher.voucherType} - giảm {voucherDiscountLabel(voucher)}</p>
                  <p className="mt-1 text-sm text-slate-600">Hết hạn: {voucher.expiresAt} · Số lượng: {voucher.usedCount}/{voucher.quantity}</p>
                  <p className="mt-1 text-sm text-slate-600">Điều kiện: {voucher.conditions.length ? voucher.conditions.map(voucherConditionLabel).join(", ") : "Không có"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => danger ? void deleteVoucher(voucher) : setDeleteTarget(voucher)}
                  className={`grid h-9 w-9 place-items-center rounded-md text-lg font-semibold ${danger ? "bg-rose-700 text-white hover:bg-rose-800" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                  aria-label={`Xoá voucher ${voucher.code}`}
                >
                  ×
                </button>
              </div>
            </div>
          );
        }) : (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Chưa có voucher khuyến mãi.</p>
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-950">Bạn có chắc xoá không?</h3>
            <p className="mt-2 text-sm text-slate-600">Voucher {deleteTarget.code} vẫn còn hiệu lực.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Huỷ</button>
              <button type="button" onClick={() => void deleteVoucher(deleteTarget)} className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800">Có</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <p role="status" className="fixed right-4 top-4 z-[70] max-w-sm rounded-lg border border-emerald-900/15 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 shadow-xl shadow-slate-900/15">
          {toast}
        </p>
      ) : null}
    </section>
  );
}

function HostNotice({ tone, title, children }: { tone: "warning" | "info" | "danger"; title: string; children: ReactNode }) {
  const toneClass = {
    warning: "border-amber-300 bg-amber-50 text-amber-950",
    info: "border-blue-300 bg-blue-50 text-blue-950",
    danger: "border-rose-300 bg-rose-50 text-rose-950",
  }[tone];

  return (
    <section className={`rounded-sm border p-5 ${toneClass}`}>
      <div className="flex gap-3">
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current text-xs font-semibold">!</span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-2 text-sm leading-6">{children}</p>
          <button className="mt-3 text-sm font-semibold text-blue-700">Tìm hiểu thêm</button>
        </div>
      </div>
    </section>
  );
}

function HostPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-sm border border-slate-200 bg-white">
      <div className="p-5">
        <h3 className="font-semibold text-slate-950">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function SetupTask({
  title,
  action,
  done,
  open,
  children,
}: {
  title: string;
  action: string;
  done: boolean;
  open?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-slate-500"}`}>
            {done ? "✓" : "○"}
          </span>
          <div>
            <p className="font-semibold text-slate-950">{title}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button className="rounded-sm border border-blue-600 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                {action}
              </button>
              <button className="text-sm font-medium text-blue-700">Nhắc tôi việc này</button>
            </div>
          </div>
        </div>
        <span className="text-slate-400">{open ? "⌃" : "⌄"}</span>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className={`mt-2 font-semibold ${tone === "success" ? "text-emerald-700" : "text-slate-950"}`}>{value}</p>
    </div>
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

function InboxTab({ propertyId }: { propertyId: string }) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations]
  );

  const unreadTotal = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);

  function mergeConversationList(items: ChatConversation[]) {
    setConversations((current) =>
      items.map((item) => {
        const existing = current.find((conversation) => conversation.id === item.id);
        return existing && existing.messages.length > item.messages.length
          ? { ...item, messages: existing.messages }
          : item;
      })
    );
    setActiveId((current) => current ?? items[0]?.id ?? null);
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadInbox() {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/conversations?propertyId=${propertyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok || cancelled) return;
      const payload = await response.json();
      const items = payload.data.items ?? [];
      mergeConversationList(items);
      if (!activeId && items[0]?.id) {
        loadConversation(items[0].id).catch(() => undefined);
      }
      setLoading(false);
    }

    loadInbox().catch(() => setLoading(false));
    const timer = window.setInterval(() => loadInbox().catch(() => undefined), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [activeConversation?.messages.length, activeId]);

  async function loadConversation(conversationId: string) {
    const token = getAccessToken();
    if (!token) return;

    setConversationLoading(true);
    setMenuOpen(false);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/conversations/${conversationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) return;
      const payload = await response.json();
      setConversations((current) => {
        const exists = current.some((conversation) => conversation.id === payload.data.id);
        const next = exists
          ? current.map((conversation) => conversation.id === payload.data.id ? { ...payload.data, unreadCount: 0 } : conversation)
          : [{ ...payload.data, unreadCount: 0 }, ...current];
        return next.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      });
      setActiveId(payload.data.id);
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/conversations/${payload.data.id}/read`,
        { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => undefined);
    } finally {
      setConversationLoading(false);
    }
  }

  async function selectConversation(conversationId: string) {
    setActiveId(conversationId);
    await loadConversation(conversationId);
  }

  function appendSentMessage(conversationId: string, sentMessage: ChatConversation["messages"][number]) {
    setConversations((current) => {
      const next = current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: [...conversation.messages, sentMessage],
              lastMessageAt: sentMessage.createdAt,
              lastMessagePreview: sentMessage.body ?? "Đã gửi một ảnh",
            }
          : conversation
      );
      return next.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    });
  }

  async function sendPayload(payloadBody: { body?: string; imageUrl?: string }) {
    const token = getAccessToken();
    if (!token || !activeConversation) return;

    setSending(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/conversations/${activeConversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payloadBody),
        }
      );
      if (!response.ok) return;
      const payload = await response.json();
      appendSentMessage(activeConversation.id, payload.data);
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    await sendPayload({ body: message });
  }

  function sendImage(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        sendPayload({ imageUrl: reader.result }).catch(() => undefined);
      }
    };
    reader.readAsDataURL(file);
  }

  async function hideConversation() {
    const token = getAccessToken();
    if (!token || !activeConversation) return;

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/conversations/${activeConversation.id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    ).catch(() => undefined);
    setConversations((current) => {
      const next = current.filter((conversation) => conversation.id !== activeConversation.id);
      setActiveId(next[0]?.id ?? null);
      return next;
    });
    setMenuOpen(false);
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Hộp thư</h2>
          <p className="mt-1 text-sm text-slate-500">Quản lý tin nhắn của khách ngay trong chỗ lưu trú này.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-md bg-teal-50 px-3 py-2 font-semibold text-teal-800">TripNest Messenger</span>
          {unreadTotal > 0 ? (
            <span className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">{unreadTotal}</span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="px-5 py-8 text-sm text-slate-500">Đang tải hộp thư...</p>
      ) : conversations.length ? (
        <div className="grid h-[720px] min-h-0 bg-white lg:grid-cols-[320px_minmax(0,1fr)_280px]">
          <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-50">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 p-4">
              <input
                type="search"
                placeholder="Tìm theo tên khách"
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => selectConversation(conversation.id)}
                className={`flex w-full gap-3 border-b border-slate-200 px-4 py-4 text-left transition ${
                  conversation.id === activeId ? "bg-white shadow-[inset_3px_0_0_#0f766e]" : "hover:bg-white"
                }`}
              >
                <HostInboxAvatar src={conversation.peerAvatar} label={conversation.guestName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold text-slate-950">{conversation.guestName}</p>
                    <span className="shrink-0 text-xs text-slate-400">{formatInboxTime(conversation.lastMessageAt)}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {conversation.lastMessagePreview ?? "Chưa có tin nhắn"}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">{conversation.propertyTitle}</p>
                </div>
                {conversation.unreadCount > 0 ? (
                  <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-rose-600 px-1 text-xs font-bold text-white">
                    {conversation.unreadCount}
                  </span>
                ) : null}
              </button>
            ))}
          </aside>

          <div className="flex min-w-0 flex-col border-r border-slate-200">
            {activeConversation ? (
              <>
                <div className="relative flex h-20 shrink-0 items-center justify-between border-b border-slate-200 px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <HostInboxAvatar src={activeConversation.peerAvatar} label={activeConversation.guestName} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{activeConversation.guestName}</p>
                      <p className="truncate text-sm text-slate-500">{activeConversation.propertyTitle}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((value) => !value)}
                    className="grid h-10 w-10 place-items-center rounded-md text-xl text-slate-500 transition hover:bg-slate-100"
                    aria-label="Tùy chọn cuộc trò chuyện"
                  >
                    ...
                  </button>
                  {menuOpen ? (
                    <div className="absolute right-5 top-16 z-20 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm shadow-xl">
                      <button type="button" className="block w-full px-4 py-3 text-left text-slate-600 hover:bg-slate-50">Báo cáo</button>
                      <button type="button" onClick={hideConversation} className="block w-full px-4 py-3 text-left text-rose-600 hover:bg-rose-50">Xóa cuộc trò chuyện</button>
                    </div>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-5">
                  {conversationLoading ? <p className="mb-4 text-center text-sm text-slate-400">Đang tải tin nhắn...</p> : null}
                  <div className="space-y-3">
                    {activeConversation.messages.map((item) => (
                      <div key={item.id} className={`flex items-end gap-2 ${item.mine ? "justify-end" : "justify-start"}`}>
                        {!item.mine ? <HostInboxAvatar src={activeConversation.peerAvatar} label={item.senderName} size="sm" /> : null}
                        <div className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.mine ? "bg-teal-700 text-white" : "bg-slate-200 text-slate-950"}`}>
                          {item.body ? <p className="whitespace-pre-line">{item.body}</p> : null}
                          {item.imageUrl ? <img src={item.imageUrl} alt="" className="mt-2 max-h-72 rounded-lg object-cover" /> : null}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <form onSubmit={sendMessage} className="flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-5 py-4">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-xl font-semibold text-teal-800 transition hover:bg-teal-50"
                    aria-label="Gửi ảnh"
                  >
                    +
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      sendImage(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                  <input
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="h-12 min-w-0 flex-1 rounded-full bg-slate-100 px-5 text-sm outline-none focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="grid h-12 w-12 place-items-center rounded-full bg-teal-700 text-lg font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Gửi tin nhắn"
                  >
                    ➤
                  </button>
                </form>
              </>
            ) : (
              <div className="grid flex-1 place-items-center px-8 text-center text-sm text-slate-500">
                Chọn một cuộc trò chuyện để xem nội dung tin nhắn.
              </div>
            )}
          </div>

          <aside className="hidden min-h-0 overflow-y-auto bg-white lg:block">
            {activeConversation ? (
              <div>
                <div className="border-b border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <HostInboxAvatar src={activeConversation.peerAvatar} label={activeConversation.guestName} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{activeConversation.guestName}</p>
                      <p className="truncate text-sm text-teal-700">Khách hàng</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-5 p-5 text-sm">
                  <div>
                    <p className="font-semibold text-slate-950">Chỗ lưu trú</p>
                    <p className="mt-2 leading-6 text-slate-600">{activeConversation.propertyTitle}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">Hoạt động</p>
                    <p className="mt-2 leading-6 text-slate-600">Tin nhắn mới nhất: {formatInboxDate(activeConversation.lastMessageAt)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">Nhãn</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">TripNest</span>
                      {activeConversation.unreadCount > 0 ? (
                        <span className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Chưa đọc</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : (
        <p className="px-5 py-10 text-center text-sm leading-6 text-slate-500">
          Chưa có bất kỳ cuộc trò chuyện nào cho chỗ lưu trú này.
        </p>
      )}
    </section>
  );
}

function HostInboxAvatar({ src, label, size = "md" }: { src: string | null; label: string; size?: "sm" | "md" | "lg" }) {
  const className = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-teal-700 text-sm font-bold text-white ${className}`}>
      {src ? <Image src={src} alt={label} fill unoptimized sizes="56px" className="object-cover" /> : label.slice(0, 1).toUpperCase()}
    </span>
  );
}

function formatInboxTime(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatInboxDate(value: string) {
  return new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
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
