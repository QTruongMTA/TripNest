"use client";

import { FormEvent, useMemo, useState } from "react";

type PropertyType = "APARTMENT" | "HOUSE" | "HOTEL" | "UNIQUE";
type Step =
  | "type"
  | "name"
  | "address"
  | "setup-details"
  | "amenities"
  | "services"
  | "languages"
  | "rules"
  | "photos"
  | "booking-method"
  | "nightly-price"
  | "rate-plans"
  | "availability"
  | "legal";

type PhotoItem = {
  id: string;
  name: string;
  size: number;
  url: string;
  isMain: boolean;
};

type ChildPricingState = {
  enabled: boolean;
  infantMode: "free" | "fixed";
  infantPrice: string;
  childToAge: number;
  childMode: "free" | "fixed";
  childPrice: string;
};

type OwnerInfo = {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
};

type BedCounts = {
  single: number;
  double: number;
  king: number;
  superKing: number;
  bunk: number;
  sofa: number;
  futon: number;
};

type Bedroom = {
  id: number;
  beds: BedCounts;
};

type DetailsState = {
  bedrooms: Bedroom[];
  livingBeds: number;
  guests: number;
  bathrooms: number;
  children: boolean;
  cribs: boolean;
  size: string;
};

const propertyTypes: Array<{ value: PropertyType; title: string; description: string; marker: string }> = [
  { value: "APARTMENT", title: "Căn hộ", description: "Chỗ nghỉ tự nấu nướng, đầy đủ nội thất mà khách thuê nguyên căn.", marker: "A" },
  { value: "HOUSE", title: "Nhà", description: "Nhà nguyên căn, biệt thự, nhà nghỉ dưỡng hoặc homestay riêng tư.", marker: "N" },
  { value: "HOTEL", title: "Khách sạn, B&B", description: "Khách sạn, nhà nghỉ B&B, nhà khách hoặc chỗ nghỉ tương tự.", marker: "K" },
  { value: "UNIQUE", title: "Chỗ nghỉ khác", description: "Khu cắm trại, bungalow, thuyền nghỉ dưỡng hoặc mô hình đặc biệt.", marker: "C" },
];

const steps: Step[] = ["type", "name", "address", "setup-details", "amenities", "services", "languages", "rules", "photos", "booking-method", "nightly-price", "rate-plans", "availability", "legal"];
const setupSteps: Step[] = ["setup-details", "amenities", "services", "languages", "rules"];

const amenitySections = [
  { title: "Tiện nghi chung", items: ["Điều hòa nhiệt độ", "Hệ thống sưởi", "WiFi miễn phí", "Trạm sạc xe điện"] },
  { title: "Nấu nướng và giặt rửa", items: ["Bếp", "Bếp nhỏ", "Máy giặt"] },
  { title: "Giải trí", items: ["TV màn hình phẳng", "Hồ bơi", "Bể sục", "Minibar", "Phòng xông hơi"] },
  { title: "Không gian ngoài trời và tầm nhìn", items: ["Ban công", "Nhìn ra vườn", "Sân thượng / hiên", "Tầm nhìn ra khung cảnh"] },
];

const languageOptions = ["Tiếng Anh", "Tiếng Pháp", "Tiếng Trung", "Tiếng Tây Ban Nha", "Tiếng Việt"];
const cityOptions = [
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bắc Giang",
  "Bắc Kạn",
  "Bạc Liêu",
  "Bắc Ninh",
  "Bến Tre",
  "Bình Định",
  "Bình Dương",
  "Bình Phước",
  "Bình Thuận",
  "Cà Mau",
  "Cần Thơ",
  "Cao Bằng",
  "Đà Nẵng",
  "Đắk Lắk",
  "Đắk Nông",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Nội",
  "Hà Tĩnh",
  "Hải Dương",
  "Hải Phòng",
  "Hậu Giang",
  "Hòa Bình",
  "Hưng Yên",
  "Khánh Hòa",
  "Kiên Giang",
  "Kon Tum",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Bình",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Nam",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Thừa Thiên Huế",
  "Tiền Giang",
  "TP. Hồ Chí Minh",
  "Trà Vinh",
  "Tuyên Quang",
  "Vĩnh Long",
  "Vĩnh Phúc",
  "Yên Bái",
];
const timeOptions = ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

const defaultBedroomBeds: BedCounts = {
  single: 0,
  double: 1,
  king: 0,
  superKing: 0,
  bunk: 0,
  sofa: 0,
  futon: 0,
};

const bedOptions: Array<{ key: keyof BedCounts; title: string; size: string; icon: string; advanced?: boolean }> = [
  { key: "single", title: "Giường đơn", size: "Rộng 90 - 130 cm", icon: "▔" },
  { key: "double", title: "Giường đôi", size: "Rộng 131 - 150 cm", icon: "▔▔" },
  { key: "king", title: "Giường lớn (cỡ King)", size: "Rộng 151 - 180 cm", icon: "▔▔" },
  { key: "superKing", title: "Giường cực lớn (cỡ Super-king)", size: "Rộng 181 - 210 cm", icon: "▔▔" },
  { key: "bunk", title: "Giường tầng", size: "Nhiều kích cỡ", icon: "▔" , advanced: true },
  { key: "sofa", title: "Giường sofa", size: "Nhiều kích cỡ", icon: "▰", advanced: true },
  { key: "futon", title: "Nệm Futon", size: "Nhiều kích cỡ", icon: "▔▔", advanced: true },
];

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-500";

export default function Page() {
  const [step, setStep] = useState<Step>("type");
  const [propertyType, setPropertyType] = useState<PropertyType>("APARTMENT");
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", postalCode: "", country: "Việt Nam" });
  const [details, setDetails] = useState<DetailsState>({
    bedrooms: [{ id: 1, beds: defaultBedroomBeds }],
    livingBeds: 0,
    guests: 2,
    bathrooms: 1,
    children: true,
    cribs: false,
    size: "",
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [services, setServices] = useState({ breakfast: "no", parking: "no" });
  const [languages, setLanguages] = useState<string[]>(["Tiếng Việt"]);
  const [rules, setRules] = useState({ smoking: false, parties: false, pets: "no", checkInFrom: "15:00", checkInTo: "18:00", checkOutFrom: "08:00", checkOutTo: "11:00" });
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [bookingMethod, setBookingMethod] = useState("instant");
  const [nightlyPrice, setNightlyPrice] = useState("300000");
  const [launchDiscount, setLaunchDiscount] = useState(true);
  const [cancellationDays, setCancellationDays] = useState(1);
  const [mistakeProtection, setMistakeProtection] = useState(true);
  const [groupPricing, setGroupPricing] = useState({ enabled: true, oneGuestDiscount: 10 });
  const [childPricing, setChildPricing] = useState<ChildPricingState>({
    enabled: true,
    infantMode: "free",
    infantPrice: "",
    childToAge: 17,
    childMode: "free",
    childPrice: "",
  });
  const [nonRefundableRate, setNonRefundableRate] = useState({ enabled: true, discount: 10 });
  const [weeklyRate, setWeeklyRate] = useState({ enabled: true, discount: 15 });
  const [availability, setAvailability] = useState({ firstBookableDate: "specific", openWindow: 365, longStayAllowed: true, maxStayNights: 30 });
  const [legalType, setLegalType] = useState("individual");
  const [owners, setOwners] = useState<OwnerInfo[]>([{ id: 1, firstName: "", lastName: "", birthDate: "" }]);
  const [ownerAlias, setOwnerAlias] = useState("");
  const [legalSubmitted, setLegalSubmitted] = useState(false);

  const selectedType = useMemo(() => propertyTypes.find((type) => type.value === propertyType) ?? propertyTypes[0], [propertyType]);
  const activeIndex = steps.indexOf(step);
  const setupIndex = setupSteps.indexOf(step);
  const canContinue =
    step === "type" ||
    (step === "name" && title.trim().length >= 3) ||
    (step === "address" && address.line1.trim() && address.city.trim()) ||
    (step === "setup-details" && details.guests > 0 && details.bathrooms > 0) ||
    (step === "amenities" && amenities.length > 0) ||
    step === "services" ||
    (step === "languages" && languages.length > 0) ||
    step === "rules" ||
    (step === "photos" && photos.length >= 5) ||
    step === "booking-method" ||
    (step === "nightly-price" && Number(nightlyPrice) > 0) ||
    step === "rate-plans" ||
    step === "availability" ||
    (step === "legal" && owners.length > 0 && owners.every((owner) => owner.firstName.trim() && owner.lastName.trim() && owner.birthDate.trim()));

  function continueFlow(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!canContinue) return;
    const nextStep = steps[activeIndex + 1];
    if (nextStep) setStep(nextStep);
  }

  function goBack() {
    const previousStep = steps[activeIndex - 1];
    if (previousStep) setStep(previousStep);
  }

  function toggleItem(value: string, values: string[], setter: (next: string[]) => void) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  return (
    <main className="mx-auto max-w-6xl">
      <section className="overflow-hidden rounded-[28px] border border-teal-950/10 bg-white shadow-sm shadow-teal-950/5">
        <div className="bg-teal-900 px-6 py-6 text-white md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <a href="/" className="text-2xl font-semibold tracking-tight">TripNest</a>
            <div className="text-right text-sm text-teal-50">
              <p className="font-semibold">{title || "Chỗ nghỉ mới"}</p>
              <p className="text-teal-100/80">{address.city ? `${address.city}, Việt Nam` : "Đang nhập thông tin đăng chỗ nghỉ"}</p>
            </div>
          </div>
        </div>

        <ProgressNav activeIndex={activeIndex} setupIndex={setupIndex} />

        <div className="bg-[#f7fbfa] px-5 py-8 md:px-8 md:py-12">
          {step === "type" ? <TypeStep propertyType={propertyType} setPropertyType={setPropertyType} onContinue={() => continueFlow()} /> : null}
          {step === "name" ? <NameStep title={title} setTitle={setTitle} onBack={goBack} onSubmit={continueFlow} canContinue={Boolean(canContinue)} /> : null}
          {step === "address" ? (
            <AddressStep address={address} setAddress={setAddress} selectedType={selectedType.title} title={title} onBack={goBack} onSubmit={continueFlow} canContinue={Boolean(canContinue)} />
          ) : null}
          {step === "setup-details" ? (
            <DetailsStep details={details} setDetails={setDetails} onBack={goBack} onSubmit={continueFlow} canContinue={Boolean(canContinue)} />
          ) : null}
          {step === "amenities" ? (
            <AmenitiesStep amenities={amenities} toggleAmenity={(item) => toggleItem(item, amenities, setAmenities)} onBack={goBack} onSubmit={continueFlow} canContinue={Boolean(canContinue)} />
          ) : null}
          {step === "services" ? <ServicesStep services={services} setServices={setServices} onBack={goBack} onSubmit={continueFlow} /> : null}
          {step === "languages" ? (
            <LanguagesStep languages={languages} toggleLanguage={(item) => toggleItem(item, languages, setLanguages)} onBack={goBack} onSubmit={continueFlow} canContinue={Boolean(canContinue)} />
          ) : null}
          {step === "rules" ? <RulesStep rules={rules} setRules={setRules} onBack={goBack} onSubmit={continueFlow} /> : null}
          {step === "photos" ? <PhotosStep photos={photos} setPhotos={setPhotos} onBack={goBack} onSubmit={continueFlow} canContinue={Boolean(canContinue)} /> : null}
          {step === "booking-method" ? <BookingMethodStep bookingMethod={bookingMethod} setBookingMethod={setBookingMethod} onBack={goBack} onSubmit={continueFlow} /> : null}
          {step === "nightly-price" ? <NightlyPriceStep price={nightlyPrice} setPrice={setNightlyPrice} launchDiscount={launchDiscount} setLaunchDiscount={setLaunchDiscount} onBack={goBack} onSubmit={continueFlow} canContinue={Boolean(canContinue)} /> : null}
          {step === "rate-plans" ? (
            <RatePlansStep
              price={Number(nightlyPrice) || 0}
              cancellationDays={cancellationDays}
              setCancellationDays={setCancellationDays}
              mistakeProtection={mistakeProtection}
              setMistakeProtection={setMistakeProtection}
              groupPricing={groupPricing}
              setGroupPricing={setGroupPricing}
              childPricing={childPricing}
              setChildPricing={setChildPricing}
              nonRefundableRate={nonRefundableRate}
              setNonRefundableRate={setNonRefundableRate}
              weeklyRate={weeklyRate}
              setWeeklyRate={setWeeklyRate}
              onBack={goBack}
              onSubmit={continueFlow}
            />
          ) : null}
          {step === "availability" ? <AvailabilityStep availability={availability} setAvailability={setAvailability} onBack={goBack} onSubmit={continueFlow} /> : null}
          {step === "legal" ? (
            <LegalStep
              legalType={legalType}
              setLegalType={setLegalType}
              owners={owners}
              setOwners={setOwners}
              ownerAlias={ownerAlias}
              setOwnerAlias={setOwnerAlias}
              submitted={legalSubmitted}
              setSubmitted={setLegalSubmitted}
              onBack={goBack}
              onSubmit={continueFlow}
              canContinue={Boolean(canContinue)}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function ProgressNav({ activeIndex, setupIndex }: { activeIndex: number; setupIndex: number }) {
  const stages = [
    { label: "Thông tin cơ bản", done: activeIndex > 2, active: activeIndex <= 2, progress: activeIndex > 2 ? 100 : ((activeIndex + 1) / 3) * 100 },
    { label: "Cài đặt chỗ nghỉ", done: activeIndex > 7, active: activeIndex >= 3 && activeIndex <= 7, progress: setupIndex >= 0 ? ((setupIndex + 1) / 5) * 100 : activeIndex > 7 ? 100 : 0 },
    { label: "Ảnh", done: activeIndex > 8, active: activeIndex === 8, progress: activeIndex >= 8 ? 100 : 0 },
    { label: "Giá và lịch", done: activeIndex > 12, active: activeIndex >= 9 && activeIndex <= 12, progress: activeIndex >= 9 ? Math.min(100, ((activeIndex - 8) / 4) * 100) : 0 },
    { label: "Thông tin pháp lý", done: false, active: activeIndex === 13, progress: activeIndex === 13 ? 100 : 0 },
  ];

  return (
    <nav className="border-b border-slate-200 bg-white px-4 md:px-8" aria-label="Tiến trình đăng chỗ nghỉ">
      <div className="grid gap-3 py-5 md:grid-cols-5">
        {stages.map((stage) => (
          <div key={stage.label} className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className={stage.active || stage.done ? "font-semibold text-teal-900" : "text-slate-400"}>{stage.label}</span>
              {stage.done ? <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-xs text-white">✓</span> : null}
            </div>
            <div className="mt-3 flex h-1.5 gap-1 overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full rounded-full ${stage.done ? "bg-emerald-400" : stage.active ? "bg-teal-600" : "bg-slate-300"}`} style={{ width: `${stage.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

function TypeStep({ propertyType, setPropertyType, onContinue }: { propertyType: PropertyType; setPropertyType: (value: PropertyType) => void; onContinue: () => void }) {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Bước đầu tiên</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Chọn loại chỗ nghỉ Quý vị muốn đăng</h1>
      <p className="mt-4 text-lg text-slate-600">Thông tin này giúp TripNest gợi ý đúng biểu mẫu cho các giai đoạn tiếp theo.</p>
      <div className="mt-9 grid gap-4 md:grid-cols-4">
        {propertyTypes.map((type) => {
          const active = propertyType === type.value;
          return (
            <button key={type.value} type="button" onClick={() => setPropertyType(type.value)} className={`flex min-h-[260px] flex-col rounded-lg border bg-white p-5 text-left transition ${active ? "border-teal-700 shadow-lg shadow-teal-900/10 ring-4 ring-teal-100" : "border-slate-200 hover:border-teal-300 hover:shadow-md hover:shadow-teal-950/5"}`}>
              <span className={`grid h-14 w-14 place-items-center rounded-2xl text-xl font-semibold ${active ? "bg-teal-800 text-white" : "bg-teal-50 text-teal-800"}`}>{type.marker}</span>
              <span className="mt-6 text-xl font-semibold text-slate-950">{type.title}</span>
              <span className="mt-3 flex-1 text-sm leading-6 text-slate-600">{type.description}</span>
              <span className={`mt-6 rounded-md px-4 py-3 text-center text-sm font-semibold ${active ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"}`}>{active ? "Đã chọn" : "Chọn loại này"}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-8 flex justify-end">
        <button type="button" onClick={onContinue} className="rounded-md bg-teal-700 px-8 py-3 text-base font-semibold text-white transition hover:bg-teal-800">Tiếp tục</button>
      </div>
    </div>
  );
}

function NameStep({ title, setTitle, onBack, onSubmit, canContinue }: { title: string; setTitle: (value: string) => void; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; canContinue: boolean }) {
  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Tên chỗ nghỉ Quý vị?</h1>
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-teal-950/5 md:p-7">
          <label className="grid gap-2 text-base font-semibold text-slate-950">
            Tên chỗ nghỉ
            <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} autoFocus />
          </label>
          <p className="mt-3 text-sm text-slate-500">Tên nên ngắn, dễ nhớ và không bao gồm địa chỉ đầy đủ.</p>
        </div>
        <WizardActions onBack={onBack} canContinue={canContinue} />
      </div>
      <aside className="space-y-5">
        <InfoPanel title="Tôi nên chú ý điều gì khi chọn tên?">
          <ul className="list-disc space-y-2 pl-5">
            <li>Chọn tên ngắn và hấp dẫn.</li>
            <li>Tránh dùng chữ viết tắt khó hiểu.</li>
            <li>Đúng với thực tế chỗ nghỉ.</li>
          </ul>
        </InfoPanel>
        <InfoPanel title="Tên này sẽ hiển thị ở đâu?">Tên chỗ nghỉ sẽ xuất hiện trong trang chi tiết và kết quả tìm kiếm sau khi Quý vị hoàn tất các giai đoạn còn lại.</InfoPanel>
      </aside>
    </form>
  );
}

function AddressStep({ address, setAddress, selectedType, title, onBack, onSubmit, canContinue }: { address: { line1: string; line2: string; city: string; postalCode: string; country: string }; setAddress: (value: { line1: string; line2: string; city: string; postalCode: string; country: string }) => void; selectedType: string; title: string; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; canContinue: boolean }) {
  const mapLabel = [address.line1, address.city].filter(Boolean).join(", ") || "Vị trí chỗ nghỉ";

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-6xl">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Chỗ nghỉ của Quý vị ở đâu?</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,620px)_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-teal-950/5 md:p-7">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl font-semibold text-slate-950">Biểu mẫu Địa chỉ</h2>
          </div>
          <div className="mt-6 grid gap-5">
            <Field label="Vùng/quốc gia"><input value={address.country} disabled className={inputClass} /></Field>
            <Field label="Địa chỉ"><input value={address.line1} onChange={(event) => setAddress({ ...address, line1: event.target.value })} className={inputClass} placeholder="Tên đường và số nhà/căn hộ" /></Field>
            <Field label="Địa chỉ dòng 2"><input value={address.line2} onChange={(event) => setAddress({ ...address, line2: event.target.value })} className={inputClass} placeholder="Số căn hộ, tầng, tòa nhà" /></Field>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Thị trấn/thành phố">
                <select value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} className={inputClass}>
                  <option value="" disabled>Chọn thành phố</option>
                  {cityOptions.map((city) => <option key={city}>{city}</option>)}
                </select>
              </Field>
              <Field label="Mã bưu điện"><input value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} className={inputClass} /></Field>
            </div>
            <div className="rounded-lg border border-amber-400 bg-amber-50 px-5 py-4 text-sm leading-6 text-slate-700">Hãy thiết lập vị trí chỗ nghỉ của Quý vị trên bản đồ bằng cách đặt ghim vào đúng vị trí.</div>
          </div>
        </section>
        <aside className="min-h-[520px] overflow-hidden rounded-lg border border-teal-950/10 bg-teal-50 shadow-sm shadow-teal-950/5">
          <div className="relative h-full min-h-[520px] bg-[linear-gradient(135deg,_#d9f3ef_0%,_#edf8f6_35%,_#c7e9df_100%)]">
            <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(90deg,rgba(15,118,110,.18)_1px,transparent_1px),linear-gradient(rgba(15,118,110,.18)_1px,transparent_1px)] [background-size:44px_44px]" />
            <div className="absolute left-8 top-10 h-28 w-48 rounded-[50%] border-2 border-teal-600/30" />
            <div className="absolute bottom-20 right-8 h-40 w-56 rounded-[45%] border-2 border-teal-700/20" />
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal-700 text-xl font-semibold text-white shadow-xl shadow-teal-900/25">•</div>
              <div className="mt-3 rounded-lg bg-white/95 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg">{mapLabel}</div>
            </div>
            <div className="absolute inset-x-5 bottom-5 rounded-lg bg-white/95 p-4 shadow-lg">
              <p className="text-sm font-semibold text-slate-950">{title || "Tên chỗ nghỉ"}</p>
              <p className="mt-1 text-sm text-slate-600">{selectedType} tại {address.country}</p>
            </div>
          </div>
        </aside>
      </div>
      <WizardActions onBack={onBack} canContinue={canContinue} />
    </form>
  );
}

function DetailsStep({ details, setDetails, onBack, onSubmit, canContinue }: { details: DetailsState; setDetails: (value: DetailsState) => void; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; canContinue: boolean }) {
  const [editingRoom, setEditingRoom] = useState<"living" | number | null>(null);
  const [livingDraft, setLivingDraft] = useState(details.livingBeds);
  const [bedDraft, setBedDraft] = useState<BedCounts>(defaultBedroomBeds);
  const [showAdvancedBeds, setShowAdvancedBeds] = useState(false);

  const nextBedroomId = details.bedrooms.reduce((max, bedroom) => Math.max(max, bedroom.id), 0) + 1;

  function openLivingRoom() {
    setLivingDraft(details.livingBeds);
    setEditingRoom("living");
  }

  function openBedroom(bedroom: Bedroom) {
    setBedDraft({ ...bedroom.beds });
    setShowAdvancedBeds(false);
    setEditingRoom(bedroom.id);
  }

  function addBedroom() {
    setBedDraft({ ...defaultBedroomBeds });
    setShowAdvancedBeds(false);
    setEditingRoom(nextBedroomId);
  }

  function saveRoom() {
    if (editingRoom === "living") {
      setDetails({ ...details, livingBeds: livingDraft });
      setEditingRoom(null);
      return;
    }

    if (typeof editingRoom === "number") {
      const exists = details.bedrooms.some((bedroom) => bedroom.id === editingRoom);
      const nextBedroom = { id: editingRoom, beds: bedDraft };
      setDetails({
        ...details,
        bedrooms: exists
          ? details.bedrooms.map((bedroom) => bedroom.id === editingRoom ? nextBedroom : bedroom)
          : [...details.bedrooms, nextBedroom],
      });
      setEditingRoom(null);
    }
  }

  function deleteBedroom(id: number) {
    setDetails({ ...details, bedrooms: details.bedrooms.filter((bedroom) => bedroom.id !== id) });
  }

  function changeBedDraft(key: keyof BedCounts, value: number) {
    setBedDraft({ ...bedDraft, [key]: Math.max(0, value) });
  }

  if (editingRoom === "living") {
    return (
      <section className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Phòng khách</h1>
        <Panel className="mt-7">
          <BedCounterRow icon="▰" title="Giường sofa" value={livingDraft} onChange={(value) => setLivingDraft(Math.max(0, value))} />
        </Panel>
        <RoomEditorActions onCancel={() => setEditingRoom(null)} onSave={saveRoom} />
      </section>
    );
  }

  if (typeof editingRoom === "number") {
    const visibleBedOptions = showAdvancedBeds ? bedOptions : bedOptions.filter((option) => !option.advanced);

    return (
      <section className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Phòng ngủ {editingRoom}</h1>
        <Panel className="mt-7">
          <p className="font-semibold text-slate-950">Phòng này có giường loại nào?</p>
          <div className="mt-6 grid gap-5">
            {visibleBedOptions.map((option) => (
              <BedCounterRow
                key={option.key}
                icon={option.icon}
                title={option.title}
                subtitle={option.size}
                value={bedDraft[option.key]}
                onChange={(value) => changeBedDraft(option.key, value)}
              />
            ))}
          </div>
          <button type="button" onClick={() => setShowAdvancedBeds((value) => !value)} className="mt-5 text-sm font-semibold text-teal-700">
            {showAdvancedBeds ? "Thu gọn các lựa chọn giường" : "Hiện thêm các lựa chọn giường"}
          </button>
        </Panel>
        <RoomEditorActions onCancel={() => setEditingRoom(null)} onSave={saveRoom} />
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Chi tiết chỗ nghỉ</h1>
      <div className="mt-7 space-y-5">
        <Panel>
          <p className="text-base font-semibold text-slate-950">Khách có thể ngủ ở đâu?</p>
          <div className="mt-5 grid gap-3">
            <RoomRow title="Phòng khách" subtitle={`${details.livingBeds} giường`} onClick={openLivingRoom} />
            {details.bedrooms.map((bedroom) => (
              <RoomRow
                key={bedroom.id}
                title={`Phòng ngủ ${bedroom.id}`}
                subtitle={bedSummary(bedroom.beds)}
                onClick={() => openBedroom(bedroom)}
                onRemove={() => deleteBedroom(bedroom.id)}
              />
            ))}
          </div>
          <button type="button" onClick={addBedroom} className="mt-5 text-sm font-semibold text-teal-700">+ Thêm phòng ngủ</button>
        </Panel>
        <Panel>
          <Counter label="Bao nhiêu khách có thể lưu trú?" value={details.guests} onChange={(guests) => setDetails({ ...details, guests })} min={1} />
          <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" />
            Không tính trẻ sơ sinh (0-2 tuổi) trong tổng số khách
          </label>
          <div className="mt-8">
            <Counter label="Có bao nhiêu phòng tắm?" value={details.bathrooms} onChange={(bathrooms) => setDetails({ ...details, bathrooms })} min={1} />
          </div>
        </Panel>
        <Panel>
          <RadioGroup label="Quý vị có tiếp đón trẻ em không?" value={details.children ? "yes" : "no"} options={[["yes", "Có"], ["no", "Không"]]} onChange={(value) => setDetails({ ...details, children: value === "yes" })} />
          <div className="mt-7">
            <RadioGroup label="Quý vị có cung cấp nôi (cũi) không?" hint="Nôi (cũi) phù hợp cho trẻ sơ sinh từ 0-3 tuổi và có thể được cung cấp theo yêu cầu của khách." value={details.cribs ? "yes" : "no"} options={[["yes", "Có"], ["no", "Không"]]} onChange={(value) => setDetails({ ...details, cribs: value === "yes" })} />
          </div>
        </Panel>
        <Panel>
          <Field label="Căn hộ này rộng bao nhiêu?">
            <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
              <input value={details.size} onChange={(event) => setDetails({ ...details, size: event.target.value })} className={inputClass} inputMode="numeric" />
              <select className={inputClass} defaultValue="m2"><option value="m2">mét vuông</option></select>
            </div>
          </Field>
        </Panel>
      </div>
      <WizardActions onBack={onBack} canContinue={canContinue} />
    </form>
  );
}

function AmenitiesStep({ amenities, toggleAmenity, onBack, onSubmit, canContinue }: { amenities: string[]; toggleAmenity: (item: string) => void; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; canContinue: boolean }) {
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Khách có thể sử dụng gì tại chỗ nghỉ?</h1>
      <Panel className="mt-7">
        {amenitySections.map((section, index) => (
          <div key={section.title} className={index > 0 ? "mt-8 border-t border-slate-200 pt-8" : ""}>
            <p className="font-semibold text-slate-950">{section.title}</p>
            <div className="mt-4 grid gap-3">
              {section.items.map((item) => <CheckRow key={item} label={item} checked={amenities.includes(item)} onChange={() => toggleAmenity(item)} />)}
            </div>
          </div>
        ))}
      </Panel>
      <WizardActions onBack={onBack} canContinue={canContinue} />
    </form>
  );
}

function ServicesStep({ services, setServices, onBack, onSubmit }: { services: { breakfast: string; parking: string }; setServices: (value: { breakfast: string; parking: string }) => void; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Dịch vụ tại chỗ nghỉ</h1>
      <div className="mt-7 space-y-6">
        <Panel>
          <h2 className="text-2xl font-semibold text-slate-950">Bữa sáng</h2>
          <div className="my-6 border-t border-slate-200" />
          <RadioGroup label="Quý vị có phục vụ bữa sáng cho khách không?" value={services.breakfast} options={[["yes", "Có"], ["no", "Không"]]} onChange={(breakfast) => setServices({ ...services, breakfast })} />
        </Panel>
        <Panel>
          <h2 className="text-2xl font-semibold text-slate-950">Chỗ đậu xe</h2>
          <div className="my-6 border-t border-slate-200" />
          <RadioGroup label="Quý vị có chỗ đậu xe cho khách không?" value={services.parking} options={[["free", "Có, miễn phí"], ["paid", "Có, tính phí"], ["no", "Không"]]} onChange={(parking) => setServices({ ...services, parking })} />
        </Panel>
      </div>
      <WizardActions onBack={onBack} canContinue />
    </form>
  );
}

function LanguagesStep({ languages, toggleLanguage, onBack, onSubmit, canContinue }: { languages: string[]; toggleLanguage: (item: string) => void; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; canContinue: boolean }) {
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Quý vị hoặc nhân viên của mình sử dụng ngôn ngữ nào?</h1>
      <Panel className="mt-7 min-h-[520px]">
        <p className="font-semibold text-slate-950">Chọn ngôn ngữ</p>
        <div className="mt-4 grid gap-3">
          {languageOptions.map((item) => <CheckRow key={item} label={item} checked={languages.includes(item)} onChange={() => toggleLanguage(item)} />)}
        </div>
        <div className="mt-8 border-t border-slate-200 pt-7">
          <button type="button" className="text-sm font-semibold text-teal-700">Thêm các ngôn ngữ khác</button>
        </div>
      </Panel>
      <WizardActions onBack={onBack} canContinue={canContinue} />
    </form>
  );
}

function RulesStep({ rules, setRules, onBack, onSubmit }: { rules: { smoking: boolean; parties: boolean; pets: string; checkInFrom: string; checkInTo: string; checkOutFrom: string; checkOutTo: string }; setRules: (value: { smoking: boolean; parties: boolean; pets: string; checkInFrom: string; checkInTo: string; checkOutFrom: string; checkOutTo: string }) => void; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Quy định chung</h1>
        <Panel className="mt-7 min-h-[620px]">
          <ToggleRow label="Cho phép hút thuốc" checked={rules.smoking} onChange={(smoking) => setRules({ ...rules, smoking })} />
          <ToggleRow label="Cho phép tiệc tùng/sự kiện" checked={rules.parties} onChange={(parties) => setRules({ ...rules, parties })} />
          <div className="my-7 border-t border-slate-200" />
          <RadioGroup label="Quý vị có cho phép vật nuôi không?" value={rules.pets} options={[["yes", "Có"], ["request", "Theo yêu cầu"], ["no", "Không"]]} onChange={(pets) => setRules({ ...rules, pets })} />
          <div className="my-7 border-t border-slate-200" />
          <TimeRange title="Nhận phòng" from={rules.checkInFrom} to={rules.checkInTo} onFrom={(checkInFrom) => setRules({ ...rules, checkInFrom })} onTo={(checkInTo) => setRules({ ...rules, checkInTo })} />
          <div className="mt-7">
            <TimeRange title="Trả phòng" from={rules.checkOutFrom} to={rules.checkOutTo} onFrom={(checkOutFrom) => setRules({ ...rules, checkOutFrom })} onTo={(checkOutTo) => setRules({ ...rules, checkOutTo })} />
          </div>
        </Panel>
        <WizardActions onBack={onBack} canContinue />
      </div>
      <aside className="pt-[72px]">
        <InfoPanel title="Nếu quy tắc chung của chỗ nghỉ thay đổi thì sao?">Quý vị có thể dễ dàng tùy chỉnh các quy tắc chung này sau và các quy tắc chung bổ sung có thể được cài đặt trong trang chính sách trên extranet sau khi hoàn tất đăng ký.</InfoPanel>
      </aside>
    </form>
  );
}

function PhotosStep({ photos, setPhotos, onBack, onSubmit, canContinue }: { photos: PhotoItem[]; setPhotos: (photos: PhotoItem[]) => void; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; canContinue: boolean }) {
  const remainingPhotos = Math.max(0, 5 - photos.length);

  function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const validFiles = Array.from(files).filter((file) => {
      const isImage = ["image/jpeg", "image/jpg", "image/png"].includes(file.type);
      const isSmallEnough = file.size <= 47 * 1024 * 1024;
      return isImage && isSmallEnough;
    });

    const nextPhotos = validFiles.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}-${crypto.randomUUID()}`,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      isMain: photos.length === 0 && index === 0,
    }));

    setPhotos([...photos, ...nextPhotos]);
  }

  function removePhoto(id: string) {
    const removed = photos.find((photo) => photo.id === id);
    if (removed) URL.revokeObjectURL(removed.url);
    const nextPhotos = photos.filter((photo) => photo.id !== id);
    if (removed?.isMain && nextPhotos.length) {
      setPhotos(nextPhotos.map((photo, index) => ({ ...photo, isMain: index === 0 })));
      return;
    }
    setPhotos(nextPhotos);
  }

  function makeMain(id: string) {
    setPhotos(photos.map((photo) => ({ ...photo, isMain: photo.id === id })));
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Chỗ nghỉ của Quý vị trông như thế nào?</h1>
        <Panel className="mt-7">
          <p className="text-sm font-semibold text-slate-950">Đăng tải ít nhất 5 ảnh của chỗ nghỉ.</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">Càng đăng nhiều, Quý vị càng có cơ hội nhận đặt phòng. Quý vị có thể thêm ảnh sau.</p>
          <label className="mt-5 grid min-h-[118px] cursor-pointer place-items-center rounded-md border border-dashed border-slate-500 bg-white px-4 py-6 text-center transition hover:border-teal-600 hover:bg-teal-50">
            <span className="text-sm font-semibold text-slate-950">Kéo và thả hoặc</span>
            <span className="mt-3 inline-flex rounded-md border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700">Đăng tải ảnh</span>
            <span className="mt-3 text-xs text-slate-500">jpg/jpeg hoặc png, tối đa 47MB mỗi file</span>
            <input type="file" accept="image/jpeg,image/jpg,image/png" multiple className="sr-only" onChange={(event) => {
              addPhotos(event.target.files);
              event.currentTarget.value = "";
            }} />
          </label>

          {photos.length ? (
            <>
              <div className="my-7 border-t border-slate-200" />
              <p className="text-sm text-slate-700">Hãy chọn một <span className="font-semibold">ảnh chính</span> để tạo ấn tượng đầu tiên thật tốt.</p>
              <p className="mt-2 text-sm text-slate-600">Nhấn vào ảnh để đặt làm ảnh chính. Dùng nút xóa để bỏ ảnh không phù hợp.</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className={`relative aspect-[4/3] overflow-hidden rounded-md border-2 bg-slate-100 ${photo.isMain ? "border-amber-500" : "border-slate-200"}`}>
                    {photo.isMain ? <span className="absolute left-2 top-0 z-10 rounded-b bg-amber-500 px-2 py-1 text-xs font-semibold text-white">Ảnh chính</span> : null}
                    <button type="button" onClick={() => makeMain(photo.id)} className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${photo.url})` }} aria-label={`Đặt ${photo.name} làm ảnh chính`} />
                    <button type="button" onClick={() => removePhoto(photo.id)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-lg font-semibold text-slate-700 shadow-md transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Xóa ${photo.name}`}>×</button>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </Panel>
        <p className="mt-5 text-sm text-slate-700">
          {remainingPhotos > 0 ? `Đăng tải thêm ít nhất ${remainingPhotos} ảnh nữa để tiếp tục` : "Đã đủ số ảnh tối thiểu để tiếp tục"}
        </p>
        <WizardActions onBack={onBack} canContinue={canContinue} />
      </div>
      <aside className="pt-[72px]">
        <InfoPanel title="Nếu tôi không có ảnh chụp chuyên nghiệp thì sao?">
          Không sao cả. Quý vị có thể sử dụng smartphone hoặc máy ảnh kỹ thuật số. Sau đây là một số mẹo chụp ảnh đẹp cho chỗ nghỉ của Quý vị.
          <br />
          <br />
          Tốt nhất Quý vị nên tránh sử dụng ảnh mà mình không biết tác giả. Quý vị chỉ nên sử dụng ảnh của người khác khi đã có sự chấp thuận của họ.
        </InfoPanel>
      </aside>
    </form>
  );
}

function BookingMethodStep({ bookingMethod, setBookingMethod, onBack, onSubmit }: { bookingMethod: string; setBookingMethod: (value: string) => void; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-5xl">
      <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Cách thức nhận đơn đặt phòng</h1>
      <Panel className="mt-8">
        <p className="text-xl font-semibold text-slate-950">Để đảm bảo nhận đặt phòng một cách an toàn hơn, Quý vị có thể:</p>
        <div className="mt-7 grid gap-5 text-lg leading-8 text-slate-800">
          {[
            "Thiết lập quy tắc chung để khách chấp thuận trước khi lưu trú",
            "Yêu cầu đặt cọc đề phòng hư hại để có thêm lớp đảm bảo",
            "Báo cáo hành vi sai phạm của khách khi có vấn đề xảy ra",
            "Được bảo vệ trước các yêu cầu bồi thường liên quan đến trách nhiệm từ khách và cư dân xung quanh lên đến US$1,000,000 cho mỗi đơn đặt",
          ].map((item) => (
            <div key={item} className="grid grid-cols-[24px_1fr] gap-4">
              <span className="text-teal-700">✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="mt-8">
        <p className="text-xl font-semibold text-slate-950">Khách có thể đặt căn hộ của Quý vị theo cách nào?</p>
        <div className="mt-6 grid gap-4">
          <label className="flex items-center gap-4 text-lg text-slate-900">
            <input type="radio" checked={bookingMethod === "instant"} onChange={() => setBookingMethod("instant")} className="h-7 w-7 accent-teal-700" />
            <span>Tất cả khách có thể đặt phòng ngay lập tức</span>
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-sm font-semibold text-emerald-700">Được đề xuất</span>
          </label>
          <label className="flex items-center gap-4 text-lg text-slate-900">
            <input type="radio" checked={bookingMethod === "request"} onChange={() => setBookingMethod("request")} className="h-7 w-7 accent-teal-700" />
            <span>Tất cả khách cần gửi yêu cầu đặt phòng</span>
          </label>
        </div>
      </Panel>
      <WizardActions onBack={onBack} canContinue />
    </form>
  );
}

function NightlyPriceStep({ price, setPrice, launchDiscount, setLaunchDiscount, onBack, onSubmit, canContinue }: { price: string; setPrice: (value: string) => void; launchDiscount: boolean; setLaunchDiscount: (value: boolean) => void; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; canContinue: boolean }) {
  const numericPrice = Number(price) || 0;
  const hostRevenue = Math.max(0, numericPrice * 0.85);
  const discountedPrice = Math.max(0, numericPrice * 0.8);

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Giá mỗi đêm</h1>
        <Panel className="mt-7">
          <p className="text-lg font-semibold text-slate-950">Đưa ra giá cạnh tranh để tăng khả năng nhận thêm đặt phòng.</p>
          <p className="mt-3 text-sm text-slate-600">Đây là khoảng giá của các chỗ nghỉ tương tự với Quý vị. <span className="font-semibold text-teal-700">Tìm hiểu thêm</span></p>
          <div className="mt-7 px-3">
            <div className="relative h-2 rounded-full bg-teal-100">
              <div className="absolute left-[18%] right-[18%] top-0 h-2 rounded-full bg-teal-300" />
              <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-teal-700" />
              <span className="absolute left-1/2 top-[-42px] -translate-x-1/2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white">Mức giá ở giữa: VND 280.113</span>
              <span className="absolute left-[18%] top-5 -translate-x-1/2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white">VND 35.540</span>
              <span className="absolute right-[18%] top-5 translate-x-1/2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white">VND 494.115</span>
            </div>
          </div>
          <div className="mt-16 border-t border-slate-200 pt-5 text-sm text-slate-700">Thông tin này có giúp Quý vị quyết định mức giá không? <span className="ml-2 text-lg">♡ ♧</span></div>
        </Panel>

        <Panel className="mt-7">
          <p className="text-lg font-semibold text-slate-950">Quý vị muốn thu bao nhiêu tiền mỗi đêm?</p>
          <label className="mt-5 grid gap-2 text-sm font-medium text-slate-900">
            Số tiền khách trả
            <div className="flex rounded-md border border-slate-400 bg-white focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-100">
              <span className="border-r border-slate-300 px-4 py-3 text-slate-600">VND</span>
              <input value={price} onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))} className="min-w-0 flex-1 px-4 py-3 outline-none" inputMode="numeric" />
            </div>
          </label>
          <p className="mt-3 text-sm text-slate-600">Bao gồm các loại thuế, phí và hoa hồng</p>
          <div className="mt-7 grid gap-4 text-sm text-slate-700">
            <p><span className="font-semibold">{formatVnd(numericPrice * 0.15)}</span> Hoa hồng cho Booking.com</p>
            <p className="pl-8 text-emerald-700">✓ Trợ giúp 24/7 bằng ngôn ngữ của Quý vị</p>
            <p className="pl-8 text-emerald-700">✓ Tiết kiệm thời gian với đặt phòng được xác nhận tự động</p>
            <p className="pl-8 text-emerald-700">✓ Chúng tôi sẽ quảng bá chỗ nghỉ của Quý vị trên Google</p>
          </div>
          <div className="mt-7 border-t border-slate-200 pt-5 text-base text-slate-900">
            <span className="font-semibold">{formatVnd(hostRevenue)}</span> Doanh thu của Quý vị (bao gồm thuế)
          </div>
        </Panel>

        <Panel className="mt-7">
          <label className="flex items-center gap-3 text-lg font-semibold text-slate-950">
            <input type="checkbox" checked={launchDiscount} onChange={(event) => setLaunchDiscount(event.target.checked)} className="h-5 w-5 accent-teal-700" />
            Thu hút khách bằng giảm giá 20%
          </label>
          <p className="mt-6 text-sm leading-6 text-slate-700">Giảm 20% cho 3 đơn đặt đầu tiên hoặc trong 90 ngày, tùy trường hợp nào đến trước. <span className="font-semibold text-teal-700">Tìm hiểu thêm</span></p>
          <div className="mt-5 border-t border-slate-200 pt-5 text-lg">
            <span className="text-slate-500 line-through">{formatVnd(numericPrice)}</span>
            <span className="ml-2 font-semibold text-emerald-700">{formatVnd(launchDiscount ? discountedPrice : numericPrice)}/đêm</span>
          </div>
        </Panel>

        <WizardActions onBack={onBack} canContinue={canContinue} />
      </div>
      <aside className="space-y-7 pt-[64px]">
        <InfoPanel title="Nếu tôi cảm thấy chưa chắc chắn về giá thì sao?">
          Đừng lo lắng, Quý vị có thể đổi lại bất cứ lúc nào. Thậm chí Quý vị có thể thiết lập giá cuối tuần, giữa tuần và theo mùa, nhờ đó giúp Quý vị kiểm soát doanh thu tốt hơn.
        </InfoPanel>
        <InfoPanel title="Quy tắc thiết lập chương trình khuyến mãi">
          Hãy đảm bảo rằng Quý vị cung cấp giảm giá đúng nghĩa cho khách hàng. Theo các quy định bảo vệ người tiêu dùng, chương trình khuyến mãi được Quý vị thiết lập trên Booking.com phải thực sự mang lại giảm giá đúng nghĩa cho khách hàng.
        </InfoPanel>
      </aside>
    </form>
  );
}

function RatePlansStep({
  price,
  cancellationDays,
  setCancellationDays,
  mistakeProtection,
  setMistakeProtection,
  groupPricing,
  setGroupPricing,
  childPricing,
  setChildPricing,
  nonRefundableRate,
  setNonRefundableRate,
  weeklyRate,
  setWeeklyRate,
  onBack,
  onSubmit,
}: {
  price: number;
  cancellationDays: number;
  setCancellationDays: (value: number) => void;
  mistakeProtection: boolean;
  setMistakeProtection: (value: boolean) => void;
  groupPricing: { enabled: boolean; oneGuestDiscount: number };
  setGroupPricing: (value: { enabled: boolean; oneGuestDiscount: number }) => void;
  childPricing: ChildPricingState;
  setChildPricing: (value: ChildPricingState) => void;
  nonRefundableRate: { enabled: boolean; discount: number };
  setNonRefundableRate: (value: { enabled: boolean; discount: number }) => void;
  weeklyRate: { enabled: boolean; discount: number };
  setWeeklyRate: (value: { enabled: boolean; discount: number }) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [editing, setEditing] = useState<"cancellation" | "group" | "children" | "non-refundable" | "weekly" | null>(null);
  const [childDraft, setChildDraft] = useState<ChildPricingState>(childPricing);
  const [nonRefundableDraft, setNonRefundableDraft] = useState(nonRefundableRate);
  const [weeklyDraft, setWeeklyDraft] = useState(weeklyRate);
  const oneGuestPrice = groupPricing.enabled ? price * (1 - groupPricing.oneGuestDiscount / 100) : price;

  if (editing === "cancellation") {
    return (
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Chính sách hủy đặt phòng</h1>
          <Panel className="mt-8 min-h-[560px]">
            <p className="text-xl leading-8 text-slate-950">Khách có thể <span className="font-semibold">hủy đặt phòng miễn phí</span> trước ngày nhận phòng bao nhiêu ngày?</p>
            <div className="relative mt-10 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 shadow-inner">
              <span className="absolute -top-9 left-0 rounded-md bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">Được đề xuất</span>
              {[1, 5, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setCancellationDays(days)}
                  className={`min-w-24 rounded-full px-5 py-3 text-base transition ${cancellationDays === days ? "bg-white font-semibold text-slate-950 shadow ring-2 ring-slate-400" : "text-slate-700 hover:bg-white/70"}`}
                >
                  {days} ngày
                </button>
              ))}
            </div>
            <p className="mt-9 max-w-2xl text-lg leading-8 text-slate-700">
              Khách thích sự linh hoạt, giá hủy miễn phí thường là giá được đặt nhiều nhất trên trang web của chúng tôi. Nhận đặt phòng đầu tiên của Quý vị sớm hơn bằng cách cho phép khách hủy muộn nhất {cancellationDays} ngày trước thời điểm nhận phòng.
            </p>
            <div className="mt-12">
              <p className="text-xl font-semibold text-slate-950">Bảo vệ khỏi đặt phòng do nhầm lẫn</p>
              <div className="mt-5 flex items-center gap-4">
                <button type="button" onClick={() => setMistakeProtection(!mistakeProtection)} className={`relative h-8 w-14 rounded-full transition ${mistakeProtection ? "bg-teal-700" : "bg-slate-400"}`}>
                  <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${mistakeProtection ? "left-7" : "left-1"}`} />
                </button>
                <span className="text-lg text-slate-800">{mistakeProtection ? "Bật" : "Tắt"}</span>
              </div>
              <p className="mt-5 text-base leading-7 text-slate-600">Để tránh việc Quý vị tốn thời gian xử lý các đặt phòng do nhầm lẫn, chúng tôi tự động miễn phí hủy cho các khách hủy trong vòng 24 giờ kể từ thời điểm đặt.</p>
            </div>
          </Panel>
          <RoomEditorActions onCancel={() => setEditing(null)} onSave={() => setEditing(null)} />
        </div>
        <aside className="pt-[72px]">
          <InfoPanel title="Tôi nên chọn chính sách nào?">Dù chọn chính sách nào bây giờ, Quý vị đều có thể dễ dàng cập nhật sau khi hoàn thành đăng ký.</InfoPanel>
        </aside>
      </section>
    );
  }

  if (editing === "group") {
    return (
      <section className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Giá theo cỡ nhóm</h1>
        <Panel className="mt-8">
          <p className="max-w-2xl text-base leading-7 text-slate-700">Cài đặt giá thấp hơn cho nhóm dưới 2 sẽ giúp chỗ nghỉ hấp dẫn hơn trong mắt khách đặt tiềm năng.</p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">Các giảm giá được khuyến nghị dựa trên dữ liệu từ các chỗ nghỉ tương tự với Quý vị. Những giảm giá này có thể được chỉnh sửa bất cứ lúc nào.</p>
          <div className="mt-6 flex items-center gap-4">
            <button type="button" onClick={() => setGroupPricing({ ...groupPricing, enabled: !groupPricing.enabled })} className={`relative h-8 w-14 rounded-full transition ${groupPricing.enabled ? "bg-teal-700" : "bg-slate-400"}`}>
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${groupPricing.enabled ? "left-7" : "left-1"}`} />
            </button>
            <span className="text-lg text-slate-800">{groupPricing.enabled ? "Đã bật" : "Đã tắt"}</span>
          </div>
          <div className="mt-8 overflow-hidden rounded-md border border-slate-200">
            <div className="grid grid-cols-3 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-800">
              <span>Số lượng khách</span>
              <span>Giảm giá</span>
              <span className="text-right">Khách thanh toán</span>
            </div>
            <div className="grid grid-cols-3 px-5 py-5 text-sm text-slate-800">
              <span>2 khách</span>
              <span>0%</span>
              <span className="text-right">{formatVnd(price)}</span>
            </div>
            <div className="grid grid-cols-3 items-center bg-slate-50 px-5 py-5 text-sm text-slate-800">
              <span>1 khách</span>
              <label className="flex w-24 overflow-hidden rounded-md border border-slate-400 bg-white">
                <input value={groupPricing.oneGuestDiscount} onChange={(event) => setGroupPricing({ ...groupPricing, oneGuestDiscount: Math.max(0, Math.min(99, Number(event.target.value) || 0)) })} className="min-w-0 flex-1 px-3 py-2 outline-none" inputMode="numeric" />
                <span className="border-l border-slate-300 px-3 py-2 text-slate-500">%</span>
              </label>
              <span className="text-right">{formatVnd(oneGuestPrice)}</span>
            </div>
          </div>
        </Panel>
        <RoomEditorActions onCancel={() => setEditing(null)} onSave={() => setEditing(null)} />
      </section>
    );
  }

  if (editing === "children") {
    const childAgeOptions = Array.from({ length: 15 }, (_, index) => index + 3);

    const saveChildrenPricing = () => {
      setChildPricing(childDraft);
      setEditing(null);
    };

    return (
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Giá trẻ em dành cho khách gia đình</h1>
          <Panel className="mt-8 min-h-[620px]">
            <p className="text-lg font-semibold text-slate-950">Trẻ sơ sinh và trẻ em được tính phí bao nhiêu?</p>
            <p className="mt-2 text-sm text-slate-600">Giá đề xuất dựa trên dữ liệu từ các chỗ nghỉ tương tự.</p>
            <div className="mt-5 flex items-center gap-4">
              <button type="button" onClick={() => setChildDraft({ ...childDraft, enabled: !childDraft.enabled })} className={`relative h-8 w-14 rounded-full transition ${childDraft.enabled ? "bg-teal-700" : "bg-slate-400"}`}>
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${childDraft.enabled ? "left-7" : "left-1"}`} />
              </button>
              <span className="text-base text-slate-800">Đã kích hoạt</span>
            </div>
            <div className="my-7 border-t border-slate-200" />

            <section>
              <h2 className="text-xl font-semibold text-slate-950">Trẻ sơ sinh (0 - 2 tuổi)</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Quý vị nên cho trẻ sơ sinh lưu trú miễn phí để có thể nhận thêm đặt phòng giá trị từ khách gia đình.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <select value={childDraft.infantMode} onChange={(event) => setChildDraft({ ...childDraft, infantMode: event.target.value as "free" | "fixed" })} className="rounded-md border border-slate-400 bg-white px-4 py-3 outline-none focus:border-teal-600">
                  <option value="free">Miễn phí</option>
                  <option value="fixed">Phí cố định</option>
                </select>
                {childDraft.infantMode === "fixed" ? (
                  <div className="flex rounded-md border border-slate-400 bg-white focus-within:border-teal-600">
                    <span className="border-r border-slate-300 px-4 py-3 text-slate-500">VND</span>
                    <input value={childDraft.infantPrice} onChange={(event) => setChildDraft({ ...childDraft, infantPrice: event.target.value.replace(/\D/g, "") })} className="min-w-0 px-4 py-3 outline-none" inputMode="numeric" />
                  </div>
                ) : null}
              </div>
            </section>

            <div className="my-7 border-t border-slate-200" />

            <section>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-950">Trẻ em</h2>
                <span className="text-sm text-teal-700">1 nhóm tuổi</span>
              </div>
              <div className="mt-5 grid gap-5">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-800">
                  <span>Từ 3 đến</span>
                  <select value={childDraft.childToAge} onChange={(event) => setChildDraft({ ...childDraft, childToAge: Number(event.target.value) })} className="rounded-md border border-slate-400 bg-white px-3 py-2 outline-none focus:border-teal-600">
                    {childAgeOptions.map((age) => <option key={age} value={age}>{age}</option>)}
                  </select>
                  <span>tuổi</span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <span className="text-sm text-slate-800">Lưu trú</span>
                  <select value={childDraft.childMode} onChange={(event) => setChildDraft({ ...childDraft, childMode: event.target.value as "free" | "fixed" })} className="rounded-md border border-slate-400 bg-white px-4 py-3 outline-none focus:border-teal-600">
                    <option value="free">Miễn phí</option>
                    <option value="fixed">Phí cố định</option>
                  </select>
                  {childDraft.childMode === "fixed" ? (
                    <div className="flex rounded-md border border-slate-400 bg-white focus-within:border-teal-600">
                      <span className="border-r border-slate-300 px-4 py-3 text-slate-500">VND</span>
                      <input value={childDraft.childPrice} onChange={(event) => setChildDraft({ ...childDraft, childPrice: event.target.value.replace(/\D/g, "") })} className="min-w-0 px-4 py-3 outline-none" inputMode="numeric" />
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          </Panel>
          <RoomEditorActions onCancel={() => {
            setChildDraft(childPricing);
            setEditing(null);
          }} onSave={saveChildrenPricing} />
        </div>
        <aside className="pt-[72px]">
          <InfoPanel title="Quý vị có thể cập nhật cài đặt bất cứ lúc nào">Quý vị có thể chỉnh sửa hoặc cập nhật bất kỳ cài đặt nào trong số này trong tương lai.</InfoPanel>
        </aside>
      </section>
    );
  }

  if (editing === "non-refundable") {
    const nonRefundablePrice = price * (1 - nonRefundableDraft.discount / 100);

    const updateDiscount = (value: number) => {
      setNonRefundableDraft({ ...nonRefundableDraft, discount: Math.max(0, Math.min(99, value)) });
    };

    return (
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Thiết lập loại giá không hoàn tiền</h1>
          <Panel className="mt-8 min-h-[620px]">
            <p className="max-w-2xl text-base leading-7 text-slate-800">Ngoài loại giá tiêu chuẩn Quý vị đã tạo cho chỗ nghỉ, Quý vị có thể thêm loại giá không hoàn tiền.</p>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-800">Với việc này, Quý vị thiết lập giảm giá nhưng <span className="font-semibold">doanh thu của Quý vị cho các đặt phòng này lại được đảm bảo</span> vì khách sẽ không được hoàn tiền nếu họ hủy hoặc vắng mặt.</p>
            <div className="mt-8 flex items-center gap-4">
              <button type="button" onClick={() => setNonRefundableDraft({ ...nonRefundableDraft, enabled: !nonRefundableDraft.enabled })} className={`relative h-8 w-14 rounded-full transition ${nonRefundableDraft.enabled ? "bg-teal-700" : "bg-slate-400"}`}>
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${nonRefundableDraft.enabled ? "left-7" : "left-1"}`} />
              </button>
              <span className="text-lg text-slate-800">Thiết lập loại giá không hoàn tiền</span>
            </div>
            <div className="my-8 border-t border-slate-200" />
            <label className="grid gap-2 text-base font-semibold text-slate-950">
              Giảm giá cho khách đặt với loại giá này:
              <div className="grid grid-cols-[44px_1fr_44px_52px] overflow-hidden rounded-md border border-slate-500 bg-white focus-within:border-teal-600">
                <button type="button" onClick={() => updateDiscount(nonRefundableDraft.discount - 1)} className="border-r border-slate-300 text-xl text-teal-700 hover:bg-teal-50">−</button>
                <input value={nonRefundableDraft.discount} onChange={(event) => updateDiscount(Number(event.target.value) || 0)} className="min-w-0 px-4 py-3 outline-none" inputMode="numeric" />
                <button type="button" onClick={() => updateDiscount(nonRefundableDraft.discount + 1)} className="border-l border-slate-300 text-xl text-teal-700 hover:bg-teal-50">+</button>
                <span className="grid place-items-center border-l border-slate-300 text-slate-600">%</span>
              </div>
            </label>
            <div className="mt-8 grid gap-5 text-base">
              <div className="grid grid-cols-[150px_1fr] gap-5 text-slate-700">
                <span className="font-semibold">{formatVnd(price)}</span>
                <span>Giá cơ bản</span>
              </div>
              <div className="grid grid-cols-[150px_1fr] gap-5 text-slate-700">
                <span className="font-semibold">{nonRefundableDraft.discount}%</span>
                <span>Giảm giá khi khách đặt lựa chọn không hoàn tiền</span>
              </div>
              <div className="grid grid-cols-[150px_1fr] gap-5 bg-teal-50 px-4 py-4 text-slate-800">
                <span className="font-semibold">{formatVnd(nonRefundablePrice)}</span>
                <span>Giá không hoàn tiền</span>
              </div>
            </div>
            <p className="mt-9 grid grid-cols-[24px_1fr] gap-3 text-base leading-7 text-slate-700">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-slate-700 text-xs">!</span>
              <span>Những khách chọn mức giá không hoàn tiền thường muốn tìm mức giá cạnh tranh. Giảm giá ít nhất 10% sẽ thu hút nhiều khách hơn bằng cách cải thiện mức độ hiển thị của chỗ nghỉ.</span>
            </p>
          </Panel>
          <RoomEditorActions onCancel={() => {
            setNonRefundableDraft(nonRefundableRate);
            setEditing(null);
          }} onSave={() => {
            setNonRefundableRate(nonRefundableDraft);
            setEditing(null);
          }} />
        </div>
        <aside className="pt-[72px]">
          <InfoPanel title="Tại sao tôi cần thêm loại giá không hoàn tiền?">
            Loại giá không hoàn tiền có thể giúp thu hút những vị khách chắc chắn về ngày đi và không muốn mất thêm tiền cho sự linh hoạt mà họ không cần đến.
            <br />
            <br />
            Các chỗ nghỉ có giá không hoàn tiền ghi nhận trung bình: thêm 11% lượt xem, thêm 5% lượt đặt phòng và giảm 9% lượt hủy phòng.
          </InfoPanel>
        </aside>
      </section>
    );
  }

  if (editing === "weekly") {
    const weeklyBasePrice = price * 7;
    const weeklyDiscountedPrice = weeklyBasePrice * (1 - weeklyDraft.discount / 100);

    const updateWeeklyDiscount = (value: number) => {
      setWeeklyDraft({ ...weeklyDraft, discount: Math.max(0, Math.min(99, value)) });
    };

    return (
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Thiết lập giá theo tuần</h1>
          <Panel className="mt-8 min-h-[620px]">
            <p className="max-w-2xl text-base leading-7 text-slate-800">Ngoài loại giá tiêu chuẩn Quý vị đã tạo cho chỗ nghỉ, Quý vị có thể thêm loại giá theo tuần.</p>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-800">Với loại giá này, Quý vị có thể cài đặt giá thấp hơn trong khi vẫn sử dụng cùng chính sách hủy với loại giá tiêu chuẩn. Khách lưu trú ít nhất 1 tuần rất quan tâm đến giảm giá vì họ sẽ chi nhiều hơn cho đặt phòng của mình.</p>
            <div className="mt-8 flex items-center gap-4">
              <button type="button" onClick={() => setWeeklyDraft({ ...weeklyDraft, enabled: !weeklyDraft.enabled })} className={`relative h-8 w-14 rounded-full transition ${weeklyDraft.enabled ? "bg-teal-700" : "bg-slate-400"}`}>
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${weeklyDraft.enabled ? "left-7" : "left-1"}`} />
              </button>
              <span className="text-lg text-slate-800">Thiết lập loại giá theo tuần</span>
            </div>
            <div className="my-8 border-t border-slate-200" />
            <label className="grid gap-2 text-base font-semibold text-slate-950">
              Quý vị muốn loại giá này thấp hơn giá tiêu chuẩn bao nhiêu?
              <div className="grid grid-cols-[44px_1fr_44px_52px] overflow-hidden rounded-md border border-slate-500 bg-white focus-within:border-teal-600">
                <button type="button" onClick={() => updateWeeklyDiscount(weeklyDraft.discount - 1)} className="border-r border-slate-300 text-xl text-teal-700 hover:bg-teal-50">−</button>
                <input value={weeklyDraft.discount} onChange={(event) => updateWeeklyDiscount(Number(event.target.value) || 0)} className="min-w-0 px-4 py-3 outline-none" inputMode="numeric" />
                <button type="button" onClick={() => updateWeeklyDiscount(weeklyDraft.discount + 1)} className="border-l border-slate-300 text-xl text-teal-700 hover:bg-teal-50">+</button>
                <span className="grid place-items-center border-l border-slate-300 text-slate-600">%</span>
              </div>
            </label>
            <div className="mt-8 grid gap-5 text-base">
              <div className="grid grid-cols-[180px_1fr] gap-5 text-slate-700">
                <span className="font-semibold">{formatVnd(price)}</span>
                <span>Giá tiêu chuẩn mỗi đêm</span>
              </div>
              <div className="grid grid-cols-[180px_1fr] gap-5 text-slate-700">
                <span className="font-semibold">{formatVnd(weeklyBasePrice)}</span>
                <span>Giá tiêu chuẩn cho 7 đêm</span>
              </div>
              <div className="grid grid-cols-[180px_1fr] gap-5 text-slate-700">
                <span className="font-semibold">{weeklyDraft.discount}%</span>
                <span>Giảm giá khi khách đặt tối thiểu 7 đêm</span>
              </div>
              <div className="grid grid-cols-[180px_1fr] gap-5 bg-teal-50 px-4 py-4 text-slate-800">
                <span className="font-semibold">{formatVnd(weeklyDiscountedPrice)}</span>
                <span>Giá theo tuần sau giảm</span>
              </div>
            </div>
          </Panel>
          <RoomEditorActions onCancel={() => {
            setWeeklyDraft(weeklyRate);
            setEditing(null);
          }} onSave={() => {
            setWeeklyRate(weeklyDraft);
            setEditing(null);
          }} />
        </div>
        <aside className="pt-[72px]">
          <InfoPanel title="Tại sao tôi cần thêm loại giá theo tuần?">
            Loại giá theo tuần có thể giúp Quý vị thu hút nhiều loại khách, từ khách đi công tác đến các gia đình, những người tìm kiếm mức giá cạnh tranh.
            <br />
            <br />
            Các chỗ nghỉ có giá theo tuần ghi nhận trung bình: thêm 5% lượt xem, thêm 15% lượt đặt phòng và thêm 37% lượng khách đặt từ 1 tuần trở lên.
          </InfoPanel>
        </aside>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-4xl">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Loại giá</h1>
      <Panel className="mt-7">
        <p className="text-sm leading-6 text-slate-700">Để thu hút nhiều đối tượng khách hơn, chúng tôi đề xuất Quý vị nên thiết lập nhiều loại giá. Các mức giá và chính sách đề xuất cho mỗi loại giá được dựa trên dữ liệu từ các chỗ nghỉ tương tự với Quý vị. Tuy nhiên, Quý vị có thể chỉnh sửa các chi tiết này ngay bây giờ hoặc bất kỳ lúc nào trong tương lai.</p>
      </Panel>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-slate-950">Loại giá tiêu chuẩn</h2>
        <RatePlanCard title="Chính sách hủy" onEdit={() => setEditing("cancellation")}>
          <PlanLine>Khách có thể hủy miễn phí đến {cancellationDays} ngày trước khi đến.</PlanLine>
          <PlanLine>Khách hủy trong vòng 24 giờ sẽ được miễn phí hủy.</PlanLine>
        </RatePlanCard>
        <RatePlanCard title="Giá theo cỡ nhóm" onEdit={() => setEditing("group")}>
          <p className="mb-4 text-sm text-slate-600">Đặt mức giá thấp hơn cho nhóm khách ít hơn để thu hút thêm đặt phòng.</p>
          <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700">
            <span>Số lượng khách</span>
            <span>Khách thanh toán</span>
            <span />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-4 text-sm text-slate-700">
            <span>2 khách</span>
            <span>{formatVnd(price)}</span>
            <span />
            <span>1 khách</span>
            <span>{formatVnd(oneGuestPrice)}</span>
            <span />
          </div>
        </RatePlanCard>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-slate-950">Giá trẻ em dành cho khách gia đình</h2>
        <RatePlanCard title="Giá và nhóm tuổi" onEdit={() => {
          setChildDraft(childPricing);
          setEditing("children");
        }}>
          <p className="text-sm leading-6 text-slate-700">Lượng đặt phòng từ khách gia đình có thể tăng 15% nếu Quý vị thiết lập giá trẻ em cạnh tranh.</p>
          <p className="mt-4 text-sm font-semibold text-emerald-700">Một thay hiệu đặc biệt sẽ nêu bật chỗ nghỉ của Quý vị.</p>
          {childPricingSummary(childPricing).map((line) => <PlanLine key={line}>{line}</PlanLine>)}
        </RatePlanCard>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-slate-950">Loại giá không hoàn tiền</h2>
        <RatePlanCard title="Giá và chính sách hủy" onEdit={() => {
          setNonRefundableDraft(nonRefundableRate);
          setEditing("non-refundable");
        }}>
          <PlanLine>Với giá không hoàn tiền, khách trả ít hơn {nonRefundableRate.discount}% nếu bị hủy.</PlanLine>
          <PlanLine>Khách không thể hủy đặt phòng miễn phí với bất kỳ lý do nào.</PlanLine>
          <PlanLine>Giá không hoàn tiền hiện tại là {formatVnd(price * (1 - nonRefundableRate.discount / 100))}.</PlanLine>
        </RatePlanCard>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-slate-950">Loại giá theo tuần</h2>
        <RatePlanCard title="Giá và chính sách hủy" onEdit={() => {
          setWeeklyDraft(weeklyRate);
          setEditing("weekly");
        }}>
          <p className="mb-4 text-sm leading-6 text-emerald-700">Khi cài đặt giảm giá {weeklyRate.discount}% mặc định, Quý vị sẽ tăng thêm 16% cơ hội nhận đặt phòng so với không cài đặt này.</p>
          <PlanLine>Khách sẽ trả ít hơn {weeklyRate.discount}% so với giá tiêu chuẩn khi đặt tối thiểu 7 đêm.</PlanLine>
          <PlanLine>Khách có thể hủy đặt phòng miễn phí chậm nhất 1 ngày trước khi đến.</PlanLine>
          <PlanLine>Giá theo tuần hiện tại là {formatVnd(price * 7 * (1 - weeklyRate.discount / 100))}.</PlanLine>
        </RatePlanCard>
      </section>

      <WizardActions onBack={onBack} canContinue />
    </form>
  );
}

function AvailabilityStep({ availability, setAvailability, onBack, onSubmit }: { availability: { firstBookableDate: string; openWindow: number; longStayAllowed: boolean; maxStayNights: number }; setAvailability: (value: { firstBookableDate: string; openWindow: number; longStayAllowed: boolean; maxStayNights: number }) => void; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Tình trạng phòng trống</h1>
        <Panel className="mt-7">
          <p className="font-semibold text-slate-950">Ngày đầu tiên mà khách có thể nhận phòng là khi nào?</p>
          <div className="mt-5 flex flex-wrap gap-6 text-sm text-slate-800">
            <label className="flex items-center gap-2">
              <input type="radio" checked={availability.firstBookableDate === "soon"} onChange={() => setAvailability({ ...availability, firstBookableDate: "soon" })} className="accent-teal-700" />
              Càng sớm càng tốt
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={availability.firstBookableDate === "specific"} onChange={() => setAvailability({ ...availability, firstBookableDate: "specific" })} className="accent-teal-700" />
              Vào một ngày cụ thể
            </label>
          </div>
          <div className="my-6 border-t border-slate-200" />
          <div className="grid gap-6 md:grid-cols-2">
            <MiniCalendar title="Tháng 5 2026" activeDay={20} />
            <MiniCalendar title="Tháng 6 2026" />
          </div>
          <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">
            Khách có thể bắt đầu đặt phòng ngay, nhưng ngày nhận phòng đầu tiên là từ ngày 20 tháng 5, 2026.
          </div>
        </Panel>

        <Panel className="mt-7">
          <p className="font-semibold text-slate-950">Quý vị muốn mở ngày để nhận đặt phòng ra sao?</p>
          <div className="mt-5 grid gap-4 text-sm text-slate-800">
            <label className="flex items-center gap-2">
              <input type="radio" checked className="accent-teal-700" readOnly />
              Liên tục mở phòng
            </label>
            <select value={availability.openWindow} onChange={(event) => setAvailability({ ...availability, openWindow: Number(event.target.value) })} className="max-w-xs rounded-md border border-slate-400 bg-white px-4 py-3 outline-none focus:border-teal-600">
              {[365, 180, 90, 60].map((days) => <option key={days} value={days}>{days} ngày</option>)}
            </select>
          </div>
        </Panel>

        <Panel className="mt-7">
          <p className="font-semibold text-slate-950">Quý vị có muốn cho phép khách lưu trú trên 30 đêm không?</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">Cho phép khách lưu trú trên 30 đêm có thể giúp Quý vị lấp phòng và tìm kiếm xu hướng làm việc từ xa của khách.</p>
          <div className="mt-5 grid gap-3 text-sm text-slate-800">
            <label className="flex items-center gap-2">
              <input type="radio" checked={availability.longStayAllowed} onChange={() => setAvailability({ ...availability, longStayAllowed: true })} className="accent-teal-700" />
              Có
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={!availability.longStayAllowed} onChange={() => setAvailability({ ...availability, longStayAllowed: false })} className="accent-teal-700" />
              Không
            </label>
          </div>
          {availability.longStayAllowed ? (
            <label className="mt-5 grid max-w-xs gap-2 text-sm font-semibold text-slate-950">
              Quý vị cho phép khách đặt tối đa bao nhiêu đêm?
              <select value={availability.maxStayNights} onChange={(event) => setAvailability({ ...availability, maxStayNights: Number(event.target.value) })} className="rounded-md border border-slate-400 bg-white px-4 py-3 outline-none focus:border-teal-600">
                {[30, 45, 60].map((days) => <option key={days} value={days}>{days}</option>)}
              </select>
            </label>
          ) : null}
        </Panel>
        <WizardActions onBack={onBack} canContinue />
      </div>
      <aside className="space-y-6 pt-[72px]">
        <InfoPanel title="Đồng bộ ngày để được đặt phòng nhanh hơn">Quý vị có thể điều chỉnh ngày đặt phòng bất cứ lúc nào. Các lựa chọn ở đây giúp lịch mở phòng dễ kiểm soát ngay từ đầu.</InfoPanel>
        <InfoPanel title="Nếu sau này tôi muốn thay đổi lựa chọn của mình thì sao?">Quý vị có thể thay đổi bất kỳ cài đặt nào trong phần lịch sau khi đăng kí xong.</InfoPanel>
      </aside>
    </form>
  );
}

function LegalStep({
  legalType,
  setLegalType,
  owners,
  setOwners,
  ownerAlias,
  setOwnerAlias,
  submitted,
  setSubmitted,
  onBack,
  onSubmit,
  canContinue,
}: {
  legalType: string;
  setLegalType: (value: string) => void;
  owners: OwnerInfo[];
  setOwners: (value: OwnerInfo[]) => void;
  ownerAlias: string;
  setOwnerAlias: (value: string) => void;
  submitted: boolean;
  setSubmitted: (value: boolean) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  canContinue: boolean;
}) {
  function addOwner() {
    if (owners.length >= 4) return;
    const nextId = owners.reduce((max, owner) => Math.max(max, owner.id), 0) + 1;
    setOwners([...owners, { id: nextId, firstName: "", lastName: "", birthDate: "" }]);
  }

  function removeOwner(id: number) {
    if (owners.length <= 1) return;
    setOwners(owners.filter((owner) => owner.id !== id));
  }

  function updateOwner(id: number, patch: Partial<OwnerInfo>) {
    setOwners(owners.map((owner) => owner.id === id ? { ...owner, ...patch } : owner));
  }

  function submitLegal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!canContinue) return;
    onSubmit(event);
  }

  return (
    <form onSubmit={submitLegal} className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Xác minh đối tác</h1>
      <Panel className="mt-7">
        <p className="text-base leading-7 text-slate-800">Để tuân thủ các yêu cầu pháp lý và quy định khác nhau, chúng tôi cần thu thập và xác minh một số thông tin về Quý vị và chỗ nghỉ.</p>
        <label className="mt-5 grid gap-2 text-base font-semibold text-slate-950">
          Chỗ nghỉ được sở hữu bởi cá nhân hay pháp nhân doanh nghiệp?
          <select value={legalType} onChange={(event) => setLegalType(event.target.value)} className={inputClass}>
            <option value="individual">Tôi là cá nhân riêng lẻ tự điều hành việc kinh doanh của mình</option>
            <option value="business">Tôi là đại diện cho pháp nhân doanh nghiệp</option>
          </select>
        </label>
      </Panel>

      <Panel className="mt-7">
        <p className="text-base leading-7 text-slate-800">Vui lòng cung cấp tên đầy đủ và ngày sinh của tất cả cá nhân, những người sở hữu từ 25% trở lên của chỗ nghỉ.</p>
        <div className="mt-6 grid gap-8">
          {owners.map((owner, index) => (
            <section key={owner.id} className={index > 0 ? "border-t border-slate-200 pt-7" : ""}>
              {owners.length > 1 ? (
                <button type="button" onClick={() => removeOwner(owner.id)} className="mb-3 grid h-10 w-10 place-items-center rounded-full border border-slate-500 bg-white text-2xl text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600" aria-label={`Xóa chủ sở hữu ${index + 1}`}>
                  −
                </button>
              ) : null}
              <LegalField label="Tên" required value={owner.firstName} error={submitted && !owner.firstName.trim()} onChange={(value) => updateOwner(owner.id, { firstName: value })} />
              <LegalField label="Họ" required value={owner.lastName} error={submitted && !owner.lastName.trim()} onChange={(value) => updateOwner(owner.id, { lastName: value })} />
              <LegalField label="Ngày sinh" required type="date" value={owner.birthDate} error={submitted && !owner.birthDate.trim()} onChange={(value) => updateOwner(owner.id, { birthDate: value })} />
            </section>
          ))}
        </div>
        <button type="button" onClick={addOwner} disabled={owners.length >= 4} className="mt-6 inline-flex items-center gap-3 text-base font-semibold text-teal-700 transition hover:text-teal-800 disabled:cursor-not-allowed disabled:text-slate-400">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-current text-2xl leading-none">+</span>
          Thêm
        </button>
        <div className="mt-7">
          <label className="grid gap-2 text-base font-semibold text-slate-950">
            Nếu một chủ sở hữu nào đó có tên khác, vui lòng cung cấp chi tiết.
            <span className="text-sm font-normal text-slate-500">- không bắt buộc</span>
            <input value={ownerAlias} onChange={(event) => setOwnerAlias(event.target.value)} className={inputClass} />
          </label>
        </div>
      </Panel>
      <WizardActions onBack={onBack} canContinue />
    </form>
  );
}

function LegalField({ label, value, onChange, error, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; error: boolean; type?: string; required?: boolean }) {
  return (
    <label className="mt-4 grid gap-2 text-base font-semibold text-slate-950">
      <span>{label} {required ? <span className="text-rose-600">*</span> : null}</span>
      <div className="relative">
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-xl border bg-white px-4 py-3 pr-12 text-base text-slate-950 outline-none transition ${error ? "border-rose-600 ring-2 ring-rose-100" : "border-slate-300 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"}`} />
        {error ? <span className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-rose-600 text-lg font-semibold text-rose-600">!</span> : null}
      </div>
      {error ? <span className="text-sm font-normal text-rose-600">Mục bắt buộc</span> : null}
    </label>
  );
}

function MiniCalendar({ title, activeDay }: { title: string; activeDay?: number }) {
  const days = Array.from({ length: 35 }, (_, index) => index + 1);

  return (
    <div>
      <h2 className="text-center text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs text-slate-500">
        {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs">
        {days.map((day) => {
          const displayDay = day <= 31 ? day : "";
          const active = activeDay === displayDay;
          return (
            <span key={day} className={`grid h-8 place-items-center rounded-md ${active ? "bg-teal-700 font-semibold text-white" : "text-slate-600"}`}>
              {displayDay}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-teal-950/5 md:p-6 ${className}`}>{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-base font-semibold text-slate-950">{label}{children}</label>;
}

function bedTotal(beds: BedCounts) {
  return Object.values(beds).reduce((total, value) => total + value, 0);
}

function formatVnd(value: number) {
  return `VND${Math.round(value).toLocaleString("vi-VN")}`;
}

function childFeeLabel(mode: "free" | "fixed", price: string) {
  const numericPrice = Number(price) || 0;
  if (mode === "free" || numericPrice <= 0) return "được lưu trú miễn phí";
  return `được tính phí lưu trú ${formatVnd(numericPrice)}/đêm`;
}

function childPricingSummary(childPricing: ChildPricingState) {
  if (!childPricing.enabled) return ["Giá trẻ em chưa được kích hoạt"];

  const infantLabel = childFeeLabel(childPricing.infantMode, childPricing.infantPrice);
  const childLabel = childFeeLabel(childPricing.childMode, childPricing.childPrice);
  const lines: string[] = [];

  if (infantLabel === childLabel) {
    lines.push(`Trẻ em từ 0 đến ${childPricing.childToAge} tuổi ${infantLabel}`);
  } else {
    lines.push(`Trẻ em từ 0 đến 2 tuổi ${infantLabel}`);
    lines.push(`Trẻ em từ 3 đến ${childPricing.childToAge} tuổi ${childLabel}`);
  }

  if (childPricing.childToAge < 17) {
    lines.push(`Trẻ em từ ${childPricing.childToAge + 1} tuổi trở lên được tính giá người lớn`);
  }

  return lines;
}

function RatePlanCard({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <Panel className="mt-4">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="font-semibold text-slate-950">{title}</h3>
        <button type="button" onClick={onEdit} className="rounded-md border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50">Chỉnh sửa</button>
      </div>
      {children}
    </Panel>
  );
}

function PlanLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 grid grid-cols-[20px_1fr] gap-3 text-sm leading-6 text-slate-700">
      <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-700 text-xs">✓</span>
      <span>{children}</span>
    </p>
  );
}

function bedSummary(beds: BedCounts) {
  const total = bedTotal(beds);
  if (total === 1 && beds.double === 1) return "1 giường đôi";
  return `${total} giường`;
}

function RoomRow({ title, subtitle, onClick, onRemove }: { title: string; subtitle: string; onClick: () => void; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onClick} className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-4 text-left shadow-md shadow-slate-900/10 transition hover:border-teal-300 hover:bg-teal-50/50">
        <p className="font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </button>
      {onRemove ? (
        <button type="button" onClick={onRemove} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-400 bg-white text-xl text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600" aria-label={`Xóa ${title}`}>
          −
        </button>
      ) : null}
    </div>
  );
}

function BedCounterRow({ icon, title, subtitle, value, onChange }: { icon: string; title: string; subtitle?: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="grid grid-cols-[42px_1fr_auto] items-center gap-4">
      <div className="grid h-9 w-9 place-items-center text-2xl text-slate-400">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <MiniCounter value={value} onChange={onChange} />
    </div>
  );
}

function MiniCounter({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="inline-grid grid-cols-3 overflow-hidden rounded-md border border-slate-400 bg-white">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="h-10 w-12 text-lg font-semibold text-teal-700 hover:bg-teal-50">−</button>
      <span className="grid h-10 w-12 place-items-center border-x border-slate-300 text-sm font-semibold">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} className="h-10 w-12 text-lg font-semibold text-teal-700 hover:bg-teal-50">+</button>
    </div>
  );
}

function RoomEditorActions({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="mt-8 grid grid-cols-[88px_1fr] gap-3">
      <button type="button" onClick={onCancel} className="grid h-14 place-items-center rounded-md border border-teal-700 bg-white text-sm font-semibold text-teal-700 transition hover:bg-teal-50">
        ‹ Hủy
      </button>
      <button type="button" onClick={onSave} className="h-14 rounded-md bg-teal-700 px-6 text-base font-semibold text-white transition hover:bg-teal-800">
        Lưu
      </button>
    </div>
  );
}

function Counter({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (value: number) => void; min?: number }) {
  return (
    <div>
      <p className="font-semibold text-slate-950">{label}</p>
      <div className="mt-3 inline-grid grid-cols-3 overflow-hidden rounded-md border border-slate-400 bg-white">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="h-10 w-14 text-lg font-semibold text-teal-700 hover:bg-teal-50">−</button>
        <span className="grid h-10 w-14 place-items-center border-x border-slate-300 text-sm font-semibold">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} className="h-10 w-14 text-lg font-semibold text-teal-700 hover:bg-teal-50">+</button>
      </div>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex w-fit items-center gap-3 text-sm text-slate-800">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-5 w-5 rounded border-slate-400 accent-teal-700" />
      {label}
    </label>
  );
}

function RadioGroup({ label, hint, value, options, onChange }: { label: string; hint?: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return (
    <fieldset>
      <legend className="font-semibold text-slate-950">{label}</legend>
      {hint ? <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p> : null}
      <div className="mt-3 grid gap-2">
        {options.map(([optionValue, optionLabel]) => (
          <label key={optionValue} className="flex w-fit items-center gap-2 text-sm text-slate-800">
            <input type="radio" checked={value === optionValue} onChange={() => onChange(optionValue)} className="h-4 w-4 accent-teal-700" />
            {optionLabel}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <button type="button" onClick={() => onChange(!checked)} className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-teal-700" : "bg-slate-400"}`} aria-pressed={checked}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}

function TimeRange({ title, from, to, onFrom, onTo }: { title: string; from: string; to: string; onFrom: (value: string) => void; onTo: (value: string) => void }) {
  return (
    <div>
      <p className="font-semibold text-slate-950">{title}</p>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Field label="Từ"><select value={from} onChange={(event) => onFrom(event.target.value)} className={inputClass}>{timeOptions.map((time) => <option key={time}>{time}</option>)}</select></Field>
        <Field label="Đến"><select value={to} onChange={(event) => onTo(event.target.value)} className={inputClass}>{timeOptions.map((time) => <option key={time}>{time}</option>)}</select></Field>
      </div>
    </div>
  );
}

function WizardActions({ onBack, canContinue }: { onBack: () => void; canContinue: boolean }) {
  return (
    <div className="mt-8 grid grid-cols-[88px_1fr] gap-3">
      <button type="button" onClick={onBack} className="grid h-14 place-items-center rounded-md border border-teal-700 bg-white text-2xl text-teal-700 transition hover:bg-teal-50" aria-label="Quay lại">‹</button>
      <button type="submit" disabled={!canContinue} className="h-14 rounded-md bg-teal-700 px-6 text-base font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">Tiếp tục</button>
    </div>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-teal-950/5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold leading-7 text-slate-950">{title}</h2>
        <span className="text-slate-400">×</span>
      </div>
      <div className="mt-4 text-sm leading-6 text-slate-700">{children}</div>
    </section>
  );
}
