# Storage Service (`services/storage-service`) — Đặc tả & Hướng dẫn Triển khai Đồng bộ

| Thuộc tính | Giá trị |
| :--- | :--- |
| **DRI / Owner** | Người 4 (API / ACL) phối hợp Người 5 (Platform / Secrets) |
| **Thư mục mục tiêu** | [`services/storage-service/`](../../services/storage-service/README.md) |
| **CI Component** | `@badminton/storage-service` (`storage_service` khi bật trong `.github/ci/components.yml`) |
| **Port / DB** | Port `3007` · **MongoDB 8** (metadata) + **Cloudinary** (object/CDN storage) |
| **Contract & ADR** | [contracts/storage/openapi.json](../../contracts/storage/openapi.json) · [ADR-009](../week-5/adr/ADR-009.md) · [W04-N4 (`AD-06`)](../week-4/W04-N4_identity-commerce-content.md) |
| **Trạng thái hiện tại** | **Skeleton (`folder-only`)** trên `main` |

---

## 1. Phạm vi & Ranh giới Kiến trúc

`storage-service` cung cấp **chỉ mục tệp tin ổn định (`fileId`)** và quản lý vòng đời upload ảnh/tài liệu lên Cloudinary cho các domain khác (`Booking Core` lưu `logoFileId` / `imageFileIds` của Trung tâm, `Identity` ảnh avatar, `Content` ảnh banner tin tức/sự kiện).

> **Nguyên tắc an toàn bắt buộc:**
> - **Không gửi API secret Cloudinary ra trình duyệt:** Mọi upload/xóa qua backend hoặc signed policy có kiểm soát; không cho client tự gán `assetId` / `url` tùy tiện vào domain DB.
> - **Không dùng chung 1 transaction DB + Cloudinary:** Phải quản lý máy trạng thái metadata **`PENDING` → `READY` | `FAILED`** kèm tác vụ đối soát dọn file mồ côi khi upload lỗi hoặc xóa thất bại.
> - **File nhạy cảm / hóa đơn luôn Private:** Không trả URL public cho tài sản loại hóa đơn/tài liệu nội bộ.

---

## 2. API Endpoints & Chính sách Kiểm soát ([contracts/storage/openapi.json](../../contracts/storage/openapi.json))

| Endpoint Native (`/api/v1/...`) | Gateway Path | Bảo mật, Validate & ACL |
| :--- | :--- | :--- |
| `POST /files` | `POST /api/storage/files` | Yêu cầu Bearer JWT; kiểm tra scope (`CENTER_GALLERY`, `USER_AVATAR`, `NEWS_BANNER`, `INVOICE`); **allowlist MIME & kiểm tra magic bytes** (`image/jpeg`, `image/png`, `image/webp`...) + giới hạn kích thước file (`LIMIT_FILE_SIZE`); lưu metadata `PENDING` → upload Cloudinary → cập nhật `READY` + `fileId` (UUID). |
| `GET /files/{fileId}` | `GET /api/storage/files/{fileId}` | Nếu là tài sản public (ảnh sân, banner tin) trả URL/metadata; nếu là tài sản riêng tư bắt buộc kiểm tra `uploaderUserId` hoặc ACL domain chủ sở hữu. |
| `POST /files/bulk-urls` | `POST /api/storage/files/bulk-urls` | Nhận danh sách `fileIds[]` (giới hạn số lượng tối đa/lần); **kiểm tra quyền từng `fileId` độc lập**, không cho liệt kê bừa Cloudinary public IDs. |
| `DELETE /files/{fileId}` | `DELETE /api/storage/files/{fileId}` | Chỉ `uploader` hoặc admin/owner domain sở hữu mới được xóa; đánh dấu xóa & đối soát xóa object trên Cloudinary kèm audit log. |
| `GET /health/live`, `GET /health/ready`, `GET /metrics` | Internal only | `/health/ready` kiểm tra MongoDB metadata store; `/metrics` khóa bằng `METRICS_TOKEN`. |

---

## 3. Tích hợp với Hạ tầng & Secrets

- Credential Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) tuyệt đối không commit vào Git — phải khai báo qua **External Secrets Operator** (`LocalStack` ở local / `AWS Secrets Manager` ở production) trong `badminton-infras` & `badminton-gitops`.
- Nếu `api-gateway` proxy `multipart/form-data` lên `/api/storage/files`, phải cấu hình riêng route streaming / payload limit cao hơn ngưỡng `256kb` mặc định của JSON body parser trong `services/api-gateway/src/app.ts`, đồng thời giữ giới hạn chặt chống DoS.
