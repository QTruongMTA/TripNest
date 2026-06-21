# Đối chiếu TripNest với mô tả “Hệ thống đặt phòng lưu trú trực tuyến”

Ngày rà soát: 21/06/2026

## Kết luận

TripNest đã đáp ứng phần lớn luồng nghiệp vụ cốt lõi: quản lý người dùng và vai trò, tìm kiếm chỗ ở, kiểm tra phòng trống, chống đặt trùng, đặt phòng, thanh toán ở mức nghiệp vụ, mã giảm giá, kiểm duyệt cơ sở, quản lý doanh thu, tranh chấp và đánh giá sau lưu trú.

Trong đợt rà soát này, hệ thống đã được bổ sung lịch phòng thực tế cho host, giá linh hoạt theo từng ngày, đánh giá đa tiêu chí, phản hồi của host, bản đồ vị trí trong trang chi tiết và nối trang tìm kiếm cũ vào danh sách dữ liệu thật.

## Ma trận đáp ứng

| Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|
| Tìm kiếm theo địa danh | Đáp ứng | API và giao diện hỗ trợ lọc theo thành phố/tỉnh. |
| Hiển thị vị trí trên bản đồ | Đáp ứng | Trang chi tiết hiển thị OpenStreetMap khi cơ sở có tọa độ. Form đăng cơ sở đã hỗ trợ chọn tọa độ. |
| Lọc theo loại hình, giá, tiện nghi | Đáp ứng | Có bộ lọc property công khai và API tương ứng. |
| Lọc theo điểm đánh giá/hạng sao | Một phần | Điểm đánh giá được tính và hiển thị; chưa có bộ lọc theo ngưỡng điểm hoặc hạng sao riêng của khách sạn. |
| So sánh 2–3 cơ sở | Chưa đáp ứng | Chưa có màn hình/bảng so sánh chuyên biệt. |
| Kiểm tra phòng trống thời gian thực | Đáp ứng | Kiểm tra ngày khóa và booking giao nhau trước khi tạo booking. |
| Chống overbooking | Đáp ứng ở mức ứng dụng | Logic kiểm tra nằm trong transaction. Nên bổ sung cơ chế khóa/constraint ở database nếu triển khai tải đồng thời lớn. |
| Nhập thông tin khách | Đáp ứng | Booking gắn với hồ sơ người dùng; hỗ trợ số khách và ghi chú. |
| Dịch vụ thêm | Một phần | Cơ sở có bữa sáng và bãi đỗ xe; chưa có lựa chọn dịch vụ thêm theo từng booking như đưa đón sân bay. |
| Thanh toán cọc/toàn phần | Một phần | Có ghi nhận thanh toán online/offline và trạng thái thanh toán; chưa có thanh toán một phần/đặt cọc. |
| Mã giảm giá | Đáp ứng ở backend/database | Có Promotion và PromotionRedemption; cần kiểm tra/hoàn thiện thao tác nhập mã trong giao diện đặt phòng. |
| Lịch vạn niên cho host | Đáp ứng | Host xem booking, khóa ngày, đánh dấu bảo trì và mở lại ngày. |
| Giá linh hoạt theo ngày | Đáp ứng | Host đặt giá riêng từng ngày; giá này được dùng khi tính tổng booking. |
| Đánh giá đa tiêu chí | Đáp ứng | Vệ sinh, vị trí, phục vụ và giá trị; điểm tổng được tính từ bốn tiêu chí. |
| Host phản hồi đánh giá | Đáp ứng | Host có thể phản hồi; nội dung phản hồi hiển thị công khai tại chi tiết cơ sở. |
| Kiểm duyệt pháp lý | Đáp ứng | Operator duyệt hồ sơ host/listing, có checklist, ghi chú, task và lịch sử xử lý. |
| Xử lý tranh chấp trong khoảng một ngày | Một phần | Có module dispute, trạng thái và operator; chưa có SLA tự động cảnh báo/quá hạn 24 giờ. |
| Quản lý khu vực, hoa hồng, doanh thu, người dùng | Đáp ứng | Có các màn hình và API admin tương ứng. |
| Hoàn tiền theo chính sách hủy | Một phần | Khi booking đã thanh toán bị hủy, trạng thái được chuyển REFUNDED; chưa tích hợp hoàn tiền thật với cổng thanh toán và chưa tính số tiền hoàn theo thời điểm hủy. |
| Minh bạch phí dịch vụ/VAT | Một phần | Có giá phòng, phí dọn dẹp, hoa hồng và quyết toán; chưa tách VAT/phí dịch vụ thành các dòng dữ liệu booking độc lập. |
| Tối ưu tải ảnh/bản đồ | Một phần | Next.js hỗ trợ tối ưu ảnh ở phần lớn màn hình; một số ảnh vẫn dùng thẻ `img`, bản đồ phụ thuộc dịch vụ ngoài. |
| Mã hóa dữ liệu cá nhân/thanh toán | Một phần | Mật khẩu được băm và API có JWT/Helmet/rate limit; dữ liệu cá nhân trong database chưa mã hóa theo trường. |
| Mobile friendly | Đáp ứng cơ bản | Giao diện dùng responsive layout; nên kiểm thử thiết bị thật và accessibility. |
| Hoạt động 24/7 | Phụ thuộc triển khai | Mã nguồn không tự đảm bảo tính sẵn sàng; cần hạ tầng production, monitoring, backup và health check. |

## Hạng mục nên thực hiện tiếp

1. Thêm bảng so sánh 2–3 cơ sở lưu trú.
2. Hoàn thiện đặt cọc/thanh toán toàn phần và callback thật từ VNPay/MoMo.
3. Thêm dịch vụ bổ sung theo booking.
4. Thêm bộ lọc điểm đánh giá và hạng sao.
5. Tính phí dịch vụ, VAT và số tiền hoàn theo chính sách tại thời điểm đặt.
6. Tăng cường chống overbooking ở tầng database cho tải đồng thời cao.
7. Thêm SLA 24 giờ và cảnh báo quá hạn cho tranh chấp/operator.
8. Bổ sung kiểm thử tự động cho booking, giá động, lịch phòng, thanh toán và hoàn tiền.
