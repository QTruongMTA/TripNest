export function Footer() {
  return (
    <footer className="border-t border-teal-950/10 bg-teal-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-6">
        <div>
          <p className="text-2xl font-semibold">TripNest</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
            Nền tảng đặt chỗ nghỉ dành cho những chuyến đi trong Việt Nam, từ biển xanh miền Trung đến phố cổ và cao nguyên.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">Khám phá</p>
          <div className="mt-4 space-y-3 text-sm text-white/80">
            <p>Điểm đến nổi bật</p>
            <p>Ưu đãi cuối tuần</p>
            <p>Chỗ nghỉ được yêu thích</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">Hỗ trợ</p>
          <div className="mt-4 space-y-3 text-sm text-white/80">
            <p>Trung tâm trợ giúp</p>
            <a href="/policies" className="block transition hover:text-white">Chính sách sử dụng</a>
            <p>Liên hệ TripNest</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">Dành cho chủ nhà</p>
          <div className="mt-4 space-y-3 text-sm text-white/80">
            <p>Đăng chỗ nghỉ</p>
            <p>Quản lý đặt phòng</p>
            <p>Mẹo tối ưu doanh thu</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
