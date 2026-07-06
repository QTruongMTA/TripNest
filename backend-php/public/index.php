<?php

declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: http://localhost:4000");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

$method = $_SERVER["REQUEST_METHOD"];
$path = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH) ?: "/";
$now = gmdate("c");

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents("php://input");
    if (!$raw) {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function booking_detail(
    string $id,
    string $code,
    string $hostId,
    string $hostName,
    string $guest,
    string $property,
    string $province,
    string $propertyType,
    int $gross,
    int $refund,
    int $commission,
    int $hostPayout,
    int $commissionReceivable,
    string $payoutStatus,
    ?string $refundStatus = null,
    ?string $disputeStatus = null,
    ?string $disputeSubject = null
): array {
    return [
        "id" => $id,
        "code" => $code,
        "hostId" => $hostId,
        "hostName" => $hostName,
        "hostEmail" => $hostId . "@tripnest.demo",
        "guest" => $guest,
        "guestEmail" => strtolower(str_replace(" ", ".", $guest)) . "@guest.demo",
        "property" => $property,
        "province" => $province,
        "propertyType" => $propertyType,
        "checkIn" => "12/07/2026",
        "checkOut" => "14/07/2026",
        "settlementPeriod" => "2026-07",
        "grossAmount" => $gross,
        "settlementBase" => max(0, $gross - $refund),
        "refundAmount" => $refund,
        "penaltyAmount" => 0,
        "commissionRate" => 0.1,
        "commission" => $commission,
        "netRevenue" => $commission,
        "transferReceived" => $gross,
        "hostDirectReceived" => 0,
        "hostPayout" => $hostPayout,
        "commissionReceivable" => $commissionReceivable,
        "adjustment" => 0,
        "status" => "COMPLETED",
        "refundStatus" => $refundStatus,
        "refundedAt" => $refundStatus === "REFUNDED" ? gmdate("c", strtotime("-2 days")) : null,
        "paymentMethod" => "BANK_TRANSFER",
        "paymentMethodLabel" => "Chuyển khoản",
        "paymentModel" => "PAY_FULL",
        "paymentStatus" => "PAID",
        "payoutStatus" => $payoutStatus,
        "disputeStatus" => $disputeStatus,
        "disputeSubject" => $disputeSubject,
    ];
}

function revenue_payload(bool $snapshot = false): array
{
    $bookingDetails = [
        booking_detail("bk-php-001", "BK001", "host-a", "Nguyễn Văn A", "Nguyễn Văn C", "TripNest Hồ Tây", "Hà Nội", "Homestay", 60000000, 0, 6000000, 54000000, 0, "READY_FOR_PAYOUT"),
        booking_detail("bk-php-002", "BK002", "host-a", "Nguyễn Văn A", "Lê Văn D", "Sapa Cloud Villa", "Lào Cai", "Villa", 60000000, 5000000, 5500000, 49500000, 0, "READY_FOR_PAYOUT", "REFUNDED", null, "Hủy trước hạn miễn phí"),
        booking_detail("bk-php-003", "BK003", "host-b", "Trần Văn B", "Phạm Minh Anh", "Đà Nẵng Sea Hotel", "Đà Nẵng", "Hotel", 56000000, 0, 5600000, 50400000, 0, "READY_FOR_PAYOUT"),
        booking_detail("bk-php-004", "BK004", "host-c", "Host Pay at Property", "Hoàng Gia Bảo", "Đà Lạt Garden", "Lâm Đồng", "Apartment", 35000000, 0, 3500000, 0, 3500000, "READY_FOR_PAYOUT"),
        booking_detail("bk-php-005", "BK005", "host-d", "Host Dispute", "Vũ Thanh Hà", "Nha Trang Bay", "Khánh Hòa", "Resort", 18000000, 0, 0, 0, 0, "PENDING_SETTLEMENT", null, "OPEN", "Khách báo không nhận đúng hạng phòng"),
    ];

    return [
        "generatedAt" => gmdate("c"),
        "period" => "2026-07",
        "snapshot" => $snapshot,
        "source" => "PHP_FAILOVER",
        "summary" => [
            "grossBookingValue" => 229000000,
            "netRevenue" => 20600000,
            "pendingPayout" => 153900000,
            "commissionReceivable" => 3500000,
            "totalRefund" => 5000000,
            "disputedBookings" => 1,
            "waitingSettlementBookings" => 1,
            "readyBookings" => 4,
            "cancellationRate" => 8.3,
            "refundRate" => 4.2,
        ],
        "charts" => [
            "monthly" => [
                ["month" => "T2/2026", "grossBookingValue" => 125000000, "netRevenue" => 11800000, "refundAmount" => 2000000, "hostPayout" => 111200000],
                ["month" => "T3/2026", "grossBookingValue" => 146000000, "netRevenue" => 13900000, "refundAmount" => 3500000, "hostPayout" => 128600000],
                ["month" => "T4/2026", "grossBookingValue" => 172000000, "netRevenue" => 16000000, "refundAmount" => 4200000, "hostPayout" => 151800000],
                ["month" => "T5/2026", "grossBookingValue" => 188000000, "netRevenue" => 18100000, "refundAmount" => 4600000, "hostPayout" => 165300000],
                ["month" => "T6/2026", "grossBookingValue" => 204000000, "netRevenue" => 19400000, "refundAmount" => 4800000, "hostPayout" => 179800000],
                ["month" => "T7/2026", "grossBookingValue" => 229000000, "netRevenue" => 20600000, "refundAmount" => 5000000, "hostPayout" => 153900000],
            ],
            "byProvince" => [
                ["province" => "Hà Nội", "grossBookingValue" => 60000000, "netRevenue" => 6000000, "bookings" => 12],
                ["province" => "Lào Cai", "grossBookingValue" => 60000000, "netRevenue" => 5500000, "bookings" => 9],
                ["province" => "Đà Nẵng", "grossBookingValue" => 56000000, "netRevenue" => 5600000, "bookings" => 8],
                ["province" => "Lâm Đồng", "grossBookingValue" => 35000000, "netRevenue" => 3500000, "bookings" => 6],
                ["province" => "Khánh Hòa", "grossBookingValue" => 18000000, "netRevenue" => 0, "bookings" => 1],
            ],
            "byPropertyType" => [
                ["propertyType" => "Homestay", "grossBookingValue" => 60000000, "netRevenue" => 6000000, "bookings" => 12],
                ["propertyType" => "Villa", "grossBookingValue" => 60000000, "netRevenue" => 5500000, "bookings" => 9],
                ["propertyType" => "Hotel", "grossBookingValue" => 56000000, "netRevenue" => 5600000, "bookings" => 8],
                ["propertyType" => "Apartment", "grossBookingValue" => 35000000, "netRevenue" => 3500000, "bookings" => 6],
                ["propertyType" => "Resort", "grossBookingValue" => 18000000, "netRevenue" => 0, "bookings" => 1],
            ],
        ],
        "settlements" => [
            ["hostId" => "host-a", "hostName" => "Nguyễn Văn A", "hostEmail" => "host-a@tripnest.demo", "period" => "2026-07", "bookingCount" => 35, "grossAmount" => 120000000, "refundAmount" => 5000000, "disputeCount" => 0, "commission" => 11500000, "adjustment" => 0, "hostPayout" => 103500000, "commissionReceivable" => 0, "status" => "READY_FOR_PAYOUT"],
            ["hostId" => "host-b", "hostName" => "Trần Văn B", "hostEmail" => "host-b@tripnest.demo", "period" => "2026-07", "bookingCount" => 18, "grossAmount" => 56000000, "refundAmount" => 0, "disputeCount" => 0, "commission" => 5600000, "adjustment" => 0, "hostPayout" => 50400000, "commissionReceivable" => 0, "status" => "READY_FOR_PAYOUT"],
            ["hostId" => "host-c", "hostName" => "Host Pay at Property", "hostEmail" => "host-c@tripnest.demo", "period" => "2026-07", "bookingCount" => 6, "grossAmount" => 35000000, "refundAmount" => 0, "disputeCount" => 0, "commission" => 3500000, "adjustment" => 0, "hostPayout" => 0, "commissionReceivable" => 3500000, "status" => "READY_FOR_PAYOUT"],
        ],
        "bookingDetails" => $bookingDetails,
        "refunds" => array_values(array_filter($bookingDetails, fn($row) => $row["refundAmount"] > 0 || $row["refundStatus"])),
        "disputes" => array_values(array_filter($bookingDetails, fn($row) => $row["payoutStatus"] === "PENDING_SETTLEMENT")),
        "payouts" => [
            ["hostId" => "host-a", "hostName" => "Nguyễn Văn A", "period" => "2026-07", "bookingCount" => 35, "amount" => 103500000, "commissionReceivable" => 0, "status" => "READY", "paidAt" => null, "paidBy" => null],
            ["hostId" => "host-b", "hostName" => "Trần Văn B", "period" => "2026-07", "bookingCount" => 18, "amount" => 50400000, "commissionReceivable" => 0, "status" => "READY", "paidAt" => null, "paidBy" => null],
            ["hostId" => "host-c", "hostName" => "Host Pay at Property", "period" => "2026-07", "bookingCount" => 6, "amount" => 0, "commissionReceivable" => 3500000, "status" => "READY", "paidAt" => null, "paidBy" => null],
        ],
    ];
}

function dispute_case(string $status = "OPEN"): array
{
    $resolved = $status === "RESOLVED";
    return [
        "id" => "dispute-php-1",
        "bookingId" => "bk-php-005",
        "bookingCode" => "BK005",
        "subject" => "Khách báo không nhận đúng hạng phòng",
        "description" => "Khách phản ánh phòng thực tế không giống mô tả trên TripNest và yêu cầu hoàn tiền một phần.",
        "status" => $status,
        "reporter" => "TRAVELER",
        "category" => "PROPERTY_MISMATCH",
        "severity" => "HIGH",
        "requestedOutcome" => "Hoàn tiền 1.200.000 đ",
        "decision" => $resolved ? "PARTIAL_REFUND" : null,
        "resolution" => $resolved ? "Operator xác minh bằng chứng và đề xuất hoàn tiền một phần cho khách." : null,
        "refundAdjustment" => 1200000,
        "payoutAdjustment" => -1200000,
        "createdAt" => gmdate("c", strtotime("-9 hours")),
        "updatedAt" => gmdate("c"),
        "resolvedAt" => $resolved ? gmdate("c") : null,
        "escalatedAt" => $status === "ESCALATED" ? gmdate("c") : null,
        "host" => ["id" => "host-d", "email" => "host-d@tripnest.demo", "name" => "Host Dispute", "displayName" => "Host Dispute", "phone" => "0900000001"],
        "guest" => ["id" => "guest-a", "email" => "guest-a@tripnest.demo", "name" => "Vũ Thanh Hà", "displayName" => "Vũ Thanh Hà", "phone" => "0900000002"],
        "resolver" => $resolved ? ["id" => "operator-php", "email" => "operator.php@tripnest.demo", "name" => "PHP Failover Operator"] : null,
        "province" => ["id" => "province-kh", "name" => "Khánh Hòa"],
        "operatorNotes" => [
            ["action" => "START_INVESTIGATION", "message" => "Failover PHP: đã tiếp nhận và khóa settlement booking liên quan."],
        ],
        "sla" => ["ageHours" => 9, "dueAt" => gmdate("c", strtotime("+15 hours")), "overdue" => false, "label" => "Còn 15h"],
        "booking" => [
            "id" => "bk-php-005",
            "code" => "BK005",
            "status" => "COMPLETED",
            "statusLabel" => "Hoàn thành",
            "checkIn" => "2026-07-12T00:00:00.000Z",
            "checkOut" => "2026-07-14T00:00:00.000Z",
            "guests" => 2,
            "totalPrice" => 18000000,
            "paymentStatus" => "PAID",
            "paymentStatusLabel" => "Đã thanh toán",
            "paymentMethod" => "BANK_TRANSFER",
            "paymentMethodLabel" => "Chuyển khoản",
            "paidAmount" => 18000000,
            "property" => ["id" => "property-php-1", "title" => "Nha Trang Bay", "city" => "Khánh Hòa", "pricePerNight" => 9000000],
        ],
        "financialImpact" => [
            "grossAmount" => 18000000,
            "settlementHold" => !$resolved,
            "refundAdjustment" => 1200000,
            "payoutAdjustment" => -1200000,
            "operatorDecisionRequired" => !$resolved,
            "suggestion" => $resolved
                ? "Tranh chấp đã xử lý, booking có thể quay lại kỳ settlement sau khi Admin xác nhận."
                : "Booking đang Pending Settlement, tạm dừng payout cho Host cho đến khi Operator ra quyết định.",
        ],
    ];
}

if ($path === "/health") {
    json_response(["status" => "ok", "service" => "tripnest-backend-php-failover", "time" => $now]);
}

if ($method === "GET" && $path === "/api/v1/admin/dashboard") {
    json_response([
        "data" => [
            "totalUsers" => 128,
            "totalProperties" => 64,
            "totalBookings" => 86,
            "totalRevenue" => 229000000,
            "source" => "PHP_FAILOVER",
            "recentBookings" => [
                ["id" => "bk-php-001", "status" => "COMPLETED", "totalPrice" => 60000000, "createdAt" => gmdate("c", strtotime("-1 day"))],
                ["id" => "bk-php-002", "status" => "CANCELLED", "totalPrice" => 60000000, "createdAt" => gmdate("c", strtotime("-2 days"))],
            ],
        ],
    ]);
}

if ($method === "GET" && $path === "/api/v1/admin/operators") {
    json_response([
        "data" => [
            ["id" => "operator-php-1", "email" => "operator.hanoi@tripnest.demo", "role" => "OPERATOR_PROVINCE", "isActive" => true, "createdAt" => $now],
            ["id" => "operator-php-2", "email" => "operator.danang@tripnest.demo", "role" => "OPERATOR_PROVINCE", "isActive" => true, "createdAt" => $now],
        ],
    ]);
}

if ($method === "GET" && $path === "/api/v1/admin/revenue") {
    json_response(["data" => revenue_payload(false)]);
}

if ($method === "POST" && $path === "/api/v1/admin/revenue/settlements/generate") {
    json_response(["data" => revenue_payload(true)]);
}

if ($method === "POST" && preg_match("#^/api/v1/admin/revenue/payouts/([^/]+)/paid$#", $path, $matches)) {
    $body = read_json_body();
    json_response([
        "data" => [
            "hostId" => $matches[1],
            "period" => $body["period"] ?? "2026-07",
            "status" => "PAID",
            "paidAt" => gmdate("c"),
            "paidBy" => "PHP Failover Admin",
            "source" => "PHP_FAILOVER",
        ],
    ]);
}

if ($method === "GET" && $path === "/api/v1/operator/dashboard") {
    json_response([
        "data" => [
            "source" => "PHP_FAILOVER",
            "provinces" => [
                ["id" => "province-hn", "name" => "Hà Nội", "type" => "THANH_PHO"],
                ["id" => "province-dn", "name" => "Đà Nẵng", "type" => "THANH_PHO"],
            ],
            "stats" => [
                "totalListings" => 42,
                "pendingListings" => 8,
                "pendingApprovals" => 5,
                "openDisputes" => 15,
                "activeTasks" => 9,
                "pendingBookings" => 11,
                "completedThisMonth" => 18,
                "totalCompleted" => 96,
            ],
        ],
    ]);
}

if ($method === "GET" && $path === "/api/v1/operator/disputes") {
    $requestedStatus = $_GET["status"] ?? "ACTIVE";
    $case = dispute_case($requestedStatus === "RESOLVED" ? "RESOLVED" : "OPEN");
    json_response([
        "data" => [
            "cases" => [$case],
            "summary" => [
                "total" => 1,
                "open" => $case["status"] === "OPEN" ? 1 : 0,
                "investigating" => $case["status"] === "INVESTIGATING" ? 1 : 0,
                "escalated" => $case["status"] === "ESCALATED" ? 1 : 0,
                "resolved" => $case["status"] === "RESOLVED" ? 1 : 0,
                "overdue" => 0,
                "highRisk" => $case["severity"] === "HIGH" ? 1 : 0,
                "settlementHold" => $case["financialImpact"]["settlementHold"] ? 1 : 0,
            ],
            "source" => "PHP_FAILOVER",
        ],
    ]);
}

if ($method === "PATCH" && preg_match("#^/api/v1/operator/disputes/([^/]+)/triage$#", $path, $matches)) {
    $body = read_json_body();
    $status = $body["status"] ?? "INVESTIGATING";
    json_response(["data" => dispute_case($status === "ESCALATED" ? "ESCALATED" : "INVESTIGATING")]);
}

if ($method === "PATCH" && preg_match("#^/api/v1/operator/disputes/([^/]+)/resolve$#", $path, $matches)) {
    $body = read_json_body();
    json_response(["data" => dispute_case(!empty($body["escalate"]) ? "ESCALATED" : "RESOLVED")]);
}

json_response([
    "error" => [
        "message" => "Endpoint not found on PHP failover backend",
        "path" => $path,
        "method" => $method,
    ],
], 404);
