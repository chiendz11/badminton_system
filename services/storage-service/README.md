# storage-service — skeleton V2

Trạng thái: **folder-only**, chưa có ứng dụng, package, endpoint, database hoặc container chạy được.

DRI: Người 4 (API/quyền), phối hợp Người 5 (platform). Giữ adapter Cloudinary và metadata ảnh; cung cấp fileId ổn định cho các domain khác.

## Cây module dự kiến

```text
storage-service/
  src/files/
  src/metadata/
  src/uploads/
  src/providers/cloudinary/
  src/authorization/
  src/common/
  tests/unit/
  tests/integration/
```

## Boundary và dữ liệu

MongoDB metadata riêng + Cloudinary object storage. Không thể transaction ACID qua cả hai; cần trạng thái pending/ready/failed và cleanup đối soát.

API, event và quyền nằm trong [system contract](../../docs/SYSTEM_CONTRACTS.md), quyết định ở [ADR](../../docs/adr/README.md) (ADR-009). Dùng tên kebab-case để khớp repo hiện tại; tương ứng tên underscore trong tài liệu kiến trúc.

## Trước khi biến thành service chạy được

- Review contract và mô hình dữ liệu; chỉ thêm dependency/package khi bắt đầu triển khai.
- Thêm config validation, health/live, health/ready, auth/authorization, logging và metrics phù hợp.
- Viết unit/integration test thực cho invariant của domain; không coi thư mục tests trống là test coverage.
- Sau khi có ứng dụng và checks riêng, thêm Compose và component CI. Hiện chưa thay đổi hai cấu hình này.
- Không commit dữ liệu người dùng, `.env`, khóa nhà cung cấp hoặc model weights.

## Legacy để tham khảo khi triển khai

- [`BM/services/storage_service/src/models/file.model.js`](https://github.com/chiendz11/Badminton_manager_microservices/blob/484d381e873f513ed4faa4413407502112f4885d/BM/services/storage_service/src/models/file.model.js)
- [`BM/services/storage_service/src/routes/storage.route.js`](https://github.com/chiendz11/Badminton_manager_microservices/blob/484d381e873f513ed4faa4413407502112f4885d/BM/services/storage_service/src/routes/storage.route.js)

Skeleton không sao chép code legacy. [Mapping đầy đủ](../../docs/architecture/SKELETON_MAPPING.md).
