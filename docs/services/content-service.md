# Content Service (`services/content-service`) — Đặc tả & Hướng dẫn Triển khai Đồng bộ

| Thuộc tính | Giá trị |
| :--- | :--- |
| **DRI / Owner** | Người 4 — Identity · Commerce · Content |
| **Thư mục runtime** | [`services/content-service/`](../../services/content-service/README.md) |
| **Package / CI Component** | `@badminton/content-service` (`content_service` trong `.github/ci/components.yml`) |
| **Port / DB** | Port runtime `3001` (`3005` trên OpenAPI proposal) · **MongoDB 8 (`badminton_content`)** |
| **Contract & BRD** | [contracts/content/openapi.json](../../contracts/content/openapi.json) · [BRD `UC-07`, `UC-08`](../week-4/BRD.md) |
| **Trạng thái hiện tại** | **Implemented (MVP Live)** CRUD `/content/news` & `/content/ratings`; cần nâng cấp luồng **Duyệt sự kiện, Report/Moderation, `/health/ready`, `/metrics` & Event** |

---

## 1. Phạm vi & Hiện trạng Mã nguồn

- **Đã có trên `main` (PR #3 + PR #5):**
  - `NewsModule` (`/content/news`): `GET` công khai (hiện trả toàn bộ bản ghi), `POST/PATCH/DELETE` chỉ `@Roles('super_admin')`.
  - `RatingsModule` (`/content/ratings`): `GET` công khai (hiện chưa lọc theo `centerId`), `POST/PATCH/DELETE` yêu cầu `AuthGuard` (`userId` lấy từ JWT `@CurrentActor()`).
  - `HealthController` tại `GET /health` trả tĩnh `{ status: 'ok' }`.
  - Proxy tại Gateway: [services/api-gateway/src/routes/content.route.ts](../../services/api-gateway/src/routes/content.route.ts).
- **Khoảng trống cần hoàn thiện đồng bộ với hệ thống:**
  1. Dọn thư mục rỗng `.gitkeep` thừa (`src/rating/`, `src/review/`, `src/clients/`, `tests/`) để tránh nhầm lẫn.
  2. Chuẩn hóa `centerId` hỗ trợ **UUID** khớp `Center.id` của `booking-core` (hiện một số test/regex đang giả định ObjectId 24 hex).
  3. Nâng cấp luồng nghiệp vụ `UC-07`, `UC-08` và phát RabbitMQ events sang `notification-service`.

---

## 2. Các API & Luồng Nghiệp vụ Cần Hoàn thiện

| Nhóm API (theo OpenAPI) | Qua Gateway | Quyền & Quy tắc bắt buộc |
| :--- | :--- | :--- |
| `GET /news` | `GET /api/content/news` | Công khai **chỉ trả bài `status = PUBLISHED`**, phân trang `cursor`/`limit`, lọc `category` & `centerId`. `center_manager` xem thêm được bài `DRAFT`/`PENDING_REVIEW` của sân mình; `super_admin` xem tất cả. |
| `POST /news`, `PATCH /news/:id` | `POST/PATCH /api/content/news` | Cho phép **`center_manager`** tạo/sửa đề xuất Sự kiện/Giải đấu CLB ở trạng thái `DRAFT` / `PENDING_REVIEW` (kiểm tra `centerId` thuộc quyền quản lý). Nếu chuyển `PENDING_REVIEW` → phát event **`content.news-submitted.v1`**. |
| `PUT /news/{newsId}/publication` | `PUT /api/content/news/{newsId}/publication` | Chỉ **`super_admin`**: duyệt (`PUBLISHED`), từ chối (`REJECTED` kèm `reason`) hoặc lưu trữ (`ARCHIVED`). Khi đổi trạng thái → phát event **`content.news-publication-changed.v1`** báo về `center_manager` tác giả. |
| `GET /centers/{centerId}/reviews` | `GET /api/content/centers/{centerId}/reviews` | Công khai: lọc theo `centerId` (UUID), chỉ trả review chưa bị ẩn (`status = PUBLISHED`), phân trang cursor + điểm trung bình. |
| `POST /centers/{centerId}/reviews` | `POST /api/content/centers/{centerId}/reviews` | `user` đã đăng nhập: `score` `1..5`, kiểm tra có `booking` hợp lệ tại cơ sở đó (tùy cấu hình client `booking-core`), chống review trùng lặp. |
| `POST /reviews/{reviewId}/report` | `POST /api/content/reviews/{reviewId}/report` | `center_manager` (hoặc `user`): gửi lý do khiếu nại bình luận xấu/chơi xấu (`ReviewReportRequest`). Phát event **`content.review-reported.v1`** báo `super_admin`. |
| `PUT /reviews/{reviewId}/moderation` | `PUT /api/content/reviews/{reviewId}/moderation` | Chỉ **`super_admin`**: ẩn (`HIDDEN`) hoặc khôi phục (`PUBLISHED`) đánh giá kèm lý do + lưu lịch sử kiểm duyệt (`ModerationRequest`). |

---

## 3. Đồng bộ với API Gateway, Hardening & Observability

1. **Cập nhật [services/api-gateway/src/routes/content.route.ts](../../services/api-gateway/src/routes/content.route.ts):**
   - Bổ sung method **`PUT`** vào `allowedMethods`.
   - Mở `validPath` cho phép các route mới (`/news/:id/publication`, `/centers/:centerId/reviews`, `/reviews/:id/report`, `/reviews/:id/moderation`) hỗ trợ cả **UUID** lẫn ObjectId 24 hex.
2. **Bảo mật `src/main.ts`:** Bổ sung `helmet()`, `app.disable('x-powered-by')` và giới hạn payload JSON (ví dụ `64kb`), không trả stacktrace hay Mongo URI trong HTTP 500.
3. **Probe & Metrics chuẩn Kubernetes:**
   - Giữ `GET /health/live` nhẹ.
   - Bổ sung `GET /health/ready` kiểm tra thật kết nối MongoDB (`mongoose.connection.readyState === 1`, trả `503` khi mất DB).
   - Bổ sung `GET /metrics` khóa bằng `Bearer METRICS_TOKEN` + structured JSON log gắn `X-Request-Id`.

---

## 4. Kết nối Giao diện (`apps/web` & `apps/admin`)

Hiện `apps/web` và `apps/admin` chưa gọi `/api/content/*`. Sau khi cập nhật backend + Gateway + OpenAPI (`x-implementation-status: "implemented"`):
- **`apps/web`:** Hiển thị mục Tin tức/Sự kiện đã duyệt ở Trang chủ và danh sách Review + form đánh giá/báo cáo tại trang chi tiết Trung tâm.
- **`apps/admin`:** Thêm tab Đề xuất Sự kiện & Báo cáo Review (`center_manager`), và tab Hàng đợi Duyệt tin / Kiểm duyệt Đánh giá (`super_admin`).
