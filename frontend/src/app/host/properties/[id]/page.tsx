"use client";

import { AvailabilityCalendar } from "@/components/host/AvailabilityCalendar";
import { getAccessToken, getStoredUser } from "@/lib/auth";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

type PropertyAmenity = { id: string; name: string; icon: string | null };
type PropertyImage = { id: string; url: string; isPrimary: boolean };

type HostProperty = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string | null;
  country: string;
  pricePerNight: number;
  cleaningFee: number | null;
  maxGuests: number;
  bedroomCount: number;
  bathrooms: number;
  bookingMethod: string;
  cancellationPolicy: string;
  cancellationFreeDays: number;
  smokingAllowed: boolean;
  partiesAllowed: boolean;
  petsPolicy: string;
  checkInFrom: string | null;
  checkInTo: string | null;
  checkOutFrom: string | null;
  checkOutTo: string | null;
  availabilityWindow: number;
  amenities: PropertyAmenity[];
  languages: string[];
  images: PropertyImage[];
  updatedAt: string;
};

const TABS = ["info", "photos", "pricing", "policies", "availability"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  info: "Thông tin",
  photos: "Ảnh",
  pricing: "Giá",
  policies: "Chính sách",
  availability: "Lịch",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-slate-100 text-slate-500",
  PENDING: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Tạm ẩn",
  PENDING: "Chờ duyệt",
};

const PROPERTY_TYPES = [
  { value: "APARTMENT", label: "Căn hộ" },
  { value: "HOUSE", label: "Nhà riêng" },
  { value: "VILLA", label: "Biệt thự" },
  { value: "CABIN", label: "Cabin / Nhà gỗ" },
  { value: "HOTEL", label: "Khách sạn" },
  { value: "HOSTEL", label: "Hostel" },
  { value: "RESORT", label: "Resort" },
  { value: "BUNGALOW", label: "Bungalow" },
  { value: "TREEHOUSE", label: "Nhà trên cây" },
  { value: "HOUSEBOAT", label: "Nhà thuyền" },
  { value: "UNIQUE", label: "Độc đáo" },
];

const CANCELLATION_POLICIES = [
  { value: "FLEXIBLE", label: "Linh hoạt" },
  { value: "MODERATE", label: "Trung bình" },
  { value: "STRICT", label: "Nghiêm ngặt" },
  { value: "NON_REFUNDABLE", label: "Không hoàn tiền" },
];

const PET_POLICIES = [
  { value: "NOT_ALLOWED", label: "Không cho phép" },
  { value: "ALLOWED", label: "Cho phép" },
  { value: "ALLOWED_SMALL_ONLY", label: "Chỉ thú nhỏ" },
];

export default function ManagePropertyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = params.id as string;

  const initialTab = (TABS as readonly string[]).includes(searchParams.get("tab") ?? "")
    ? (searchParams.get("tab") as Tab)
    : "info";

  const [token, setToken] = useState<string | null>(null);
  const [property, setProperty] = useState<HostProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Info tab state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [maxGuests, setMaxGuests] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [amenitiesText, setAmenitiesText] = useState("");

  // Pricing tab state
  const [pricePerNight, setPricePerNight] = useState(0);
  const [cleaningFee, setCleaningFee] = useState<string>("");

  // Policies tab state
  const [bookingMethod, setBookingMethod] = useState("INSTANT");
  const [cancellationPolicy, setCancellationPolicy] = useState("FLEXIBLE");
  const [cancellationFreeDays, setCancellationFreeDays] = useState(1);
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [partiesAllowed, setPartiesAllowed] = useState(false);
  const [petsPolicy, setPetsPolicy] = useState("NOT_ALLOWED");
  const [checkInFrom, setCheckInFrom] = useState("");
  const [checkInTo, setCheckInTo] = useState("");
  const [checkOutFrom, setCheckOutFrom] = useState("");
  const [checkOutTo, setCheckOutTo] = useState("");
  const [availabilityWindow, setAvailabilityWindow] = useState(365);

  // Photos state
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;

  useEffect(() => {
    const accessToken = getAccessToken();
    const user = getStoredUser();

    if (!accessToken) {
      router.push(`/login?next=/host/properties/${propertyId}`);
      return;
    }
    if (user && user.role !== "HOST" && user.role !== "ADMIN") {
      router.push("/");
      return;
    }

    setToken(accessToken);
    loadProperty(accessToken);
  }, [propertyId, router]);

  async function loadProperty(accessToken: string) {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_BASE}/host/properties/${propertyId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message ?? "Không tải được dữ liệu");

      const p: HostProperty = payload.data;
      setProperty(p);
      setTitle(p.title);
      setDescription(p.description ?? "");
      setPropertyType(p.type);
      setAddressLine1(p.addressLine1);
      setAddressLine2(p.addressLine2 ?? "");
      setCity(p.city);
      setCountry(p.country);
      setMaxGuests(p.maxGuests);
      setBathrooms(p.bathrooms);
      setAmenitiesText(p.amenities.map((a) => a.name).join(", "));
      setPricePerNight(p.pricePerNight);
      setCleaningFee(p.cleaningFee != null ? String(p.cleaningFee) : "");
      setBookingMethod(p.bookingMethod);
      setCancellationPolicy(p.cancellationPolicy);
      setCancellationFreeDays(p.cancellationFreeDays);
      setSmokingAllowed(p.smokingAllowed);
      setPartiesAllowed(p.partiesAllowed);
      setPetsPolicy(p.petsPolicy);
      setCheckInFrom(p.checkInFrom ?? "");
      setCheckInTo(p.checkInTo ?? "");
      setCheckOutFrom(p.checkOutFrom ?? "");
      setCheckOutTo(p.checkOutTo ?? "");
      setAvailabilityWindow(p.availabilityWindow);
      setImages(p.images);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }

  function flashSuccess() {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  async function saveInfo() {
    if (!token) return;
    setSaving(true);
    setSaveError(null);
    const amenities = amenitiesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch(`${API_BASE}/host/properties/${propertyId}/info`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description: description || null, type: propertyType,
          addressLine1, addressLine2: addressLine2 || null,
          city, country, maxGuests, bathrooms, amenities,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message ?? "Lưu thất bại");
      setProperty((prev) => prev ? { ...prev, title, description: description || null, type: propertyType } : prev);
      flashSuccess();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  }

  async function savePricing() {
    if (!token) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API_BASE}/host/properties/${propertyId}/pricing`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          pricePerNight,
          cleaningFee: cleaningFee !== "" ? parseFloat(cleaningFee) : null,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message ?? "Lưu thất bại");
      setProperty((prev) => prev ? { ...prev, pricePerNight, cleaningFee: cleaningFee !== "" ? parseFloat(cleaningFee) : null } : prev);
      flashSuccess();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  }

  async function savePolicies() {
    if (!token) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API_BASE}/host/properties/${propertyId}/policies`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingMethod, cancellationPolicy, cancellationFreeDays,
          smokingAllowed, partiesAllowed, petsPolicy,
          checkInFrom: checkInFrom || null, checkInTo: checkInTo || null,
          checkOutFrom: checkOutFrom || null, checkOutTo: checkOutTo || null,
          availabilityWindow,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message ?? "Lưu thất bại");
      flashSuccess();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!token || !property) return;
    if (property.status !== "ACTIVE" && property.status !== "INACTIVE") return;
    setToggling(true);
    try {
      const res = await fetch(`${API_BASE}/host/properties/${propertyId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message ?? "Thao tác thất bại");
      setProperty((prev) => prev ? { ...prev, status: payload.data.status } : prev);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Lỗi kết nối");
    } finally {
      setToggling(false);
    }
  }

  // ── Photos ─────────────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!token || !e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);
    setSaveError(null);
    try {
      for (const file of Array.from(e.target.files)) {
        const imageData = await fileToDataUrl(file);
        const isPrimary = images.length === 0;
        const res = await fetch(`${API_BASE}/host/properties/${propertyId}/images`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ imageData, isPrimary }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error?.message ?? "Upload thất bại");
        const newImg: PropertyImage = payload.data;
        if (isPrimary) {
          setImages([newImg]);
        } else {
          setImages((prev) => [...prev, newImg]);
        }
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Upload thất bại");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteImage(imageId: string) {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/host/properties/${propertyId}/images/${imageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const p = await res.json(); throw new Error(p.error?.message); }
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Xóa ảnh thất bại");
    }
  }

  async function setPrimary(imageId: string) {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/host/properties/${propertyId}/images/${imageId}/primary`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const p = await res.json(); throw new Error(p.error?.message); }
      setImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.id === imageId })));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Thao tác thất bại");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-700" />
      </div>
    );
  }

  if (fetchError || !property) {
    return (
      <div className="rounded-2xl bg-rose-50 p-6 text-rose-700">
        {fetchError ?? "Không tìm thấy chỗ ở"}
        <div className="mt-4">
          <a href="/host/properties" className="text-sm underline">← Quay lại danh sách</a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <a href="/host/properties" className="text-sm text-slate-400 transition hover:text-slate-600">← Danh sách chỗ ở</a>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{property.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{property.city} · {property.country}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[property.status] ?? "bg-slate-100 text-slate-500"}`}>
            {STATUS_LABELS[property.status] ?? property.status}
          </span>
          {(property.status === "ACTIVE" || property.status === "INACTIVE") && (
            <button
              type="button"
              onClick={toggleStatus}
              disabled={toggling}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {toggling ? "..." : property.status === "ACTIVE" ? "Tạm ẩn" : "Kích hoạt lại"}
            </button>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1 rounded-2xl border border-slate-200 bg-white p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setActiveTab(tab); setSaveError(null); setSaveSuccess(false); }}
              className={`rounded-xl px-5 py-2.5 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-teal-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Save feedback */}
      {saveError && (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{saveError}</div>
      )}
      {saveSuccess && (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Đã lưu thành công.</div>
      )}

      {/* Tab content */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeTab === "info" && (
          <TabInfo
            title={title} setTitle={setTitle}
            description={description} setDescription={setDescription}
            propertyType={propertyType} setPropertyType={setPropertyType}
            addressLine1={addressLine1} setAddressLine1={setAddressLine1}
            addressLine2={addressLine2} setAddressLine2={setAddressLine2}
            city={city} setCity={setCity}
            country={country} setCountry={setCountry}
            maxGuests={maxGuests} setMaxGuests={setMaxGuests}
            bathrooms={bathrooms} setBathrooms={setBathrooms}
            amenitiesText={amenitiesText} setAmenitiesText={setAmenitiesText}
            onSave={saveInfo} saving={saving}
          />
        )}

        {activeTab === "photos" && (
          <TabPhotos
            images={images}
            uploading={uploadingImage}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
            onDelete={deleteImage}
            onSetPrimary={setPrimary}
          />
        )}

        {activeTab === "pricing" && (
          <TabPricing
            pricePerNight={pricePerNight} setPricePerNight={setPricePerNight}
            cleaningFee={cleaningFee} setCleaningFee={setCleaningFee}
            onSave={savePricing} saving={saving}
          />
        )}

        {activeTab === "policies" && (
          <TabPolicies
            bookingMethod={bookingMethod} setBookingMethod={setBookingMethod}
            cancellationPolicy={cancellationPolicy} setCancellationPolicy={setCancellationPolicy}
            cancellationFreeDays={cancellationFreeDays} setCancellationFreeDays={setCancellationFreeDays}
            smokingAllowed={smokingAllowed} setSmokingAllowed={setSmokingAllowed}
            partiesAllowed={partiesAllowed} setPartiesAllowed={setPartiesAllowed}
            petsPolicy={petsPolicy} setPetsPolicy={setPetsPolicy}
            checkInFrom={checkInFrom} setCheckInFrom={setCheckInFrom}
            checkInTo={checkInTo} setCheckInTo={setCheckInTo}
            checkOutFrom={checkOutFrom} setCheckOutFrom={setCheckOutFrom}
            checkOutTo={checkOutTo} setCheckOutTo={setCheckOutTo}
            availabilityWindow={availabilityWindow} setAvailabilityWindow={setAvailabilityWindow}
            onSave={savePolicies} saving={saving}
          />
        )}

        {activeTab === "availability" && token && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Lịch khả dụng</h2>
              <p className="mt-1 text-sm text-slate-500">
                Nhấn vào ngày để chọn, sau đó xác nhận chặn hoặc bỏ chặn.
              </p>
            </div>
            <AvailabilityCalendar propertyId={propertyId} token={token} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab components ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100";
const selectClass = `${inputClass} bg-white`;

function SaveButton({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="rounded-full bg-teal-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-50"
    >
      {saving ? "Đang lưu..." : "Lưu thay đổi"}
    </button>
  );
}

function TabInfo({
  title, setTitle, description, setDescription,
  propertyType, setPropertyType,
  addressLine1, setAddressLine1, addressLine2, setAddressLine2,
  city, setCity, country, setCountry,
  maxGuests, setMaxGuests, bathrooms, setBathrooms,
  amenitiesText, setAmenitiesText,
  onSave, saving,
}: {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  propertyType: string; setPropertyType: (v: string) => void;
  addressLine1: string; setAddressLine1: (v: string) => void;
  addressLine2: string; setAddressLine2: (v: string) => void;
  city: string; setCity: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  maxGuests: number; setMaxGuests: (v: number) => void;
  bathrooms: number; setBathrooms: (v: number) => void;
  amenitiesText: string; setAmenitiesText: (v: string) => void;
  onSave: () => void; saving: boolean;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-800">Thông tin cơ bản</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Tên chỗ ở">
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Mô tả">
            <textarea className={`${inputClass} min-h-[120px] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <Field label="Loại hình">
          <select className={selectClass} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
            {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Địa chỉ">
          <input className={inputClass} value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Số nhà, tên đường" />
        </Field>
        <Field label="Địa chỉ (dòng 2, tuỳ chọn)">
          <input className={inputClass} value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Khu, tòa nhà…" />
        </Field>
        <Field label="Thành phố">
          <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="Quốc gia">
          <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} />
        </Field>
        <Field label="Số khách tối đa">
          <input className={inputClass} type="number" min={1} max={100} value={maxGuests} onChange={(e) => setMaxGuests(Number(e.target.value))} />
        </Field>
        <Field label="Số phòng tắm">
          <input className={inputClass} type="number" min={1} max={50} value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value))} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Tiện nghi (phân cách bằng dấu phẩy)">
            <input className={inputClass} value={amenitiesText} onChange={(e) => setAmenitiesText(e.target.value)} placeholder="WiFi miễn phí, Hồ bơi, Điều hòa nhiệt độ…" />
          </Field>
        </div>
      </div>
      <div className="pt-2">
        <SaveButton onSave={onSave} saving={saving} />
      </div>
    </div>
  );
}

function TabPhotos({
  images, uploading, fileInputRef, onFileChange, onDelete, onSetPrimary,
}: {
  images: PropertyImage[];
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Ảnh chỗ ở</h2>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-full bg-teal-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-50"
        >
          {uploading ? "Đang upload..." : "+ Thêm ảnh"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {images.length === 0 && !uploading && (
        <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-slate-400">
          Chưa có ảnh nào. Nhấn &quot;Thêm ảnh&quot; để tải ảnh lên.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img) => (
          <div key={img.id} className="group relative overflow-hidden rounded-2xl border border-slate-200">
            <div className="relative aspect-[4/3]">
              <Image src={img.url} alt="Ảnh chỗ ở" fill unoptimized sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
            </div>
            {img.isPrimary && (
              <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-900">Ảnh chính</span>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100">
              {!img.isPrimary && (
                <button
                  type="button"
                  onClick={() => onSetPrimary(img.id)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow"
                >
                  Đặt làm chính
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(img.id)}
                className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabPricing({
  pricePerNight, setPricePerNight, cleaningFee, setCleaningFee, onSave, saving,
}: {
  pricePerNight: number; setPricePerNight: (v: number) => void;
  cleaningFee: string; setCleaningFee: (v: string) => void;
  onSave: () => void; saving: boolean;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-800">Giá thuê</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Giá mỗi đêm (₫)">
          <input className={inputClass} type="number" min={0} value={pricePerNight} onChange={(e) => setPricePerNight(Number(e.target.value))} />
        </Field>
        <Field label="Phí dọn phòng (₫, để trống nếu không có)">
          <input className={inputClass} type="number" min={0} value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)} placeholder="0" />
        </Field>
      </div>
      <div className="pt-2">
        <SaveButton onSave={onSave} saving={saving} />
      </div>
    </div>
  );
}

function TabPolicies({
  bookingMethod, setBookingMethod,
  cancellationPolicy, setCancellationPolicy,
  cancellationFreeDays, setCancellationFreeDays,
  smokingAllowed, setSmokingAllowed,
  partiesAllowed, setPartiesAllowed,
  petsPolicy, setPetsPolicy,
  checkInFrom, setCheckInFrom, checkInTo, setCheckInTo,
  checkOutFrom, setCheckOutFrom, checkOutTo, setCheckOutTo,
  availabilityWindow, setAvailabilityWindow,
  onSave, saving,
}: {
  bookingMethod: string; setBookingMethod: (v: string) => void;
  cancellationPolicy: string; setCancellationPolicy: (v: string) => void;
  cancellationFreeDays: number; setCancellationFreeDays: (v: number) => void;
  smokingAllowed: boolean; setSmokingAllowed: (v: boolean) => void;
  partiesAllowed: boolean; setPartiesAllowed: (v: boolean) => void;
  petsPolicy: string; setPetsPolicy: (v: string) => void;
  checkInFrom: string; setCheckInFrom: (v: string) => void;
  checkInTo: string; setCheckInTo: (v: string) => void;
  checkOutFrom: string; setCheckOutFrom: (v: string) => void;
  checkOutTo: string; setCheckOutTo: (v: string) => void;
  availabilityWindow: number; setAvailabilityWindow: (v: number) => void;
  onSave: () => void; saving: boolean;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">Chính sách</h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phương thức đặt phòng">
          <select className={selectClass} value={bookingMethod} onChange={(e) => setBookingMethod(e.target.value)}>
            <option value="INSTANT">Đặt ngay (INSTANT)</option>
            <option value="REQUEST">Yêu cầu xác nhận (REQUEST)</option>
          </select>
        </Field>
        <Field label="Chính sách hủy">
          <select className={selectClass} value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)}>
            {CANCELLATION_POLICIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Số ngày hủy miễn phí">
          <input className={inputClass} type="number" min={0} max={365} value={cancellationFreeDays} onChange={(e) => setCancellationFreeDays(Number(e.target.value))} />
        </Field>
        <Field label="Chính sách thú cưng">
          <select className={selectClass} value={petsPolicy} onChange={(e) => setPetsPolicy(e.target.value)}>
            {PET_POLICIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Giờ nhận phòng (từ)">
          <input className={inputClass} type="time" value={checkInFrom} onChange={(e) => setCheckInFrom(e.target.value)} />
        </Field>
        <Field label="Giờ nhận phòng (đến)">
          <input className={inputClass} type="time" value={checkInTo} onChange={(e) => setCheckInTo(e.target.value)} />
        </Field>
        <Field label="Giờ trả phòng (từ)">
          <input className={inputClass} type="time" value={checkOutFrom} onChange={(e) => setCheckOutFrom(e.target.value)} />
        </Field>
        <Field label="Giờ trả phòng (đến)">
          <input className={inputClass} type="time" value={checkOutTo} onChange={(e) => setCheckOutTo(e.target.value)} />
        </Field>
        <Field label="Cửa sổ đặt phòng (ngày, tối đa)">
          <input className={inputClass} type="number" min={1} max={730} value={availabilityWindow} onChange={(e) => setAvailabilityWindow(Number(e.target.value))} />
        </Field>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-700">Nội quy nhà</h3>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={smokingAllowed} onChange={(e) => setSmokingAllowed(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-700" />
          <span className="text-sm text-slate-700">Cho phép hút thuốc</span>
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={partiesAllowed} onChange={(e) => setPartiesAllowed(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-700" />
          <span className="text-sm text-slate-700">Cho phép tiệc / sự kiện</span>
        </label>
      </div>

      <div className="pt-2">
        <SaveButton onSave={onSave} saving={saving} />
      </div>
    </div>
  );
}

// ── Util ────────────────────────────────────────────────────────────────────────

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
