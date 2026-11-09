# W07-N1 — Booking Core Concurrency ACID & Slot Hold Rules

| Thuộc tính | Nội dung |
| --- | --- |
| Mã công việc | W07-N1 |
| Tuần | 7 |
| Người phụ trách (DRI) | Người 1 — Tech Lead · Booking Core |
| Người duyệt chéo (Peer Reviewer) | Người 2 — Pass Marketplace · Frontend |
| Ưu tiên | P0 |
| Trạng thái | **HOÀN THÀNH (100%)** |

---

## 1. Mục tiêu công việc

Hiện thực hóa lát cắt nghiệp vụ quan trọng nhất của phân hệ Đặt sân (`services/booking-core`):
- Xây dựng API kiểm tra sân trống (`/availability`), giữ chỗ tạm thời (`/reservations`) và xác nhận đặt sân (`/bookings`).
- Giải quyết triệt để bài toán tranh chấp tài nguyên (Concurrency Race Condition) khi nhiều người dùng hoặc bot cố gắng đặt cùng 1 khung giờ của cùng 1 sân tại cùng 1 thời điểm.
- Thiết lập quy tắc giữ chỗ tạm thời 10 phút (Hold Period) và quy tắc chống spam hủy sân cận giờ.

---

## 2. Điểm kỹ thuật cốt lõi

### 2.1. PostgreSQL GiST Exclusion Constraint & tsrange
- Thay vì chỉ sử dụng khóa logic ở tầng ứng dụng (dễ bị vượt qua khi scale nhiều bản sao pod), hệ thống sử dụng **PostgreSQL GiST Exclusion Constraint** kết hợp extension `btree_gist`:
  ```sql
  ALTER TABLE "ReservationSlot"
  ADD CONSTRAINT "no_overlapping_slots"
  EXCLUDE USING gist (
    "courtId" WITH =,
    tsrange("startTime", "endTime", '[)') WITH &&
  );
  ```
- Bất kỳ giao dịch nào cố gắng chèn hoặc cập nhật một slot có khoảng thời gian giao nhau (`&&`) trên cùng một sân (`courtId`) sẽ bị PostgreSQL chặn cứng ở mức ACID với mã lỗi `23P01 (exclusion_violation)`, tự động rollback giao dịch mà không gây rò rỉ trạng thái.

### 2.2. Vòng đời giữ chỗ 10 phút (Reservation Lifecycle)
- Khi người dùng chọn slot, hệ thống tạo bản ghi `Reservation` ở trạng thái `HELD` với thời hạn hết hạn chính xác: `expiresAt = now() + 10 minutes`.
- Một tiến trình nền tự động dọn dẹp các slot giữ chỗ quá hạn chưa thanh toán, đưa sân về trạng thái khả dụng cho người chơi khác.

### 2.3. Quy tắc hủy sân nghiêm ngặt (Strict Cancellation Policy)
- Nhằm ngăn chặn hành vi sử dụng bot tự động giữ slot hàng loạt rồi chờ sát giờ mới hủy khiến sân bị bỏ trống, hệ thống áp dụng quy tắc: **Slot đã thanh toán thành công không được phép hủy trực tiếp để hoàn tiền**.
- **Khóa quyền tự hủy đối với người dùng thông thường (`user`)**:
  - Tại `services/booking-core/src/modules/bookings/bookings-command.service.ts`:
    ```typescript
    if (actor.role === "user") {
      throw new ForbiddenException(
        "Booking đã xác nhận không thể tự hủy. Bạn vui lòng sử dụng tính năng Chợ Pass sân hoặc liên hệ quản lý trung tâm.",
      );
    }
    assertCenterManager(actor, initial.reservation.center);
    ```
  - Khách hàng thường (`user`): Tuyệt đối không thể hủy booking đã `CONFIRMED`. Nếu cố tình gọi API `POST /api/v1/bookings/:id/cancel`, hệ thống chặn với mã lỗi **HTTP 403 Forbidden**.
  - Khách hàng muốn hủy giữ chỗ khi chưa thanh toán: Sử dụng `DELETE /api/v1/reservations/:id` (release reservation).
  - Quyền hủy booking đã `CONFIRMED`: Chỉ dành riêng cho Quản lý trung tâm (`center_manager` phụ trách cơ sở) hoặc `super_admin` khi gặp sự cố bất khả kháng (sân hỏng đèn, dột nước, sự kiện trung tâm).
- **Kiểm thử tích hợp (`test/integration/booking.spec.ts`)**:
  - Người dùng thường gửi lệnh hủy bị từ chối với HTTP 403 và thông báo hướng dẫn ra Chợ Pass.
  - Quản lý trung tâm gửi lệnh hủy thành công (200 OK) và giải phóng `slotAllocation`.
- Người dùng không có nhu cầu thi đấu bắt buộc phải đăng bán lại thông qua phân hệ **Chợ Pass Sân (Pass Marketplace)** với cơ chế ký quỹ (Escrow) minh bạch.

---

## 3. Tiêu chí nghiệm thu & Kết quả kiểm thử

- [x] **19/19 Integration Tests** kiểm tra concurrency đều đạt 100% Pass.
- [x] Giả lập kịch bản 20 luồng gửi request giữ cùng 1 slot sân tại cùng 1 mili-giây: Đúng 1 luồng được cấp slot (HTTP 201 Created), 19 luồng còn lại nhận phản hồi HTTP 409 Conflict với thông điệp rõ ràng.
- [x] Lịch trống được phản ánh chuẩn xác qua API `/availability?centerId=...&date=...`.
- [x] Tất cả các test cases đều đạt chuẩn an toàn giao dịch trong môi trường CI/CD tự động.

---

## 4. Kế hoạch Tuần 8 tiếp theo

- Xây dựng máy trạng thái (State Machine) phục vụ tính năng chuyển nhượng vé: `CONFIRMED` → `PASS_PENDING` → `PASS_CLAIMED`.
- Phối hợp với Người 3 và Người 2 triển khai hợp đồng API sang nhượng slot trên Chợ Pass Sân.
