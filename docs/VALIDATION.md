# Kiểm tra nhánh Booking Core

Kết quả local ngày 2026-10-05, trên Node 22 / pnpm 10.25.0. Các kết quả dưới đây là kiểm tra đã chạy trong workspace; chưa phải kết quả GitHub Actions.

| Kiểm tra                                                | Kết quả                                                                                                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit backend                                            | 19/19                                                                                                                                                     |
| Unit Frontend / Admin                                   | 4/4 mỗi ứng dụng                                                                                                                                          |
| Provider/schema contract backend                        | 5/5                                                                                                                                                       |
| Consumer contract Frontend / Admin                      | 2/2 mỗi ứng dụng                                                                                                                                          |
| Integration PostgreSQL 16 / Testcontainers              | 18/18                                                                                                                                                     |
| ESLint và TypeScript mọi package                        | Pass                                                                                                                                                      |
| Production build API / Frontend / Admin                 | Pass                                                                                                                                                      |
| Docker Compose: migration, seed, readiness, Nginx proxy | Pass                                                                                                                                                      |
| Playwright trên bản Docker                              | Khách hold → confirm → history → cancel; manager preview toàn range → hai fixed bookings → cancel; không có lỗi JavaScript; mobile 390px không tràn ngang |
| Trivy image API, HIGH/CRITICAL có bản sửa               | 0 findings ở thời điểm quét                                                                                                                               |
| Manifest / change detection / Node scripts / actionlint | Pass; Node 1, Web 2, Contract 2, AI 0                                                                                                                     |
| JSON Schema examples và OpenAPI validator               | Pass                                                                                                                                                      |
| promtool config / alert rules                           | Pass, 3 alert rules                                                                                                                                       |

Tổng cộng 54 test unit/integration/contract. Browser smoke được chạy local để kiểm tra giao diện nối với API thật; không có Playwright job trong CI hiện tại. Bộ test lưu trong `services/booking_core/test`, `Frontend/test`, `Admin/test`. Integration kiểm tra cạnh tranh slot, DB exclusion trực tiếp, replay idempotency, cleanup hết hạn, giới hạn hold, quote snapshot/discount, quyền, CRUD và rollback chuỗi fixed.

Docker smoke dùng project `badminton-booking-verify`, database/volume riêng và port host ngẫu nhiên. Không dùng DB cũ, không dừng k3d hoặc các container của người dùng. Project kiểm tra được dọn sau khi hoàn thành. Compose commit dùng cổng local 3000/5432/8082/8083.

Trivy phản ánh vulnerability DB tại lúc quét; workflow sẽ quét lại khi chạy CI. Metrics/logs đã có và config Prometheus đã được validate; chưa triển khai một hệ monitoring hoặc outbox publisher thật.
