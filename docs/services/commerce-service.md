# Commerce Service (`services/commerce-service`) — Đặc tả & Hướng dẫn Triển khai Đồng bộ

| Thuộc tính | Giá trị |
| :--- | :--- |
| **DRI / Owner** | Người 4 — Identity · Commerce · Content |
| **Thư mục mục tiêu** | [`services/commerce-service/`](../../services/commerce-service/README.md) *(Bắt buộc đặt trong `services/*`, KHÔNG đặt ở root monorepo)* |
| **CI Component** | `@badminton/commerce-service` (`commerce_service` trong `.github/ci/components.yml`) |
| **Port / DB** | Port `3003` (OpenAPI `/api/v1`) · **PostgreSQL 16 + Prisma (`commerce` DB)** |
| **Contract & ADR** | [contracts/commerce/openapi.json](../../contracts/commerce/openapi.json) · [ADR-007](../week-5/adr/ADR-007.md) · [W04-N4](../week-4/W04-N4_identity-commerce-content.md) |
| **Trạng thái hiện tại** | **Skeleton (`folder-only`)** trên `main` |

---

## 1. Phạm vi & Ranh giới Nghiệp vụ (Đúng Kiến trúc)

`commerce-service` phụ trách **hai nghiệp vụ tại hậu phương**:
1. **POS Bán lẻ & Kho hàng tại quầy trung tâm:** Quản lý danh mục đồ uống, ống cầu, thuê vợt (`Product`), tồn kho theo trung tâm (`InventoryBalance`), lịch sử nhập/xuất kho (`StockMovement`), tạo đơn bán & hóa đơn tức thời (`Sale`, `SaleItem`, `Invoice`), và báo cáo doanh thu POS.
2. **Quản lý Hợp đồng Đối tác B2B SaaS (`partner-contracts`):** Quản lý hợp đồng thuê bao 3/6/12 tháng giữa nền tảng (`super_admin`) và chủ cơ sở (`center_manager`), phát sự kiện khi đổi trạng thái hợp đồng.

> **Ranh giới tuyệt đối (`ADR-001`, `ADR-007`):**
> - **Không** dùng Mongoose/MongoDB cho tồn kho/bán hàng. Phải dùng **PostgreSQL + Prisma** để trừ tồn và ghi hóa đơn trong cùng 1 transaction ACID.
> - **Không** quản lý thanh toán tiền đặt sân (`Booking`) hay làm cổng thanh toán online (`VNPAY`/`MOMO`) trong `commerce-service`. Checkout đặt sân (nếu bật PayOS) thuộc `services/booking-core`.
> - **Không** gọi HTTP chéo sang `inventory` trong transaction bán hàng; mọi bảng nằm chung DB `commerce`.

---

## 2. Mô hình Dữ liệu PostgreSQL (`prisma/schema.prisma`)

| Model | Trường cốt lõi & Ràng buộc Invariant |
| :--- | :--- |
| `Product` | `id` (UUID), `centerId` (UUID), `name`, `sku`, `category`, `sellUnit`, `importUnit`, `conversionRate` (`>= 1`), `unitPrice` (**integer VND**), `isActive`. |
| `InventoryBalance` | `id`, `centerId`, `productId` (`@@unique([centerId, productId])`), `quantity` (**check `>= 0`**, không bao giờ âm). |
| `StockMovement` | **Append-only** (`id`, `centerId`, `productId`, `type` `IMPORT|SALE|ADJUSTMENT`, `delta`, `balanceAfter`, `actorId`, `referenceId`). Không xóa sửa lịch sử. |
| `Sale` & `SaleItem` | `Sale` (`id`, `centerId`, `cashierUserId`, `totalAmount` integer VND do server tính, `idempotencyKey`, `fingerprint`, `@@unique([cashierUserId, idempotencyKey])`). `SaleItem` lưu `quantity`, `unitPriceSnapshot`, `lineTotal`. |
| `Invoice` | Sinh tự động trong cùng transaction của `Sale` (`1-1` với `saleId`, không tạo `Invoice` PENDING rời). |
| `PartnerContract` | `id`, `centerId`, `managerId`, `packageMonths` (`3|6|12`), `startDate`, `endDate`, `status` (`ACTIVE|EXPIRED|SUSPENDED`), `feeAmount`. |
| `OutboxEvent` | `id`, `type` (`commerce.sale-created.v1`, `contract.status-changed.v1`), `aggregateId`, `payload`, `publishedAt`. |

---

## 3. API Endpoints & Bảo mật Bắt buộc ([contracts/commerce/openapi.json](../../contracts/commerce/openapi.json))

Tất cả endpoint đều dùng **Bearer JWT** qua `@badminton/auth-contracts` — **cấm tin header `x-user-id`, `userId` trên query, hoặc fallback `'test-user'`**.

| Endpoint Native (`/api/v1/...`) | Gateway Path | Quyền & Quy tắc ACID / Idempotency |
| :--- | :--- | :--- |
| `GET /products`, `POST /products` | `/api/commerce/products` | `center_manager` (đúng `centerId` được gán) hoặc `super_admin`. `POST` yêu cầu `Idempotency-Key`. |
| `GET /inventory?centerId=...` | `/api/commerce/inventory` | Bắt buộc `centerId` (UUID); `center_manager` chỉ xem cơ sở của mình (`403` nếu truy cập cơ sở khác). |
| `POST /stock-receipts` | `/api/commerce/stock-receipts` | Nhập kho: `totalAdded = quantityImport × conversionRate` do server tính trong `prisma.$transaction`, ghi `StockMovement` + tăng `InventoryBalance`. |
| `POST /sales` | `/api/commerce/sales` | **Transaction ACID quan trọng nhất:** (1) Check `(cashierUserId, idempotencyKey)` + `fingerprint` (`409` nếu khác payload); (2) Lock/sắp xếp `productId` tăng dần tránh deadlock; (3) Conditional update `quantity >= item.quantity` (`409 INSUFFICIENT_STOCK` và **rollback sạch toàn bộ đơn** nếu thiếu 1 mặt hàng); (4) Tính `totalAmount` từ giá DB (bỏ qua giá client); (5) Tạo `Sale`, `SaleItem`, `StockMovement`, `Invoice`, `OutboxEvent`. |
| `GET /sales/{saleId}`, `GET /invoices/{invoiceId}` | `/api/commerce/sales/...`, `/invoices/...` | `center_manager` của `centerId` hoặc `super_admin`. |
| `GET /reports/sales?centerId=&fromDate=&toDate=` | `/api/commerce/reports/sales` | Doanh thu POS theo `centerId`; không lộ dữ liệu trung tâm khác. |
| `GET/POST /partner-contracts`, `GET /partner-contracts/{id}`, `PATCH /partner-contracts/{id}/status` | `/api/commerce/partner-contracts...` | Chỉ **`super_admin`** tạo/đổi trạng thái (`ACTIVE\|EXPIRED\|SUSPENDED`); khi đổi trạng thái ghi `OutboxEvent` `contract.status-changed.v1`. |
| `GET /health/live`, `GET /health/ready`, `GET /metrics` | Internal only | `/health/ready` check DB Postgres; `/metrics` khóa bằng `METRICS_TOKEN`. |

---

## 4. Checklist Đưa `services/commerce-service` Vào CI & Cụm K8s

1. **Workspace & `package.json`:** Dùng `pnpm` từ root (không tạo `pnpm-lock.yaml` lồng bên trong service); khai báo đủ 9 script bắt buộc bởi `check_node_contract.mjs`: `lint`, `typecheck`, `test:unit`, `test:contract`, `test:integration`, `build`, `prisma:validate`, `prisma:generate`, `prisma:migrate:deploy`.
2. **Test thực tế:** Phải có Integration test (Testcontainers PostgreSQL) giả lập 2 nhân viên bán cùng lúc 1 mặt hàng sắp hết tồn → chỉ 1 đơn thành công, tồn không âm, và test rollback khi item thứ 2 thiếu tồn.
3. **Gateway & CI:** Tạo `Dockerfile` (stage runtime non-root + stage `migrate`), thêm routes `/api/commerce/*` vào `services/api-gateway`, bật `commerce_service` trong [.github/ci/components.yml](../../.github/ci/components.yml) và [.github/workflows/publish-and-deploy.yml](../../.github/workflows/publish-and-deploy.yml).
4. **Infra & GitOps (sau khi app PR xanh):** Thêm DB `commerce` vào `init-script.sql`, secret `commerce-service-secrets` vào `badminton-infras`, và manifest Deployment + `PreSync` migration Job + `NetworkPolicy` vào `badminton-gitops`.
