"use client";

import { useRef } from "react";

type SearchValues = {
  city?: string;
  cities?: string;
  type?: string;
  minPrice?: string;
  maxPrice?: string;
  guests?: string;
  bedrooms?: string;
  bathrooms?: string;
  amenities?: string;
  cancellationPolicy?: string;
  checkIn?: string;
  checkOut?: string;
};

const propertyTypes = [
  { value: "HOTEL", label: "Khách sạn" },
  { value: "APARTMENT", label: "Căn hộ" },
  { value: "RESORT", label: "Resort" },
  { value: "VILLA", label: "Biệt thự" },
];

const amenities = [
  "WiFi miễn phí",
  "Hồ bơi",
  "Điều hòa nhiệt độ",
  "Hệ thống sưởi",
  "Bếp",
  "Bếp nhỏ",
  "Máy giặt",
  "TV màn hình phẳng",
  "Ban công",
  "Sân thượng / hiên",
];

const cancellationPolicies = [
  { value: "FLEXIBLE", label: "Hủy linh hoạt" },
  { value: "MODERATE", label: "Hủy vừa phải" },
  { value: "STRICT", label: "Hủy nghiêm ngặt" },
  { value: "NON_REFUNDABLE", label: "Không hoàn tiền" },
];

export function PropertyFilters({ values }: { values: SearchValues }) {
  const formRef = useRef<HTMLFormElement>(null);
  const selectedAmenities = new Set(values.amenities?.split(",").filter(Boolean) ?? []);
  const submitOnChange = () => formRef.current?.requestSubmit();

  return (
    <form
      ref={formRef}
      action="/properties"
      onChange={submitOnChange}
      className="space-y-5 self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Bộ lọc</p>
      </div>

      {Object.entries(values).map(([key, value]) =>
        ![
          "type",
          "amenities",
          "minPrice",
          "maxPrice",
          "guests",
          "bedrooms",
          "bathrooms",
          "cancellationPolicy",
        ].includes(key) && value ? (
          <input key={key} type="hidden" name={key} value={value} />
        ) : null
      )}

      <section className="space-y-3 border-t border-slate-100 pt-4">
        <h3 className="font-semibold text-slate-900">Loại chỗ ở</h3>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="radio" name="type" value="" defaultChecked={!values.type} /> Tất cả
        </label>
        {propertyTypes.map((item) => (
          <label key={item.value} className="flex items-center gap-3 text-sm text-slate-700">
            <input type="radio" name="type" value={item.value} defaultChecked={values.type === item.value} /> {item.label}
          </label>
        ))}
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-4">
        <h3 className="font-semibold text-slate-900">Ngân sách mỗi đêm</h3>
        <div className="grid grid-cols-2 gap-2">
          <input name="minPrice" type="number" min="0" defaultValue={values.minPrice} placeholder="Từ" className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="maxPrice" type="number" min="0" defaultValue={values.maxPrice} placeholder="Đến" className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-4">
        <h3 className="font-semibold text-slate-900">Sức chứa</h3>
        <div className="grid grid-cols-3 gap-2">
          <label className="grid gap-1 text-sm text-slate-600">
            <span>Khách</span>
            <input name="guests" type="number" min="1" defaultValue={values.guests} placeholder="2" className="rounded-2xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span>Ngủ</span>
            <input name="bedrooms" type="number" min="1" defaultValue={values.bedrooms} placeholder="1" className="rounded-2xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span>Tắm</span>
            <input name="bathrooms" type="number" min="1" defaultValue={values.bathrooms} placeholder="1" className="rounded-2xl border border-slate-200 px-3 py-2" />
          </label>
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-4">
        <h3 className="font-semibold text-slate-900">Tiện nghi</h3>
        {amenities.map((amenity) => (
          <label key={amenity} className="flex items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" name="amenities" value={amenity} defaultChecked={selectedAmenities.has(amenity)} /> {amenity}
          </label>
        ))}
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-4">
        <h3 className="font-semibold text-slate-900">Chính sách hủy</h3>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="radio" name="cancellationPolicy" value="" defaultChecked={!values.cancellationPolicy} /> Tất cả
        </label>
        {cancellationPolicies.map((item) => (
          <label key={item.value} className="flex items-center gap-3 text-sm text-slate-700">
            <input type="radio" name="cancellationPolicy" value={item.value} defaultChecked={values.cancellationPolicy === item.value} /> {item.label}
          </label>
        ))}
      </section>

      <div className="border-t border-slate-100 pt-4">
        <a href="/properties" className="block rounded-full border border-slate-200 px-4 py-2 text-center font-medium text-slate-700 transition hover:bg-slate-50">Xóa bộ lọc</a>
      </div>
    </form>
  );
}
