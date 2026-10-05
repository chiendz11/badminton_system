# Kiểm tra nhánh Booking Core và UI gốc

Kết quả local ngày 2026-10-05, Node 22.23.3 / pnpm 10.25.0; chưa phải kết quả GitHub Actions.

| Kiểm tra                                        | Kết quả                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Unit backend                                    | 19/19                                                                                                                    |
| Unit Web / Admin                                | 4/4 mỗi ứng dụng                                                                                                         |
| Provider/schema contract backend                | 5/5                                                                                                                      |
| Consumer contract Web / Admin                   | 4/4 mỗi ứng dụng, endpoint/payload/envelope gốc                                                                          |
| Integration PostgreSQL 16 / Testcontainers      | 19/19                                                                                                                    |
| ESLint + hook dependencies / TypeScript tooling | Pass; JSX nguồn giữ JavaScript, chưa typecheck đầy đủ JSX                                                                |
| Production build backend / Web / Admin          | Pass; route lazy loading, CSS/Tailwind/PostCSS gốc                                                                       |
| Browser smoke UI gốc                            | 23 route (10 Web + 13 Admin), 26 gateway requests giả lập, không lỗi JavaScript; không gọi auth/payment/pass hoặc API v1 |
| Docker API / Web / Admin                        | Build pass; Nginx config, SPA deep links, REST/GraphQL proxy vào mock gateway pass                                       |
| Production backend smoke                        | Ready 200; dev session 404; metrics thiếu token 401                                                                      |
| Trivy API image, HIGH/CRITICAL có bản sửa       | 0 findings tại lúc quét                                                                                                  |
| Manifest / change detector / Compose config     | Pass: 21 components, 8 enabled; Node 1, Web 2, Contract 2, AI 0                                                          |

Tổng 59 test unit/integration/contract. Unit UI bảo vệ navigation, role visibility, hourly grid, giữ chỗ và conflict; consumer tests chạy qua Axios adapter giả lập, bao gồm GraphQL variables, bearer token/client ID và user activation. Integration backend kiểm tra cạnh tranh slot, DB exclusion, idempotency, cleanup hết hạn, quote/discount, quyền, CRUD, rollback chuỗi fixed và cleanup chạy đồng thời.

Browser smoke chạy trên bản production build qua Vite preview và trên bản Docker/Nginx với **gateway responses giả lập**. Kết quả chỉ xác minh route render và legacy client requests; không xác minh hệ thống legacy services đang chạy. Các màn hình UI gốc chưa nối trực tiếp vào Booking Core v1; gateway adapter và backend ngoài Booking Core chưa triển khai. Xem [LEGACY_UI.md](LEGACY_UI.md). Giữ chỗ trên UI không được gọi là xác nhận booking hoàn tất.

Các image cuối đã chạy migration/seed, readiness và production metrics/logs trên database Docker riêng. Bản backend sau refactor tiếp tục qua integration tests. Docker/browser mới dùng project riêng `badminton-legacy-ui-verify`; không dùng DB cũ hoặc dừng k3d của người dùng. Các container kiểm tra và preview được dọn sau khi hoàn thành.

Metrics/logs và cấu hình Prometheus/3 alert rules giữ lại từ Booking Core, đã được validate trong bước triển khai backend; chưa triển khai monitoring stack hoặc outbox publisher. Trivy phản ánh vulnerability DB tại thời điểm quét và được CI quét lại. Branch feature không tự kích hoạt Actions khi push.
