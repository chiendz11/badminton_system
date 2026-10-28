# W05-N2 — Wireframes, Pass OpenAPI và API examples

| Thuộc tính | Giá trị |
| --- | --- |
| DRI | Người 2 — Pass Marketplace · Frontend |
| Peer reviewer của task | Người 1 |
| Deliverable gốc, ô H8 | Wireframes + Pass OpenAPI + API examples |
| Ưu tiên / giờ dự kiến | P0 / 8 giờ |
| Phụ thuộc | W4 pass rules |
| Definition of Done gốc | Backend/frontend thống nhất request/response và transfer workflow. |
| Nguồn kế hoạch | Sheet “Kế hoạch 10 tuần”, A8:O8 |
| Đầu ra của tuần | Tài liệu thiết kế kỹ thuật và contract |

Tài liệu trình bày thiết kế trong tuần 5: ranh giới thành phần, mô hình dữ liệu và contract làm đầu vào cho giai đoạn triển khai.

## Thiết kế cấu trúc frontend

Khi triển khai, giữ React/Vite và tách theo feature trong `apps/web/src/features/{booking,pass-marketplace,social,identity,notifications,content}`; Admin dùng `features/{booking,centers,commerce,identity,content}` theo nhu cầu. Mỗi feature có API adapter, pages/components/hooks và tests; dùng shared transport gửi auth/requestId/idempotency headers.

Các màn hình được tổ chức theo luồng Booking History → ModalPassBooking → PassCourts → hội thoại theo bài nhượng. Admin dùng form/bảng nhất quán cho thao tác quản trị. Dữ liệu HTTP nằm ở query/cache; form/dialog state ở local feature; không nhân bản booking owner vào global state để quyết định quyền.

## Wireframe luồng Booking và Pass

```text
Booking History (HistoryTab)
┌ Trung tâm | Sân | Ngày | 18:00–19:00 | Trạng thái ┐
│ [Chi tiết] [Pass sân nếu server báo eligible]      │
└ Lý do không eligible được hiển thị cạnh hành động ┘
                  ↓
ModalPassBooking
  Thông tin booking chỉ đọc; giá nhượng VND; mô tả
  [Hủy] [Đăng bài] → pending → postId hoặc lỗi có thể sửa
                  ↓
PassCourts (danh sách/card và bộ lọc)
  [Bài ACTIVE] [Giá] [Quan tâm] [Chat] [Trạng thái]
Seller: người quan tâm → chọn receiver → xác nhận transfer
  Thành công: SOLD; 409: reload post/booking và giải thích
```

Wireframe mô tả bố cục và luồng thao tác. Các trạng thái loading/empty/error/forbidden/conflict là đầu vào cho mock fixtures và frontend shell của tuần 6.

## API proposal và security

[Gateway OpenAPI](../../contracts/gateway/openapi.json) tham chiếu [Booking Core OpenAPI](../../contracts/booking/openapi.json), chứa schema, auth, response và error cho các thao tác dưới đây. Public API dùng prefix `/api/booking/pass-posts`; Gateway chịu trách nhiệm adapter/routing tới Booking Core.

| Method/path | Request | Response | Quyền / key |
| --- | --- | --- | --- |
| GET /api/booking/bookings/{bookingId}/pass-eligibility | path | bookingId,eligible,reasons | Own booking; server kiểm trạng thái |
| GET /api/booking/pass-posts | centerId/date/status/cursor/limit | Page<PassPost> | Public chỉ ACTIVE; dữ liệu riêng cần auth |
| POST /api/booking/pass-posts | bookingId,resalePrice,description | 201 PassPost | Current owner, Idempotency-Key |
| GET /api/booking/pass-posts/{postId} | path | PassPost | Public fields; interest list tách quyền |
| DELETE /api/booking/pass-posts/{postId} | path | 204 | Seller; idempotent khi đã CANCELLED |
| PUT /api/booking/pass-posts/{postId}/interest | path | 204 | Auth user khác seller, idempotent |
| DELETE /api/booking/pass-posts/{postId}/interest | path | 204 | Own interest, idempotent |
| GET /api/booking/pass-posts/{postId}/interests | cursor | Page<Interest> | Seller; chỉ userId/displayName tối thiểu |
| POST /api/booking/pass-posts/{postId}/transfer | receiverUserId | 200 TransferResult | Seller hiện tại, Idempotency-Key |

`bookingSnapshot` chứa centerName/date/courtName/slots theo phút/giá gốc để thẻ bài và modal có đủ dữ liệu mà không gọi private booking của người bán. Đây là projection từ Core; adapter UI đổi minutes sang hiển thị giờ, không tự tin snapshot do client gửi.

DELETE cancel replay khi đã CANCELLED trả 204; SOLD/EXPIRED trả 409. Không có arbitrary PATCH owner. Mức giá trần, đăng lại và receiver eligibility tuân theo policy được mô tả ở ADR-004.

## Ví dụ request và response của contract

```http
POST /api/booking/pass-posts
Authorization: Bearer <access-token>
Idempotency-Key: 8f092923-c631-45fb-90d4-5720daf7c963
Content-Type: application/json

{"bookingId":"a1104000-0000-4000-8000-000000000001","resalePrice":120000,"description":"Sân tối thứ bảy"}
```

```json
{"id":"b2204000-0000-4000-8000-000000000001","bookingId":"a1104000-0000-4000-8000-000000000001","sellerUserId":"user-seller","resalePrice":120000,"currency":"VND","status":"ACTIVE","expiresAt":"2026-11-07T11:00:00Z","version":1,"bookingSnapshot":{"centerId":"a1104000-0000-4000-8000-000000000006","centerName":"Trung tâm A","date":"2026-11-07","selections":[{"courtId":"a1104000-0000-4000-8000-000000000008","courtName":"Sân 1","slots":[1080],"price":120000}],"originalPrice":120000,"currency":"VND"}}
```

```http
POST /api/booking/pass-posts/b2204000-0000-4000-8000-000000000001/transfer
Authorization: Bearer <seller-access-token>
Idempotency-Key: 8f092923-c631-45fb-90d4-5720daf7c964
Content-Type: application/json

{"receiverUserId":"user-buyer"}
```

| Negative case | HTTP / code | UI |
| --- | --- | --- |
| Token thiếu/hết hạn | 401 UNAUTHENTICATED | Luồng đăng nhập, không tự gửi lại ghi |
| Không phải seller | 403 FORBIDDEN | Giữ read view, bỏ hành động transfer |
| Hết hạn/chuyển rồi | 409 PASS_NOT_ACTIVE | Reload card/history |
| Key trùng khác payload | 409 IDEMPOTENCY_CONFLICT | Báo lỗi thao tác, không tự đổi key |
| Receiver không hợp lệ | 400 INVALID_RECEIVER | Cho chọn lại receiver |
| Dependency timeout | 503 DEPENDENCY_UNAVAILABLE | Retry cùng key, đối soát kết quả |

`resalePrice` nguyên VND; payload không có sellerId/ownerId/totalPrice tự khai. Bộ ví dụ machine-readable ở `contracts/booking/openapi.examples.json`. Client gửi và giữ Idempotency-Key cho cùng một thao tác ghi, bao gồm khi mất response hoặc retry; không tự phát key mới chỉ vì timeout.

## Đầu ra tài liệu và bàn giao

- Wireframe, frontend feature structure và 9 thao tác API Pass.
- Request/response examples, quyền, idempotency và negative cases cho UI.
- Đầu vào liên quan: [Booking OpenAPI](../../contracts/booking/openapi.json).
