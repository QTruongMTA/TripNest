"use client";

import { useRef, useState } from "react";

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
  { value: "HOUSE", label: "Nhà" },
  { value: "APARTMENT", label: "Căn hộ" },
  { value: "VILLA", label: "Villa" },
  { value: "HOMESTAY", label: "Homestay" },
  { value: "HOTEL", label: "Khách sạn" },
  { value: "RESORT", label: "Resort" },
];

const amenities = [
  "WiFi miễn phí",
  "Hồ bơi",
  "Điều hòa nhiệt độ",
  "Bãi đỗ xe",
  "Bếp đầy đủ tiện nghi",
  "Máy giặt",
  "Smart TV",
  "Ban công view đẹp",
  "Phòng tập gym",
  "Lò sưởi",
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
      className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5"
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
        <div className="grid gap-3">
          <PriceStepper name="minPrice" label="Từ" value={values.minPrice} />
          <PriceStepper name="maxPrice" label="Đến" value={values.maxPrice} />
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

function formatPrice(value: number | null) {
  return value === null ? "" : value.toLocaleString("vi-VN");
}

function parsePrice(value?: string) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function PriceStepper({ name, label, value }: { name: "minPrice" | "maxPrice"; label: string; value?: string }) {
  const initial = parsePrice(value);
  const [amount, setAmount] = useState<number | null>(initial);

  function submitFromElement(element: HTMLElement) {
    window.setTimeout(() => element.closest("form")?.requestSubmit(), 0);
  }

  function adjust(delta: number, element: HTMLElement) {
    setAmount((current) => Math.max(0, (current ?? 0) + delta));
    submitFromElement(element);
  }

  return (
    <label className="grid gap-1 text-sm text-slate-600">
      <span>{label}</span>
      <input type="hidden" name={name} value={amount ?? ""} />
      <div className="grid grid-cols-[36px_1fr_36px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={(event) => adjust(-100000, event.currentTarget)}
          className="grid min-h-10 place-items-center border-r border-slate-200 text-lg font-semibold text-slate-600 transition hover:bg-slate-50"
          aria-label={`Giảm ${label.toLowerCase()} 100.000 đồng`}
        >
          -
        </button>
        <input
          value={formatPrice(amount)}
          onChange={(event) => {
            event.stopPropagation();
            setAmount(parsePrice(event.target.value));
          }}
          onBlur={(event) => submitFromElement(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitFromElement(event.currentTarget);
            }
          }}
          inputMode="numeric"
          placeholder="0"
          className="min-w-0 px-3 py-2 text-center text-sm font-semibold text-slate-900 outline-none"
        />
        <button
          type="button"
          onClick={(event) => adjust(100000, event.currentTarget)}
          className="grid min-h-10 place-items-center border-l border-slate-200 text-lg font-semibold text-teal-800 transition hover:bg-teal-50"
          aria-label={`Tăng ${label.toLowerCase()} 100.000 đồng`}
        >
          +
        </button>
      </div>
    </label>
  );
}
