type PolicySection = {
  id: string;
  index: string;
  title: string;
  summary: string;
  points: string[];
  note?: string;
};

const policySections: PolicySection[] = [
  {
    id: "booking",
    index: "01",
    title: "Chính sách đặt phòng",
    summary: "Quy định về điều kiện tạo booking, giữ phòng và trách nhiệm giữa Traveler và Host.",
    points: [
      "Traveler cần cung cấp thông tin đặt phòng chính xác, bao gồm ngày lưu trú, số lượng khách và thông tin liên hệ.",
      "Người đại diện đặt phòng phải đủ tuổi theo quy định pháp luật hiện hành và chịu trách nhiệm cho nhóm khách đi cùng.",
      "Booking chỉ có hiệu lực sau khi được hệ thống hoặc Host xác nhận thành công.",
      "Thời hạn thanh toán và điều kiện giữ phòng được hiển thị trong quá trình đặt phòng.",
      "Số lượng khách không được vượt quá sức chứa đã công bố của chỗ ở.",
      "Traveler cần tuân thủ thời gian check-in, check-out và các quy định riêng của chỗ ở.",
      "Host có trách nhiệm giữ đúng phòng, giá, tiện nghi và điều kiện lưu trú đã công bố trên TripNest.",
    ],
  },
  {
    id: "payment",
    index: "02",
    title: "Chính sách thanh toán",
    summary: "Quy định về phương thức thanh toán, thời điểm xác nhận và xử lý giao dịch chưa hoàn tất.",
    points: [
      "Traveler có thể thanh toán trước 100%, thanh toán cọc 30% hoặc thanh toán trực tiếp tại chỗ ở tùy cấu hình của từng booking.",
      "TripNest hỗ trợ các hình thức thanh toán như VNPay, MoMo và VietQR khi được kích hoạt trong hệ thống.",
      "Booking thanh toán online chỉ được xác nhận sau khi giao dịch được ghi nhận thành công.",
      "Nếu thanh toán thất bại, booking có thể chưa được giữ phòng hoặc cần thực hiện lại thanh toán trong thời hạn hiển thị.",
      "Trường hợp thanh toán nhiều lần, thanh toán thiếu hoặc phát sinh sai lệch, TripNest sẽ đối soát giao dịch trước khi xác nhận trạng thái cuối cùng.",
      "Với thanh toán trực tiếp tại chỗ ở, Traveler thanh toán cho Host theo thỏa thuận hiển thị trong booking.",
    ],
    note: "TripNest không yêu cầu chuyển tiền ngoài các kênh được công bố trong hệ thống.",
  },
  {
    id: "cancellation-refund",
    index: "03",
    title: "Chính sách hủy và hoàn tiền",
    summary: "Cơ chế hủy phòng phụ thuộc phương thức thanh toán và điều kiện của booking tại thời điểm hủy.",
    points: [
      "Traveler có thể chủ động hủy booking trong khu vực quản lý đặt phòng.",
      "Việc hủy booking không cần Host xác nhận thủ công.",
      "Hệ thống tự động xác định mức hoàn tiền dựa trên phương thức thanh toán, thời điểm hủy và chính sách đã công bố.",
      "Booking thanh toán trước hoặc đặt cọc có thể phát sinh hoàn tiền hoặc phí hủy tùy điều kiện cụ thể.",
      "Yêu cầu hoàn tiền hợp lệ được TripNest xử lý trong vòng 24 giờ làm việc sau khi Admin xác nhận giao dịch.",
      "Trường hợp có tranh chấp, booking sẽ được chuyển cho Operator kiểm tra trước khi đưa ra quyết định hoàn tiền cuối cùng.",
    ],
  },
  {
    id: "settlement-payout",
    index: "04",
    title: "Chính sách quyết toán và thanh toán cho Host",
    summary: "Quy định về điều kiện đưa booking vào kỳ quyết toán và thời điểm thanh toán cho Host.",
    points: [
      "Chỉ các booking đã hoàn thành hoặc hủy có tính phí mới đủ điều kiện đối soát doanh thu.",
      "Booking đang tranh chấp sẽ chưa được quyết toán cho đến khi Operator xử lý xong.",
      "Booking đang chờ hoàn tiền sẽ chưa được đưa vào payout của Host.",
      "TripNest thực hiện settlement định kỳ và thanh toán cho Host theo chu kỳ đầu tháng.",
      "Khoản Host nhận được tính sau khi trừ hoa hồng, refund, phí hủy và các điều chỉnh phát sinh.",
      "Lịch sử payout được lưu lại để phục vụ kiểm toán và tra soát giao dịch.",
    ],
    note: "Settlement & Payout giúp cả Traveler, Host và TripNest theo dõi dòng tiền minh bạch.",
  },
  {
    id: "commission",
    index: "05",
    title: "Chính sách hoa hồng",
    summary: "TripNest thu hoa hồng trên booking hợp lệ trước khi thực hiện payout cho Host.",
    points: [
      "Tỷ lệ hoa hồng được cấu hình theo từng loại chỗ ở, chiến dịch hoặc thỏa thuận với Host.",
      "Hoa hồng được tính trên giá trị booking đủ điều kiện quyết toán.",
      "Các khoản refund, điều chỉnh hoặc tranh chấp có thể ảnh hưởng đến số tiền cuối cùng.",
      "Hoa hồng được trừ trước khi TripNest thanh toán phần còn lại cho Host.",
      "Ví dụ: Host có doanh thu 10.000.000 đ, hoa hồng 10%, Host nhận 9.000.000 đ trước các điều chỉnh khác nếu có.",
    ],
  },
  {
    id: "dispute",
    index: "06",
    title: "Chính sách tranh chấp",
    summary: "Operator tiếp nhận, kiểm tra và đưa ra hướng xử lý cho các tình huống bất thường.",
    points: [
      "Traveler có thể báo cáo khi phòng sai mô tả, không đúng hình ảnh, không nhận được phòng hoặc Host từ chối tiếp nhận.",
      "Host có thể báo cáo khi khách không đến, gây hư hỏng, vi phạm nội quy hoặc phát sinh hành vi không phù hợp.",
      "Operator tiếp nhận thông tin, kiểm tra bằng chứng và ghi nhận kết quả xử lý.",
      "Trong trường hợp cần thiết, Operator có thể đề xuất điều chỉnh refund, payout hoặc trạng thái booking.",
      "Các booking đang tranh chấp sẽ tạm dừng quyết toán cho đến khi có quyết định cuối cùng.",
    ],
  },
  {
    id: "review",
    index: "07",
    title: "Chính sách đánh giá",
    summary: "Đánh giá chỉ dành cho Traveler đã hoàn tất lưu trú và phản ánh trải nghiệm thực tế.",
    points: [
      "Sau checkout, Traveler có thể đánh giá, bình luận và bổ sung hình ảnh về chỗ ở.",
      "Review được chấm theo thang điểm 5 sao với nhiều tiêu chí như sạch sẽ, thoải mái, vị trí, tiện nghi và đáng giá tiền.",
      "Traveler có thể cập nhật đánh giá nếu muốn phản ánh lại trải nghiệm sau khi trao đổi với Host.",
      "Host có thể phản hồi đánh giá thông qua cuộc trò chuyện với Traveler.",
      "TripNest không cho phép spam, xúc phạm, thông tin sai sự thật hoặc đánh giá giả.",
      "Đánh giá dưới ngưỡng chất lượng có thể được gửi đến Operator để ghi nhận và xử lý.",
    ],
  },
  {
    id: "property",
    index: "08",
    title: "Chính sách quản lý chỗ ở",
    summary: "Host phải đăng tải thông tin chỗ ở trung thực, đầy đủ và đúng khả năng cung cấp.",
    points: [
      "Thông tin chỗ ở phải đúng về hình ảnh, địa chỉ, giá, tiện nghi, sức chứa và quy định lưu trú.",
      "Host không được đăng trùng, gian lận hoặc bán phòng không tồn tại.",
      "Host cần cập nhật lịch trống, giá và quy định hủy phòng kịp thời.",
      "Operator có quyền duyệt, khóa, yêu cầu chỉnh sửa hoặc tạm dừng chỗ ở khi phát hiện sai lệch.",
      "Chỗ ở vi phạm nghiêm trọng có thể bị giới hạn hiển thị hoặc khóa khỏi hệ thống.",
    ],
  },
  {
    id: "privacy",
    index: "09",
    title: "Chính sách bảo mật",
    summary: "TripNest thu thập và xử lý dữ liệu cần thiết để vận hành booking, thanh toán và hỗ trợ người dùng.",
    points: [
      "Dữ liệu có thể bao gồm họ tên, email, số điện thoại, thông tin tài khoản, thông tin thanh toán và thông tin xác minh khi cần thiết.",
      "TripNest có thể sử dụng cookie để duy trì phiên đăng nhập, cải thiện trải nghiệm và đo lường hiệu quả vận hành.",
      "Thông tin thanh toán được xử lý theo tiêu chuẩn bảo mật của đối tác thanh toán được tích hợp.",
      "Người dùng có quyền yêu cầu xem, chỉnh sửa hoặc cập nhật thông tin cá nhân trong phạm vi hệ thống hỗ trợ.",
      "TripNest không bán dữ liệu cá nhân của người dùng cho bên thứ ba.",
    ],
  },
  {
    id: "terms",
    index: "10",
    title: "Điều khoản sử dụng",
    summary: "Quy định quyền và nghĩa vụ của Traveler, Host, Operator và Admin khi sử dụng TripNest.",
    points: [
      "Traveler có quyền tìm kiếm, đặt phòng, thanh toán, hủy booking, đánh giá và gửi báo cáo theo quy định.",
      "Traveler có nghĩa vụ cung cấp thông tin chính xác, thanh toán đúng hạn và tuân thủ nội quy chỗ ở.",
      "Host có quyền đăng chỗ ở, quản lý booking, nhận payout và phản hồi đánh giá.",
      "Host có nghĩa vụ cung cấp dịch vụ đúng mô tả, hỗ trợ khách và phối hợp xử lý tranh chấp.",
      "Operator có quyền kiểm tra, duyệt, khóa, xử lý báo cáo và ghi nhận tranh chấp theo địa bàn phụ trách.",
      "Admin có quyền quản trị hệ thống, điều phối settlement, payout, refund, tài khoản và dữ liệu vận hành.",
      "Tài khoản có thể bị giới hạn hoặc khóa nếu gian lận, vi phạm chính sách, gây rủi ro cho người dùng hoặc làm sai lệch dữ liệu hệ thống.",
    ],
  },
];

const paymentRows = [
  ["Thanh toán trước 100%", "Xác nhận sau khi giao dịch thành công", "TripNest giữ tiền để đối soát"],
  ["Đặt cọc 30%", "Xác nhận sau khi ghi nhận cọc", "Phần còn lại thanh toán theo điều kiện booking"],
  ["Thanh toán tại chỗ ở", "Xác nhận theo cấu hình Host", "TripNest ghi nhận commission receivable"],
];

export default function PoliciesPage() {
  return (
    <main className="bg-[#f7fbfa]">
      <section className="relative overflow-hidden bg-[#083f3a] text-white">
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/15" />
        <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-12 pt-14 md:grid-cols-[minmax(0,1fr)_340px] md:px-6 md:pt-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-200">TripNest Policy Center</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
              Chính sách sử dụng TripNest
            </h1>
          </div>

          <div className="rounded-lg border border-white/15 bg-white/10 p-5 shadow-2xl shadow-teal-950/25 backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">Tổng quan vận hành</p>
            <div className="mt-5 space-y-3">
              {["Booking xác nhận", "Thanh toán hoặc giữ phòng", "Lưu trú hoàn tất", "Settlement", "Payout hoặc Refund"].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-md bg-white/10 px-3 py-3">
                  <span className="grid h-8 w-8 place-items-center rounded bg-amber-300 text-sm font-bold text-teal-950">{index + 1}</span>
                  <span className="text-sm font-medium text-white/88">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-8 md:grid-cols-[260px_minmax(0,1fr)] md:px-6">
        <aside className="md:sticky md:top-5 md:self-start">
          <nav className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Mục lục</p>
            <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
              {policySections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-900">
                  <span className="mr-2 text-xs font-bold text-emerald-700">{section.index}</span>
                  {section.title}
                </a>
              ))}
            </div>
          </nav>
        </aside>

        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">Thanh toán</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">3 mô hình thanh toán chính</h2>
              </div>
              <span className="rounded-md bg-emerald-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                OTA Flow
              </span>
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-emerald-950 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Phương thức</th>
                    <th className="px-4 py-3 text-left font-semibold">Thời điểm xác nhận</th>
                    <th className="px-4 py-3 text-left font-semibold">Ghi nhận dòng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.map((row) => (
                    <tr key={row[0]} className="border-t border-slate-100 bg-white">
                      {row.map((cell) => (
                        <td key={cell} className="px-4 py-3 text-slate-700">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {policySections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-emerald-900 text-sm font-bold text-white">
                  {section.index}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-semibold text-slate-950">{section.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{section.summary}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {section.points.map((point) => (
                  <div key={point} className="flex gap-3 rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-800" />
                    <p className="text-sm leading-6 text-slate-700">{point}</p>
                  </div>
                ))}
              </div>

              {section.note ? (
                <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                  {section.note}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
