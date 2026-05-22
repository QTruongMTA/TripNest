export function PromoBannerSection() {
  return (
    <section className="animate-fade-up mx-auto max-w-6xl px-5 md:px-6">
      <div className="card-lift grid overflow-hidden rounded-lg border border-slate-200 bg-white md:grid-cols-[1.1fr_0.9fr]">
        <div className="p-5 md:p-6">
          <p className="text-sm font-semibold text-teal-700">Khuyến mãi mùa hè</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Giảm đến 25% cho các kỳ nghỉ biển tại Việt Nam</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Đặt sớm tại Đà Nẵng, Nha Trang và Phú Quốc để nhận giá tốt hơn cho chuyến đi sắp tới.
          </p>
          <button className="mt-5 rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-950">
            Xem ưu đãi
          </button>
        </div>
        <div className="min-h-48 bg-[linear-gradient(135deg,_rgba(13,148,136,0.96),_rgba(15,118,110,0.85)),url('https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center" />
      </div>
    </section>
  );
}
