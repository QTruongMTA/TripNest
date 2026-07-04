"use client";

import { UserAvatar } from "@/components/auth/UserAvatar";
import { getAccessToken } from "@/lib/auth";
import { useAuthStore, type SessionUser } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

// =============================================================================
// CONSTANTS
// =============================================================================
const COUNTRIES: string[] = [
  "Việt Nam",
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua và Barbuda",
  "Argentina", "Armenia", "Australia", "Áo", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Bỉ", "Belize",
  "Benin", "Bhutan", "Bolivia", "Bosnia và Herzegovina", "Botswana", "Brasil",
  "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Campuchia", "Cameroon", "Canada", "Chad", "Chile", "Colombia",
  "Comoros", "Cộng hòa Congo", "CHDC Congo", "Cộng hòa Trung Phi", "Costa Rica",
  "Côte d'Ivoire", "Croatia", "Cuba", "Cộng hòa Séc", "Síp",
  "Đan Mạch", "Djibouti", "Dominica", "Cộng hòa Dominican",
  "Ecuador", "Ai Cập", "El Salvador", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Phần Lan", "Pháp",
  "Gabon", "Gambia", "Gruzia", "Ghana", "Hy Lạp", "Grenada", "Guatemala",
  "Guinea", "Guinea Xích Đạo", "Guinea-Bissau", "Guyana", "Đức",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "Ấn Độ", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Ý",
  "Jamaica", "Nhật Bản", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Lào", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
  "Litva", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
  "Quần đảo Marshall", "Mauritania", "Mauritius", "Mexico", "Micronesia",
  "Moldova", "Monaco", "Mông Cổ", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Hà Lan", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "Bắc Macedonia", "Na Uy",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay",
  "Peru", "Philippines", "Ba Lan", "Bồ Đào Nha",
  "Qatar",
  "Romania", "Nga", "Rwanda",
  "Saint Kitts và Nevis", "Saint Lucia", "Saint Vincent và Grenadines", "Samoa",
  "San Marino", "São Tomé và Príncipe", "Ả Rập Saudi", "Senegal", "Serbia",
  "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
  "Quần đảo Solomon", "Somalia", "Nam Phi", "Hàn Quốc", "Nam Sudan",
  "Tây Ban Nha", "Sri Lanka", "Sudan", "Suriname", "Thụy Điển", "Thụy Sĩ", "Syria",
  "Đài Loan", "Tajikistan", "Tanzania", "Thái Lan", "Timor-Leste", "Togo",
  "Tonga", "Trinidad và Tobago", "Tunisia", "Thổ Nhĩ Kỳ", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "Các Tiểu Vương quốc Ả Rập Thống nhất",
  "Vương quốc Anh", "Hoa Kỳ", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican", "Venezuela",
  "Yemen", "Zambia", "Zimbabwe",
];

const GENDER_OPTIONS = ["Nam", "Nữ", "Không xác định (Non-binary)", "Không muốn nêu rõ"];
const MONTH_NAMES = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
const DAY_LABELS = ["T2","T3","T4","T5","T6","T7","CN"];

const SENSITIVE_WORDS = [
  "admin","administrator","moderator","root","system","support",
  "tripnest","staff","manager","cskh","hotline",
  "dit","lon","cu","dm","vcl","fuck","shit","bitch","asshole",
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1";

// =============================================================================
// VALIDATION
// =============================================================================
function validateDisplayName(value: string): string | null {
  if (!value.trim()) return null;
  if (value.trim().length < 2) return "Tên hiển thị phải có ít nhất 2 ký tự";
  if (value.trim().length > 50) return "Tên hiển thị không được dài hơn 50 ký tự";
  if (SENSITIVE_WORDS.some((w) => value.toLowerCase().includes(w))) return "Tên không hợp lệ";
  return null;
}

function validatePhone(value: string): string | null {
  if (!value) return null;
  if (!/^0\d{9,10}$/.test(value)) return "Số điện thoại không tồn tại";
  return null;
}

function validateBirthDate(value: string): string | null {
  if (!value) return null;
  const birth = new Date(value);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  if (age < 18) return "Bạn phải từ 18 tuổi trở lên";
  return null;
}

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "", barColor: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[!@#$%^&*()\-_=+[\]{};':",.<>?/\\|`~]/.test(password)) score++;
  const map = [
    { label: "Mật khẩu RẤT YẾU", color: "text-rose-600", barColor: "bg-rose-500" },
    { label: "Mật khẩu YẾU", color: "text-orange-500", barColor: "bg-orange-500" },
    { label: "Mật khẩu MẠNH", color: "text-yellow-500", barColor: "bg-yellow-400" },
    { label: "Mật khẩu RẤT MẠNH", color: "text-emerald-600", barColor: "bg-emerald-500" },
  ];
  return { score, ...map[score] };
}

function isProfileComplete(user: SessionUser) {
  return Boolean(user.displayName && user.phone && user.birthDate && user.nationality && user.gender && user.address);
}

// =============================================================================
// ICONS
// =============================================================================
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// =============================================================================
// DATE SEGMENT INPUT  (DD / MM / YYYY) — Enter advances to next segment
// =============================================================================
function DateSegmentInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parse = (v: string) => (v ? v.split("-") : ["", "", ""]);
  const [p0, p1, p2] = parse(value);
  const [year, setYear] = useState(p0);
  const [month, setMonth] = useState(p1);
  const [day, setDay] = useState(p2);
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const [y, m, d] = parse(value);
    setYear(y); setMonth(m); setDay(d);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function emit(d: string, m: string, y: string) {
    if (d.length === 2 && m.length === 2 && y.length === 4) onChange(`${y}-${m}-${d}`);
    else if (!d && !m && !y) onChange("");
  }

  function onDay(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDay(v); emit(v, month, year);
    if (v.length === 2) monthRef.current?.focus();
  }
  function onMonth(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMonth(v); emit(day, v, year);
    if (v.length === 2) yearRef.current?.focus();
  }
  function onYear(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
    setYear(v); emit(day, month, v);
  }

  // Enter advances to next segment
  function onDayKey(e: React.KeyboardEvent) { if (e.key === "Enter") { e.preventDefault(); monthRef.current?.focus(); } }
  function onMonthKey(e: React.KeyboardEvent) { if (e.key === "Enter") { e.preventDefault(); yearRef.current?.focus(); } }

  const cell = "w-8 bg-transparent text-center text-sm outline-none";
  return (
    <div className="flex w-fit items-center gap-0.5 rounded-xl border border-slate-300 px-3 py-2 focus-within:border-teal-500">
      <input ref={dayRef} inputMode="numeric" value={day} onChange={onDay} onKeyDown={onDayKey} placeholder="DD" className={cell} />
      <span className="select-none text-slate-400">/</span>
      <input ref={monthRef} inputMode="numeric" value={month} onChange={onMonth} onKeyDown={onMonthKey} placeholder="MM" className={cell} />
      <span className="select-none text-slate-400">/</span>
      <input ref={yearRef} inputMode="numeric" value={year} onChange={onYear} placeholder="YYYY" className="w-12 bg-transparent text-center text-sm outline-none" />
    </div>
  );
}

// =============================================================================
// CALENDAR PICKER — with year selector
// =============================================================================
function CalendarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const maxDate = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear() - 18, t.getMonth(), t.getDate());
  }, []);
  const maxYear = maxDate.getFullYear();
  const YEAR_LIST = useMemo(
    () => Array.from({ length: maxYear - 1920 + 1 }, (_, i) => maxYear - i),
    [maxYear]
  );

  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const [open, setOpen] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? maxYear);
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? maxDate.getMonth());
  const ref = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setShowYearPicker(false); } }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // When opening, reset view to selected or maxDate
  useEffect(() => {
    if (open) {
      const y = selected?.getFullYear() ?? maxYear;
      const m = selected?.getMonth() ?? maxDate.getMonth();
      setViewYear(y); setViewMonth(m); setShowYearPicker(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Scroll selected year into view when year picker opens
  useEffect(() => {
    if (showYearPicker && yearListRef.current) {
      const btn = yearListRef.current.querySelector("[data-selected]") as HTMLElement;
      if (btn) btn.scrollIntoView({ block: "center" });
    }
  }, [showYearPicker]);

  const canNext = viewYear < maxYear || (viewYear === maxYear && viewMonth < maxDate.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (!canNext) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }
  function pickYear(y: number) {
    setViewYear(y);
    // Clamp month if new year = maxYear
    if (y === maxYear && viewMonth > maxDate.getMonth()) setViewMonth(maxDate.getMonth());
    setShowYearPicker(false);
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const rawFirst = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = rawFirst === 0 ? 6 : rawFirst - 1;

  function pickDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    if (d > maxDate) return;
    onChange(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={`grid h-9 w-9 place-items-center rounded-xl border transition ${open ? "border-teal-500 bg-teal-50 text-teal-600" : "border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600"}`}
        aria-label="Mở lịch">
        <CalendarIcon />
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          {showYearPicker ? (
            /* ── Year picker ── */
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Chọn năm</span>
                <button type="button" onClick={() => setShowYearPicker(false)}
                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 text-lg">
                  ×
                </button>
              </div>
              <div ref={yearListRef} className="grid max-h-52 grid-cols-3 gap-1 overflow-y-auto pr-1">
                {YEAR_LIST.map((y) => (
                  <button key={y} type="button" data-selected={y === viewYear ? true : undefined}
                    onClick={() => pickYear(y)}
                    className={`rounded-lg py-1.5 text-sm transition hover:bg-teal-50 hover:text-teal-700 ${y === viewYear ? "bg-teal-600 font-semibold text-white hover:bg-teal-600 hover:text-white" : "text-slate-700"}`}>
                    {y}
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* ── Month calendar ── */
            <>
              {/* Header */}
              <div className="mb-3 flex items-center justify-between">
                <button type="button" onClick={prevMonth}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100">
                  <ChevronLeftIcon />
                </button>
                <button type="button" onClick={() => setShowYearPicker(true)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-slate-800 transition hover:bg-slate-100">
                  {MONTH_NAMES[viewMonth]}{" "}
                  <span className="text-teal-600">{viewYear}</span>
                  <ChevronIcon />
                </button>
                <button type="button" onClick={nextMonth} disabled={!canNext}
                  className={`grid h-8 w-8 place-items-center rounded-lg transition ${canNext ? "text-slate-500 hover:bg-slate-100" : "cursor-not-allowed text-slate-200"}`}>
                  <ChevronRightIcon />
                </button>
              </div>

              {/* Day names */}
              <div className="mb-1 grid grid-cols-7 gap-0.5">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="py-1 text-center text-[11px] font-medium text-slate-400">{d}</div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(viewYear, viewMonth, day);
                  const isSelected = selected?.toDateString() === date.toDateString();
                  const isDisabled = date > maxDate;
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <button key={day} type="button" disabled={isDisabled} onClick={() => pickDay(day)}
                      className={`mx-auto grid h-8 w-8 place-items-center rounded-lg text-sm transition
                        ${isSelected ? "bg-teal-600 font-semibold text-white" :
                          isDisabled ? "cursor-not-allowed text-slate-200" :
                          isToday ? "border border-teal-300 text-teal-600 hover:bg-teal-50" :
                          "text-slate-700 hover:bg-teal-50 hover:text-teal-700"}`}>
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COUNTRY SELECT
// =============================================================================
function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => COUNTRIES.filter((c) => c.toLowerCase().includes(search.toLowerCase())), [search]);

  useEffect(() => {
    function h(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 10);
    else setSearch("");
  }, [open]);

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 px-3 py-2 text-left text-sm transition hover:border-teal-400 focus:outline-none">
        <span className={value ? "text-slate-900" : "text-slate-400"}>{value || "Chọn quốc tịch"}</span>
        <ChevronIcon />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm quốc gia..."
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-teal-400" />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? <p className="px-3 py-2 text-sm text-slate-500">Không tìm thấy</p> :
              filtered.map((c) => (
                <button key={c} type="button" onClick={() => { onChange(c); setOpen(false); }}
                  className={`flex w-full items-center px-3 py-2 text-sm transition hover:bg-teal-50 ${value === c ? "bg-teal-50 font-medium text-teal-700" : "text-slate-900"}`}>
                  {c}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// GENDER SELECT
// =============================================================================
function GenderSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative w-full max-w-sm">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 px-3 py-2 text-left text-sm transition hover:border-teal-400 focus:outline-none">
        <span className={value ? "text-slate-900" : "text-slate-400"}>{value || "Chọn giới tính"}</span>
        <ChevronIcon />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {GENDER_OPTIONS.map((g) => (
            <button key={g} type="button" onClick={() => { onChange(g); setOpen(false); }}
              className={`flex w-full items-center px-3 py-2.5 text-sm transition hover:bg-teal-50 ${value === g ? "bg-teal-50 font-medium text-teal-700" : "text-slate-900"}`}>
              {g}
            </button>
          ))}
          <button type="button" onClick={() => { onChange(""); setOpen(false); }}
            className="flex w-full items-center border-t border-slate-100 px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-50">
            Bỏ chọn
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PASSWORD STRENGTH BAR
// =============================================================================
const PWD_HINTS = [
  { check: (p: string) => p.length >= 8, text: "Ít nhất 8 ký tự" },
  { check: (p: string) => /[A-Z]/.test(p), text: "Có ít nhất 1 chữ cái in hoa" },
  { check: (p: string) => /[!@#$%^&*()\-_=+[\]{};':",.<>?/\\|`~]/.test(p), text: "Có ít nhất 1 ký tự đặc biệt" },
];
function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color, barColor } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2 w-full max-w-sm">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? barColor : "bg-slate-200"}`} />
        ))}
      </div>
      <p className={`mt-1 text-xs font-semibold ${color}`}>{label || " "}</p>
      <ul className="mt-1 text-xs text-slate-500">
        {PWD_HINTS.map((h) => (
          <li key={h.text} className={`leading-5 ${h.check(password) ? "opacity-0 select-none" : ""}`}>
            • {h.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// =============================================================================
// CONFIRM MODAL
// =============================================================================
function ConfirmModal({ title, message, confirmLabel, cancelLabel, confirmClass, onConfirm, onCancel }: {
  title: string; message: React.ReactNode; confirmLabel: string; cancelLabel: string;
  confirmClass?: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl">
        <button type="button" onClick={onCancel}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-xl text-slate-500 transition hover:bg-slate-100">
          ×
        </button>
        <h3 className="pr-8 text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-3 text-sm leading-relaxed text-slate-600">{message}</div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm}
            className={confirmClass ?? "rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FIELD ROW
// =============================================================================
function FieldRow({ label, children, helper, error }: {
  label: string; children: React.ReactNode; helper?: string; error?: string;
}) {
  return (
    <div className="grid gap-3 border-t border-slate-200 py-4 md:grid-cols-[160px_1fr]">
      <p className="pt-2 text-sm font-medium text-slate-900">{label}</p>
      <div>
        {children}
        {error ? (
          <p className="mt-1.5 text-xs text-rose-600">{error}</p>
        ) : helper ? (
          <p className="mt-1.5 text-xs text-slate-500">{helper}</p>
        ) : null}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================
export default function Page() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const router = useRouter();

  const [form, setFormState] = useState({
    displayName: "", phone: "", birthDate: "", nationality: "Việt Nam", gender: "", address: "",
  });
  const [original, setOriginal] = useState({ ...form });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Per-field blur errors
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Avatar preview (chưa lưu DB)
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  // Exit modal
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      const init = {
        displayName: user.displayName || "",
        phone: user.phone || "",
        birthDate: user.birthDate || "",
        nationality: user.nationality || "Việt Nam",
        gender: user.gender || "",
        address: user.address || "",
      };
      setFormState(init);
      setOriginal(init);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(original) || newPassword !== "" || pendingAvatar !== null;

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function handleClose() {
    if (isDirty) setShowExitConfirm(true);
    else router.push("/");
  }

  // Blur handlers
  function handleDisplayNameBlur() {
    setDisplayNameError(validateDisplayName(form.displayName));
  }
  function handlePhoneBlur() {
    setPhoneError(form.phone ? validatePhone(form.phone) : null);
  }
  function handlePasswordBlur() {
    if (!newPassword) { setPasswordError(null); return; }
    const { score } = getPasswordStrength(newPassword);
    setPasswordError(score < 3 ? (
      newPassword.length < 8 ? "Mật khẩu phải có ít nhất 8 ký tự" :
      !/[A-Z]/.test(newPassword) ? "Mật khẩu phải có ít nhất 1 chữ cái in hoa" :
      "Mật khẩu phải có ít nhất 1 ký tự đặc biệt"
    ) : null);
  }

  function handleStartEditPassword() {
    setIsEditingPassword(true);
    setNewPassword("");
    setPasswordError(null);
    setShowPasswordText(true);
  }

  function handleCancelEditPassword() {
    setIsEditingPassword(false);
    setNewPassword("");
    setPasswordError(null);
    setShowPasswordText(false);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const e1 = validateDisplayName(form.displayName);
    if (e1) { errs.displayName = e1; setDisplayNameError(e1); }
    const e2 = validatePhone(form.phone);
    setPhoneError(e2);
    if (e2) errs._phone = e2;
    const e3 = validateBirthDate(form.birthDate);
    if (e3) errs.birthDate = e3;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function performSave() {
    const token = accessToken ?? getAccessToken();

    if (!token) {
      setErrors({ _global: "Phien dang nhap da het han. Vui long dang nhap lai de cap nhat thong tin." });
      clearSession();
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      if (pendingAvatar) {
        const res = await fetch(`${API_URL}/auth/me/avatar`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ avatar: pendingAvatar }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          if (res.status === 401) {
            clearSession();
            setErrors({ _global: "Phien dang nhap da het han. Vui long dang nhap lai de cap nhat anh." });
            return;
          }
          setErrors({ _global: payload.error?.message ?? "Cập nhật ảnh thất bại" });
          return;
        }
        const payload = await res.json();
        setUser(payload.data);
        setPendingAvatar(null);
      }
      if (JSON.stringify(form) !== JSON.stringify(original)) {
        const res = await fetch(`${API_URL}/auth/me/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            displayName: form.displayName.trim() || null,
            phone: form.phone || null,
            birthDate: form.birthDate || null,
            nationality: form.nationality,
            gender: form.gender || null,
            address: form.address.trim() || null,
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          if (res.status === 401) {
            clearSession();
            setErrors({ _global: "Phien dang nhap da het han. Vui long dang nhap lai de cap nhat thong tin." });
            return;
          }
          setErrors({ _global: payload.error?.message ?? "Cập nhật thất bại" });
          return;
        }
        const payload = await res.json();
        setUser(payload.data);
        setOriginal({ ...form });
      }
      if (newPassword) {
        const res = await fetch(`${API_URL}/auth/me/password`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ password: newPassword }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          if (res.status === 401) {
            clearSession();
            setPasswordError("Phien dang nhap da het han. Vui long dang nhap lai de doi mat khau.");
            setShowPasswordConfirm(false);
            return;
          }
          setPasswordError(payload.error?.message ?? "Đổi mật khẩu thất bại");
          setShowPasswordConfirm(false);
          return;
        }
        setNewPassword("");
        setPasswordError(null);
        setIsEditingPassword(false);
      }
      setShowPasswordConfirm(false);
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    if (!validate()) return;
    if (newPassword) {
      const { score } = getPasswordStrength(newPassword);
      if (score < 3) { setPasswordError("Mật khẩu chưa đủ mạnh để lưu"); return; }
      setShowPasswordConfirm(true);
    } else {
      performSave();
    }
  }

  if (!user) return <p className="text-slate-600">Vui lòng đăng nhập để xem hồ sơ.</p>;

  return (
    <>
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        {/* Teal header */}
        <div className="relative flex items-start gap-4 bg-teal-900 px-5 py-5 text-white md:px-8">
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className="[&_div>span]:!hidden [&_button]:!border-white/30 [&_button]:!bg-white/15 [&_button]:!text-white">
              <UserAvatar onAvatarPreview={setPendingAvatar} previewSrc={pendingAvatar ?? undefined} />
            </div>
            {pendingAvatar && (
              <button
                type="button"
                onClick={() => setPendingAvatar(null)}
                className="text-[11px] text-white/60 underline hover:text-white"
              >
                Huỷ
              </button>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold">Thông tin cá nhân</h1>
            <p className="mt-1 text-sm text-white/70">Cập nhật thông tin của bạn và tìm hiểu cách thông tin này được sử dụng.</p>
          </div>
          <button type="button" onClick={handleClose}
            className="shrink-0 grid h-9 w-9 place-items-center rounded-full border border-white/30 text-xl text-white transition hover:bg-white/20"
            aria-label="Đóng">×
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pb-2 md:px-8">

          {/* Tên hiển thị */}
          <FieldRow label="Tên hiển thị" error={displayNameError ?? errors.displayName}
            helper={!displayNameError && !errors.displayName ? `Để trống sẽ dùng địa chỉ email (${user.email}).` : undefined}>
            <input value={form.displayName}
              onChange={(e) => { setField("displayName", e.target.value); setDisplayNameError(null); }}
              onBlur={handleDisplayNameBlur}
              placeholder={user.email}
              className={`w-full max-w-sm rounded-xl border px-3 py-2 text-sm outline-none focus:border-teal-500 ${displayNameError || errors.displayName ? "border-rose-400" : "border-slate-300"}`} />
          </FieldRow>

          {/* Email (readonly) */}
          <FieldRow label="Địa chỉ email" helper="Địa chỉ email không thể thay đổi.">
            <p className="py-2 text-sm text-slate-700">{user.email}</p>
          </FieldRow>

          {/* Số điện thoại */}
          <FieldRow label="Số điện thoại" error={phoneError ?? undefined}
            helper={!phoneError ? "Chỗ nghỉ sẽ liên hệ qua số điện thoại này nếu cần." : undefined}>
            <input type="tel" value={form.phone}
              onChange={(e) => { setField("phone", e.target.value.replace(/\D/g, "").slice(0, 11)); setPhoneError(null); }}
              onBlur={handlePhoneBlur}
              onKeyDown={(e) => e.key === "Enter" && handlePhoneBlur()}
              placeholder="Nhập số điện thoại (bắt đầu bằng 0)"
              className={`w-full max-w-sm rounded-xl border px-3 py-2 text-sm outline-none focus:border-teal-500 ${phoneError ? "border-rose-400" : "border-slate-300"}`} />
          </FieldRow>

          {/* Mật khẩu */}
          <FieldRow label="Mật khẩu">
            <div>
              {!isEditingPassword ? (
                /* Chế độ xem — mắt chỉ ẩn/hiện ký tự hiển thị, không liên quan đến đổi mật khẩu */
                <div className="flex items-center gap-3 w-full max-w-sm">
                  <div className="relative flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-500 select-none tracking-widest">
                    ••••••••
                    <button
                      type="button"
                      onClick={() => setShowPasswordText((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showPasswordText ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                    >
                      {showPasswordText ? <EyeIcon /> : <EyeOffIcon />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartEditPassword}
                    className="shrink-0 text-sm font-medium text-teal-600 hover:text-teal-800 hover:underline"
                  >
                    Đổi mật khẩu
                  </button>
                </div>
              ) : (
                /* Chế độ nhập mật khẩu mới — mắt ẩn/hiện ký tự đang gõ */
                <div>
                  <div className="relative w-full max-w-sm">
                    <input
                      type={showPasswordText ? "text" : "password"}
                      value={newPassword}
                      autoComplete="new-password"
                      autoFocus
                      onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
                      onBlur={handlePasswordBlur}
                      onKeyDown={(e) => e.key === "Enter" && handlePasswordBlur()}
                      placeholder="Nhập mật khẩu mới"
                      className="w-full rounded-xl border border-teal-400 px-3 py-2 pr-10 text-sm outline-none focus:border-teal-500 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                    />
                    {/* Mắt chéo = ký tự ẩn (*) | Mắt mở = ký tự hiện */}
                    <button
                      type="button"
                      onClick={() => setShowPasswordText((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showPasswordText ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                    >
                      {showPasswordText ? <EyeIcon /> : <EyeOffIcon />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEditPassword}
                    className="mt-2 text-xs text-slate-400 hover:text-slate-600 hover:underline"
                  >
                    Huỷ đổi mật khẩu
                  </button>
                  {newPassword && <PasswordStrengthBar password={newPassword} />}
                  {passwordError && <p className="mt-1 text-xs text-rose-600">{passwordError}</p>}
                  {!newPassword && !passwordError && (
                    <p className="mt-1.5 text-xs text-slate-500">Nhập mật khẩu mới để thay đổi.</p>
                  )}
                </div>
              )}
            </div>
          </FieldRow>

          {/* Ngày sinh — DD/MM/YYYY + calendar */}
          <FieldRow label="Ngày sinh" error={errors.birthDate}
            helper={!errors.birthDate ? "Phải từ 18 tuổi trở lên." : undefined}>
            <div className="flex items-center gap-2">
              <DateSegmentInput value={form.birthDate} onChange={(v) => setField("birthDate", v)} />
              <CalendarPicker value={form.birthDate} onChange={(v) => setField("birthDate", v)} />
            </div>
          </FieldRow>

          {/* Quốc tịch */}
          <FieldRow label="Quốc tịch">
            <CountrySelect value={form.nationality} onChange={(v) => setField("nationality", v)} />
          </FieldRow>

          {/* Giới tính */}
          <FieldRow label="Giới tính">
            <GenderSelect value={form.gender} onChange={(v) => setField("gender", v)} />
          </FieldRow>

          {/* Địa chỉ */}
          <FieldRow label="Địa chỉ">
            <input value={form.address} onChange={(e) => setField("address", e.target.value)}
              placeholder="Nhập địa chỉ của bạn"
              className="w-full max-w-sm rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" />
          </FieldRow>

          {errors._global && (
            <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{errors._global}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4 md:px-8">
          <p className="text-sm text-slate-600">
            {isProfileComplete(user) ? "Tất cả thông tin đã được cập nhật ✓" : "Cập nhật đầy đủ thông tin để có trải nghiệm tốt hơn"}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={handleClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              Huỷ
            </button>
            <button type="button" onClick={handleSave} disabled={!isDirty || saving}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${isDirty ? "bg-teal-600 text-white hover:bg-teal-700" : "cursor-not-allowed bg-slate-200 text-slate-400"}`}>
              {saving ? "Đang lưu..." : "Cập nhật"}
            </button>
          </div>
        </div>
      </section>

      {/* Exit confirmation */}
      {showExitConfirm && (
        <ConfirmModal
          title="Thoát mà không lưu?"
          message="Mọi thông tin thay đổi sẽ không được cập nhật, bạn có chắc muốn THOÁT?"
          confirmLabel="Thoát" cancelLabel="Huỷ"
          confirmClass="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
          onConfirm={() => { setPendingAvatar(null); router.push("/"); }}
          onCancel={() => setShowExitConfirm(false)}
        />
      )}

      {/* Password confirmation */}
      {showPasswordConfirm && (
        <ConfirmModal
          title="Xác nhận thay đổi mật khẩu"
          message={
            <span>
              Bạn có chắc muốn thay đổi mật khẩu không?
              <br />
              <span className="mt-1 block">
                Mật khẩu mới là:{" "}
                <strong className="font-mono tracking-wider text-slate-900">{newPassword}</strong>
              </span>
            </span>
          }
          confirmLabel={saving ? "Đang thay đổi..." : "Thay đổi"}
          cancelLabel="Huỷ"
          onConfirm={performSave}
          onCancel={() => setShowPasswordConfirm(false)}
        />
      )}
    </>
  );
}
