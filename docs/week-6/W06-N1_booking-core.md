# W06-N1 — Booking Core Skeleton, Schema & Migration

| Thuộc tính | Nội dung |
| --- | --- |
| Mã công việc | W06-N1 |
| Tuần | 6 |
| Người phụ trách (DRI) | Người 1 — Tech Lead · Booking Core |
| Người duyệt chéo (Peer Reviewer) | Người 2 — Pass Marketplace · Frontend |
| Ưu tiên | P0 |
| Trạng thái | **HOÀN THÀNH (100%)** |

## 1. Mục tiêu công việc

Thiết lập nền móng kỹ thuật vững chắc cho dịch vụ cốt lõi `services/booking-core`:
- Định nghĩa lược đồ cơ sở dữ liệu quan hệ hoàn chỉnh trên PostgreSQL bằng Prisma ORM.
- Chạy kịch bản di chuyển cấu trúc bảng (Migration) khởi tạo database sạch sẽ.
- Nạp dữ liệu mẫu ban đầu (Database Seeding) cho các cơ sở sân và khung giờ phục vụ kiểm thử.
- Khởi tạo bộ khung NestJS module, cung cấp endpoint `/health` kiểm tra kết nối DB.

## 2. Kết quả bàn giao cụ thể

1. **Thư mục dịch vụ:** `services/booking-core` hoạt động độc lập trên port 3000.
2. **Lược đồ Prisma (`prisma/schema.prisma`):**
   - Bảng `Center`: Thông tin trung tâm/cơ sở sân cầu lông (tên, địa chỉ, trạng thái hoạt động).
   - Bảng `Court`: Danh sách sân con thuộc từng trung tâm (`centerId`, tên sân).
   - Bảng `PricingRule`: Bảng giá theo khung giờ, phân định ngày thường vs. cuối tuần.
   - Bảng `ReservationSlot`: Quản lý các slot giữ chỗ tạm thời; thiết lập ràng buộc duy nhất `@@unique([courtId, playDate, slotStart])` để chống trùng slot tuyệt đối.
   - Bảng `Booking`: Đơn đặt sân chính thức (mã đặt, trạng thái `CONFIRMED`, `CANCELLED`, tổng tiền, chủ sở hữu `ownerId`).
   - Bảng `OutboxEvent`: Hỗ trợ Transactional Outbox Pattern cho sự kiện miền.
3. **Kịch bản Migration & Seed:**
   - Migration file khởi tạo bảng và chỉ mục (Index) quan hệ trên PostgreSQL.
   - Kịch bản `prisma/seed.ts` nạp sẵn 3 cụm sân mẫu và các khung giờ hoạt động tiêu chuẩn.
4. **Health Check Endpoint:** Endpoint `/health` trả về HTTP 200 OK kèm thông tin trạng thái kết nối PostgreSQL và thời gian phản hồi dưới 15ms.

## 3. Tiêu chí nghiệm thu (Definition of Done)

- [x] Lệnh `pnpm prisma:migrate:deploy` chạy thành công, không gặp lỗi cú pháp hay xung đột khóa ngoại.
- [x] Lệnh `pnpm seed` nạp đầy đủ dữ liệu mẫu sẵn sàng cho việc test đặt sân.
- [x] API Gateway định tuyến chính xác request vào Booking Core qua cổng 8081.
- [x] Bộ kiểm tra CI GitHub Actions (`node (booking-core)`) chạy xanh 100% (Lint, Typecheck, Test).

## 4. Kế hoạch Tuần 7 tiếp theo

- Thực hiện task **W07-N1**: Lập trình API tìm sân trống `/availability` và logic khóa giữ chỗ tạm thời 10 phút (`/reservations`) với cơ chế ACID bảo vệ toàn vẹn dữ liệu chống race condition.
