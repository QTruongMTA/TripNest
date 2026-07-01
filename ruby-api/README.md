# TripNest Ruby on Rails API demo

Đây là Ruby on Rails API service demo dùng để chứng minh TripNest có thể tích hợp thêm backend viết bằng ngôn ngữ khác.

Service này chạy độc lập với Node.js backend hiện tại và cung cấp một chức năng nhỏ:

```http
GET /api/v1/ruby/travel_tips?province=Da%20Nang
```

## Cài đặt

Yêu cầu máy đã có Ruby và Bundler.

```bash
cd ruby-api
bundle install
```

## Chạy service

```bash
bundle exec rails server -p 4567
```

## Kiểm tra

```txt
http://localhost:4567/health
http://localhost:4567/api/v1/ruby/travel_tips?province=Da%20Nang
```

Node backend TripNest mặc định sẽ gọi Ruby API qua:

```txt
http://localhost:4567/api/v1/ruby
```

Có thể đổi trong backend bằng biến môi trường:

```env
RUBY_API_URL=http://localhost:4567/api/v1/ruby
```

Frontend không cần gọi thẳng service Ruby. Luồng demo đầy đủ là:

```txt
Frontend TripNest
  -> Node backend: /api/v1/ruby-demo/travel-tips
  -> Ruby on Rails API: /api/v1/ruby/travel_tips
```
