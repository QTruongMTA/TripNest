module Api
  module V1
    module Ruby
      class TravelTipsController < ApplicationController
        def index
          province = params[:province].presence || "Vietnam"
          normalized_province = normalize_province(province)

          render json: {
            success: true,
            source: "ruby-on-rails-api",
            data: {
              province: normalized_province,
              tips: tips_for(normalized_province)
            }
          }
        end

        private

        def normalize_province(province)
          aliases = {
            "da nang" => "Da Nang",
            "danang" => "Da Nang",
            "đà nẵng" => "Da Nang",
            "ha noi" => "Ha Noi",
            "hanoi" => "Ha Noi",
            "hà nội" => "Ha Noi",
            "ho chi minh" => "Ho Chi Minh",
            "hcm" => "Ho Chi Minh",
            "sai gon" => "Ho Chi Minh",
            "sài gòn" => "Ho Chi Minh"
          }

          aliases.fetch(province.to_s.strip.downcase, province.to_s.strip)
        end

        def tips_for(province)
          tips_by_province.fetch(province, default_tips)
        end

        def tips_by_province
          {
            "Da Nang" => [
              "Nên đặt phòng gần biển Mỹ Khê nếu đi lần đầu.",
              "Có thể kết hợp Bà Nà Hills và Hội An trong cùng chuyến đi.",
              "Thời điểm đẹp để đi biển là sáng sớm hoặc chiều muộn."
            ],
            "Ha Noi" => [
              "Khu phố cổ phù hợp cho khách thích khám phá văn hóa.",
              "Nên thử phở, bún chả và cà phê trứng.",
              "Mùa thu là thời điểm rất đẹp để du lịch Hà Nội."
            ],
            "Ho Chi Minh" => [
              "Nên chọn chỗ ở gần Quận 1 nếu muốn tiện di chuyển.",
              "Buổi tối có thể đi phố đi bộ Nguyễn Huệ hoặc chợ Bến Thành.",
              "Ẩm thực đường phố rất đa dạng, phù hợp cho chuyến đi ngắn ngày."
            ]
          }
        end

        def default_tips
          [
            "Nên kiểm tra thời tiết trước chuyến đi.",
            "Đặt phòng sớm để có nhiều lựa chọn và giá tốt hơn.",
            "Ưu tiên chọn nơi ở gần khu vực bạn muốn tham quan."
          ]
        end
      end
    end
  end
end
