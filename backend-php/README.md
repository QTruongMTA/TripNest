# TripNest PHP Failover Backend

Backend PHP này dùng để demo failover cho các module Admin, Operator và Finance.

## Chạy service

```powershell
npm run dev:failover-php
```

Service chạy tại:

```text
http://localhost:8000
```

## Endpoint demo

- `GET /health`
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/operators`
- `GET /api/v1/admin/revenue`
- `POST /api/v1/admin/revenue/settlements/generate`
- `POST /api/v1/admin/revenue/payouts/{hostId}/paid`
- `GET /api/v1/operator/dashboard`
- `GET /api/v1/operator/disputes`
- `PATCH /api/v1/operator/disputes/{id}/triage`
- `PATCH /api/v1/operator/disputes/{id}/resolve`

## Kịch bản demo

1. Chạy backend chính Node.js: `npm run dev:backend`.
2. Chạy PHP failover: `npm run dev:failover-php`.
3. Chạy admin portal: `npm run dev:admin`.
4. Mở `http://localhost:4000`.
5. Tắt backend Node.js ở port `5000`.
6. Refresh hoặc thao tác lại trên Admin Dashboard, Payments hoặc Operator Disputes.
7. Header sẽ đổi từ `API: Node.js Primary` sang `API: PHP Failover`.
