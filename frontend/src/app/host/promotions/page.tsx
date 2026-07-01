"use client";

import { getAccessToken, getStoredUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

type PropertyOption = { id: string; title: string; city: string; status: string };

type Promotion = {
  id: string;
  code: string;
  propertyId: string | null;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minOrderValue: number | null;
  maxUses: number | null;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  effectiveStatus: "ACTIVE" | "SCHEDULED" | "PAUSED" | "ENDED" | "EXHAUSTED";
  property: { id: string; title: string; city: string } | null;
};

const STATUS_CONFIG: Record<Promotion["effectiveStatus"], { label: string; className: string }> = {
  ACTIVE: { label: "Äang cháº¡y", className: "bg-emerald-100 text-emerald-700" },
  SCHEDULED: { label: "Sáº¯p cháº¡y", className: "bg-sky-100 text-sky-700" },
  PAUSED: { label: "Táº¡m táº¯t", className: "bg-slate-100 text-slate-600" },
  ENDED: { label: "ÄÃ£ káº¿t thÃºc", className: "bg-orange-100 text-orange-700" },
  EXHAUSTED: { label: "Háº¿t lÆ°á»£t", className: "bg-rose-100 text-rose-700" },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextWeek() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function money(value: number | null) {
  if (value === null) return "â€”";
  return `${Math.round(value).toLocaleString("vi-VN")} â‚«`;
}

function discountLabel(promo: Pick<Promotion, "discountType" | "discountValue">) {
  return promo.discountType === "PERCENTAGE" ? `${promo.discountValue}%` : money(promo.discountValue);
}

export default function HostPromotionsPage() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    propertyId: "",
    description: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT",
    discountValue: 10,
    minOrderValue: "",
    maxUses: "",
    startDate: today(),
    endDate: nextWeek(),
  });

  const summary = useMemo(() => ({
    total: promotions.length,
    active: promotions.filter((p) => p.effectiveStatus === "ACTIVE").length,
    scheduled: promotions.filter((p) => p.effectiveStatus === "SCHEDULED").length,
    used: promotions.reduce((sum, p) => sum + p.usedCount, 0),
  }), [promotions]);

  async function load() {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const user = getStoredUser();
    if (user?.role !== "HOST") {
      router.replace("/");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [promoRes, propertyRes] = await Promise.all([
        fetch(`${API}/host/promotions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/host/properties`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [promoPayload, propertyPayload] = await Promise.all([promoRes.json(), propertyRes.json()]);
      if (!promoRes.ok) throw new Error(promoPayload.error?.message ?? "KhÃ´ng thá»ƒ táº£i khuyáº¿n mÃ£i.");
      if (!propertyRes.ok) throw new Error(propertyPayload.error?.message ?? "KhÃ´ng thá»ƒ táº£i chá»— nghá»‰.");
      setPromotions(promoPayload.data ?? []);
      setProperties(propertyPayload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "KhÃ´ng thá»ƒ káº¿t ná»‘i mÃ¡y chá»§.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createPromotion() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/host/promotions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          propertyId: form.propertyId || null,
          description: form.description || null,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : null,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          startDate: form.startDate,
          endDate: form.endDate,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error?.message ?? "KhÃ´ng thá»ƒ táº¡o Æ°u Ä‘Ã£i.");
        return;
      }
      setPromotions((items) => [payload.data, ...items]);
      setForm((prev) => ({ ...prev, code: "", description: "", maxUses: "" }));
    } catch {
      setError("KhÃ´ng thá»ƒ káº¿t ná»‘i mÃ¡y chá»§.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePromotion(promo: Promotion) {
    const token = getAccessToken();
    if (!token) return;
    const res = await fetch(`${API}/host/promotions/${promo.id}/toggle`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !promo.isActive }),
    });
    const payload = await res.json();
    if (res.ok) setPromotions((items) => items.map((item) => item.id === promo.id ? payload.data : item));
  }

  async function deletePromotion(promo: Promotion) {
    const token = getAccessToken();
    if (!token) return;
    const res = await fetch(`${API}/host/promotions/${promo.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 204) setPromotions((items) => items.filter((item) => item.id !== promo.id));
    if (!res.ok && res.status !== 204) {
      const payload = await res.json();
      setError(payload.error?.message ?? "KhÃ´ng thá»ƒ xÃ³a Æ°u Ä‘Ã£i.");
    }
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-teal-950 text-white shadow-xl shadow-teal-950/15">
        <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-200">Host promotions</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Táº¡o Æ°u Ä‘Ã£i Ä‘á»ƒ kÃ­ch cáº§u Ä‘áº·t phÃ²ng</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-teal-50/85">
              Táº¡o mÃ£ giáº£m giÃ¡ theo tá»«ng chá»— nghá»‰ hoáº·c toÃ n bá»™ danh má»¥c. KhÃ¡ch tháº¥y mÃ£ trÃªn trang chá»— nghá»‰ vÃ  cÃ³ thá»ƒ Ã¡p dá»¥ng khi Ä‘áº·t phÃ²ng.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Tá»•ng mÃ£" value={summary.total} />
            <Stat label="Äang cháº¡y" value={summary.active} />
            <Stat label="Sáº¯p cháº¡y" value={summary.scheduled} />
            <Stat label="ÄÃ£ dÃ¹ng" value={summary.used} />
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Táº¡o Æ°u Ä‘Ã£i má»›i</h2>
          <div className="mt-4 grid gap-3">
            <Field label="MÃ£ Æ°u Ä‘Ã£i">
              <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="VD: SUMMER15" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-300" />
            </Field>
            <Field label="Ãp dá»¥ng cho">
              <select value={form.propertyId} onChange={(e) => setForm((p) => ({ ...p, propertyId: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-300">
                <option value="">Táº¥t cáº£ chá»— nghá»‰ cá»§a tÃ´i</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>{property.title} Â· {property.city}</option>
                ))}
              </select>
            </Field>
            <Field label="MÃ´ táº£">
              <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Æ¯u Ä‘Ã£i hÃ¨, cuá»‘i tuáº§n, khai trÆ°Æ¡ng..." className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-300" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Loáº¡i giáº£m">
                <select value={form.discountType} onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value as "PERCENTAGE" | "FIXED_AMOUNT" }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-300">
                  <option value="PERCENTAGE">Theo %</option>
                  <option value="FIXED_AMOUNT">Sá»‘ tiá»n</option>
                </select>
              </Field>
              <Field label="GiÃ¡ trá»‹">
                <input type="number" value={form.discountValue} onChange={(e) => setForm((p) => ({ ...p, discountValue: Number(e.target.value) }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-300" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ÄÆ¡n tá»‘i thiá»ƒu">
                <input type="number" value={form.minOrderValue} onChange={(e) => setForm((p) => ({ ...p, minOrderValue: e.target.value }))} placeholder="KhÃ´ng báº¯t buá»™c" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-300" />
              </Field>
              <Field label="LÆ°á»£t dÃ¹ng">
                <input type="number" value={form.maxUses} onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))} placeholder="KhÃ´ng giá»›i háº¡n" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-300" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Báº¯t Ä‘áº§u">
                <input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-300" />
              </Field>
              <Field label="Káº¿t thÃºc">
                <input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-300" />
              </Field>
            </div>
            <button type="button" onClick={createPromotion} disabled={saving || !form.code.trim()} className="mt-2 rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Äang táº¡o..." : "Táº¡o Æ°u Ä‘Ã£i"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white py-16 text-center text-slate-400">Äang táº£i khuyáº¿n mÃ£i...</div>
          ) : promotions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">ChÆ°a cÃ³ Æ°u Ä‘Ã£i nÃ o.</div>
          ) : (
            promotions.map((promo) => {
              const cfg = STATUS_CONFIG[promo.effectiveStatus];
              return (
                <article key={promo.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-xl bg-slate-950 px-3 py-1 font-mono text-sm font-bold text-white">{promo.code}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cfg.className}`}>{cfg.label}</span>
                      </div>
                      <h3 className="mt-3 text-xl font-semibold text-slate-950">Giáº£m {discountLabel(promo)}</h3>
                      <p className="mt-1 text-sm text-slate-500">{promo.property ? `${promo.property.title} Â· ${promo.property.city}` : "Táº¥t cáº£ chá»— nghá»‰ cá»§a tÃ´i"}</p>
                      {promo.description && <p className="mt-2 text-sm leading-6 text-slate-600">{promo.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => togglePromotion(promo)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        {promo.isActive ? "Táº¡m táº¯t" : "KÃ­ch hoáº¡t"}
                      </button>
                      <button onClick={() => deletePromotion(promo)} className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">
                        XÃ³a
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-4">
                    <Mini label="Thá»i gian" value={`${promo.startDate} â†’ ${promo.endDate}`} />
                    <Mini label="ÄÆ¡n tá»‘i thiá»ƒu" value={money(promo.minOrderValue)} />
                    <Mini label="LÆ°á»£t dÃ¹ng" value={`${promo.usedCount}${promo.maxUses ? ` / ${promo.maxUses}` : " / âˆž"}`} />
                    <Mini label="Loáº¡i" value={promo.discountType === "PERCENTAGE" ? "Theo %" : "Sá»‘ tiá»n"} />
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs text-teal-50/70">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );
}
