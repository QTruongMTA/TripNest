"use client";

import Link from "next/link";
import { useState } from "react";
import type { PropertyListItem } from "@/types/property";
import { PropertyCard } from "./PropertyCard";

export function PropertyResultsClient({
  properties,
  nights,
}: {
  properties: PropertyListItem[];
  nights: number | null;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-slate-500">
        Không tìm thấy chỗ ở phù hợp với bộ lọc hiện tại.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        {properties.map((property) => (
          <div key={property.id} className="relative">
            <label className="absolute right-3 top-3 z-20 flex cursor-pointer items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold shadow">
              <input
                type="checkbox"
                checked={selected.includes(property.id)}
                onChange={() => toggle(property.id)}
                disabled={!selected.includes(property.id) && selected.length >= 3}
              />
              So sánh
            </label>
            <PropertyCard property={property} nights={nights} />
          </div>
        ))}
      </div>

      {selected.length > 0 ? (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full bg-slate-950 px-5 py-3 text-white shadow-2xl">
          <span className="text-sm">{selected.length}/3 cơ sở đã chọn</span>
          <Link
            href={selected.length >= 2 ? `/compare?ids=${selected.join(",")}` : "#"}
            aria-disabled={selected.length < 2}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              selected.length >= 2 ? "bg-amber-300 text-slate-950" : "cursor-not-allowed bg-white/20 text-white/60"
            }`}
          >
            So sánh ngay
          </Link>
          <button type="button" onClick={() => setSelected([])} className="text-sm text-white/70">Xóa</button>
        </div>
      ) : null}
    </>
  );
}
