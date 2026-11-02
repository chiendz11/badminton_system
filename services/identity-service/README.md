# identity-service — skeleton V2

Trạng thái: **folder-only**, chưa có ứng dụng, package, endpoint, database hoặc container chạy được.

DRI: Người 4. Gộp auth_service + user_service; Identity là nguồn sự thật về tài khoản, phiên, OAuth và role.

## Cây module dự kiến

```text
identity-service/
  prisma/
  src/auth/
  src/user/
  src/profile/
  src/oauth/
  src/role/
  src/session/
  src/common/
  tests/unit/
  tests/integration/
```

## Boundary và dữ liệu

PostgreSQL riêng + Prisma; User, Session, RefreshToken, ExternalIdentity, Role. Hash refresh token/client secret; không sao chép secret hay token thô từ legacy.

API, event và quyền nằm trong [system contract](../../docs/SYSTEM_CONTRACTS.md), quyết định ở [ADR](../../docs/adr/README.md) (ADR-006). Dùng tên kebab-case để khớp repo hiện tại; tương ứng tên underscore trong tài liệu kiến trúc.

## Trước khi biến thành service chạy được

- Review contract và mô hình dữ liệu; chỉ thêm dependency/package khi bắt đầu triển khai.
- Thêm config validation, health/live, health/ready, auth/authorization, logging và metrics phù hợp.
- Viết unit/integration test thực cho invariant của domain; không coi thư mục tests trống là test coverage.
- Sau khi có ứng dụng và checks riêng, thêm Compose và component CI. Hiện chưa thay đổi hai cấu hình này.
- Không commit dữ liệu người dùng, `.env`, khóa nhà cung cấp hoặc model weights.

## Legacy để tham khảo khi triển khai

- [`BM/services/auth_service/prisma/schema.prisma`](https://github.com/chiendz11/Badminton_manager_microservices/blob/484d381e873f513ed4faa4413407502112f4885d/BM/services/auth_service/prisma/schema.prisma)
- [`BM/services/user_service/src/models/user.model.js`](https://github.com/chiendz11/Badminton_manager_microservices/blob/484d381e873f513ed4faa4413407502112f4885d/BM/services/user_service/src/models/user.model.js)

Skeleton không sao chép code legacy. [Mapping đầy đủ](../../docs/architecture/SKELETON_MAPPING.md).
