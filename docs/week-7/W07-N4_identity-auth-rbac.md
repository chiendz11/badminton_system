# W07-N4 — Identity MVP, Multi-role Seed & Auth RBAC

| Thuộc tính | Nội dung |
| --- | --- |
| Mã công việc | W07-N4 |
| Tuần | 7 |
| Người phụ trách (DRI) | Người 4 — Identity · Commerce · Content |
| Người duyệt chéo (Peer Reviewer) | Người 3 — Social Realtime · Notification |
| Ưu tiên | P0 |
| Trạng thái | **HOÀN THÀNH (75%)** |

---

## 1. Mục tiêu công việc

- Xây dựng dịch vụ định danh độc lập (`services/identity/`) quản lý tài khoản người dùng và cơ chế bảo mật.
- Cấp phát JSON Web Token (JWT) an toàn với đầy đủ claims định danh và vai trò.
- Thiết lập hệ thống phân quyền theo vai trò (Role-Based Access Control - RBAC) bảo vệ các tài nguyên hệ thống.
- Cung cấp kịch bản seed dữ liệu mẫu đa vai trò phục vụ việc demo và kiểm thử tự động.

---

## 2. Điểm kỹ thuật cốt lõi

### 2.1. Kiến trúc Dịch vụ Định danh (`services/identity`)
- Sử dụng Express.js tối giản, bảo mật bằng `helmet`, tắt `x-powered-by`, giới hạn payload 16KB.
- Cơ sở dữ liệu: PostgreSQL riêng biệt (Database-per-Service pattern) sử dụng Prisma ORM.
- Băm mật khẩu bằng thuật toán **bcrypt** với salt rounds tiêu chuẩn, đảm bảo an toàn tuyệt đối ngay cả khi dữ liệu bị lộ.

### 2.2. Chuẩn hóa JWT Token & RBAC
- Cấu trúc Token phát hành tại `/api/auth/login`:
  ```json
  {
    "sub": "28b6b193-3166-453d-8f44-c74e9f02b0ea",
    "email": "customer@badminton.local",
    "role": "user",
    "name": "Khách Hàng Mẫu",
    "iss": "badminton-identity",
    "aud": "badminton-system",
    "iat": 1794162058,
    "exp": 1794162958
  }
  ```
- Thời hạn hiệu lực: 15 phút (900 giây) để giảm thiểu rủi ro khi lộ token.
- Hỗ trợ các vai trò chính:
  - `user`: Khách hàng cá nhân, đặt sân và tham gia chợ pass.
  - `center_manager`: Quản lý một cơ sở cụm sân cụ thể.
  - `super_admin`: Quản trị viên cấp cao nhất của toàn hệ thống.

### 2.3. Dữ liệu Seed đa vai trò (Multi-Role Dev Seed)
- Kịch bản `services/identity/src/seed-dev.ts` nạp sẵn 4 tài khoản tiêu chuẩn:
  1. `customer@badminton.local` — Vai trò `user`
  2. `admin@badminton.local` — Vai trò `super_admin`
  3. `manager@badminton.local` — Vai trò `center_manager`
  4. `dung@example.com` — Tài khoản tương thích ngược hệ thống cũ
- Mật khẩu mặc định: `Password123!`.

---

## 3. Tiêu chí nghiệm thu & Tiến độ Pull Request

- [x] **PR #15** (`feat(identity): integrate login for web and admin`): Tích hợp giao diện đăng nhập trên Web/Admin và API Gateway; đã squash & merge vào `main`.
- [x] **PR #17** (`feat(identity): add multi-role dev seed accounts and CI publish workflow`): Bổ sung seed data và CI image workflow; 21/21 checks green; đã squash & merge vào `main`.
- [x] API Gateway định tuyến chính xác endpoint `/api/auth/login` tới `http://identity-service:8084`.
- [!] **Còn 25% khối lượng:** Phân hệ Commerce Inventory (bán lẻ đồ tập, nước uống) được chủ động dời sang Tuần 8 để dồn toàn lực hoàn thiện luồng Auth & RBAC cho Tuần 7.

---

## 4. Kế hoạch Tuần 8 tiếp theo

- Hoàn thiện phân hệ Commerce: Quản lý hàng tồn kho sản phẩm bổ trợ (vợt, cầu lông, nước suối) và tính tiền đi kèm khi đặt sân.
- Bổ sung cơ chế Refresh Token kéo dài phiên làm việc của người dùng một cách an toàn.
