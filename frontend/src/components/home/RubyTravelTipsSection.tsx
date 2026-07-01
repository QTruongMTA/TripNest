import { SectionHeading } from "./SectionHeading";

type RubyTravelTipsResponse = {
  success: boolean;
  source: string;
  proxiedBy?: string;
  data?: {
    province: string;
    tips: string[];
  };
};

async function fetchRubyTravelTips(): Promise<RubyTravelTipsResponse | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
    const res = await fetch(`${apiUrl}/ruby-demo/travel-tips?province=Da%20Nang`, {
      cache: "no-store",
    });

    if (!res.ok) return null;

    return (await res.json()) as RubyTravelTipsResponse;
  } catch {
    return null;
  }
}

export async function RubyTravelTipsSection() {
  const rubyTips = await fetchRubyTravelTips();
  const tips = rubyTips?.data?.tips ?? [
    "Ruby API service chưa chạy. Hãy bật ruby-api ở port 4567 để xem dữ liệu thật.",
    "Chức năng này dùng để demo TripNest tích hợp thêm API viết bằng Ruby on Rails.",
  ];

  return (
    <section className="animate-fade-up mx-auto max-w-6xl px-5 md:px-6">
      <div className="overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-white via-teal-50 to-emerald-50 shadow-sm">
        <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div>
            <SectionHeading
              eyebrow="Ruby API demo"
              title="TripNest đang nhận dữ liệu từ Ruby on Rails"
              description="Section này gọi một service Rails độc lập để lấy gợi ý du lịch. Đây là minh chứng hệ thống có thể tích hợp thêm API viết bằng ngôn ngữ khác mà không cần viết lại backend chính."
            />

            <div className="inline-flex rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-700">
              Source: {rubyTips?.source ?? "ruby-on-rails-api offline"}
              {rubyTips?.proxiedBy ? ` qua ${rubyTips.proxiedBy}` : ""}
            </div>
          </div>

          <div className="rounded-xl border border-white/80 bg-white/85 p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Gợi ý cho {rubyTips?.data?.province ?? "Da Nang"}
            </p>
            <ul className="mt-4 space-y-3">
              {tips.map((tip) => (
                <li key={tip} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <span className="mt-2 h-2 w-2 rounded-full bg-teal-500" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
