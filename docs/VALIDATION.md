# Kiểm tra Booking Core, UI gốc và API Gateway

Kết quả local của bản nối gateway, Node 22.23.3 / pnpm 10.25.0; chưa phải kết quả GitHub Actions.

| Kiểm tra                                             | Kết quả                                                                                                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Unit Core                                            | 19/19                                                                                                                                     |
| Unit Gateway                                         | 13/13                                                                                                                                     |
| Unit Web / Admin                                     | 4/4 mỗi ứng dụng                                                                                                                          |
| Provider contract Core                               | 5/5                                                                                                                                       |
| Contract Gateway                                     | 2/2; validate GraphQL query/fragment/mutation thật từ client Web/Admin                                                                    |
| Consumer contract Web / Admin                        | 4/4 mỗi ứng dụng                                                                                                                          |
| Integration Core / PostgreSQL 16                     | 19/19                                                                                                                                     |
| Integration Gateway → Core thật → PostgreSQL 16      | 9/9; không mock upstream Core                                                                                                             |
| ESLint / TypeScript / production builds              | Pass; JSX nguồn giữ JavaScript, chưa typecheck đầy đủ JSX                                                                                 |
| Docker Core / Gateway / Web / Admin                  | Build, migrations/seed và readiness pass                                                                                                  |
| Browser luồng booking với Nginx/gateway/Core/DB thật | Daily confirmed; cancel; hide history; stats; manager calendar; 5 fixed bookings; centre update; 24 API requests, không lỗi JavaScript    |
| Runtime metrics / scope / correlation                | Core và gateway ready 200; metrics thiếu token 401/có token 200; auth/pass/payment/news/users 404 tại gateway; requestId giữ tới Core log |
| Trivy Core/Gateway, HIGH/CRITICAL có bản sửa         | 0 findings mỗi image tại lúc quét                                                                                                         |
| OpenAPI / JSON Schema dương và âm                    | Booking và Gateway pass                                                                                                                   |
| Manifest / change detector / Compose                 | 21 components, 10 enabled; Node 2, Web 2, Contract 3, AI 0                                                                                |
| Prometheus config / rules                            | Promtool pass; 2 scrape jobs, 3 Core alert rules                                                                                          |

Tổng **83 test** unit/contract/integration. Gateway integration khởi động Nest Core đã build, áp dụng migration vào DB test và gọi qua HTTP: catalogue, chuyển giờ/Vietnam ISO dates, actor/quote từ signed token, replay idempotent, cạnh tranh slot và concurrent retry, owner/manager boundaries, cancel/hide giữ audit, centre/court/pricing atomic, nullable field rejection, từng fixed occurrence khác sân/giờ và rollback conflict. CorrelationId trong outbox khớp requestId do gateway chuyển tiếp.

Browser smoke chạy trên image production build và Nginx trong project riêng `badminton-gateway-verify`. Các REST/GraphQL nghiệp vụ được gọi thật, không intercept bằng response giả lập. Session JWT và directory test được host harness cấp trước entrypoint, không có login UI hoặc Identity service. Font/ảnh từ internet được chặn hoặc trả nội dung trống trong harness để kiểm tra không phụ thuộc mạng ngoài. DB sau scenario giữ 6 bookings (1 cancelled/hidden + 5 fixed), 1 series, 7 outbox records; hide không hard-delete bản ghi. Sửa lỗi Admin chuẩn hóa ngày bằng UTC làm preview nhận ngày hôm trước trong khoảng 00:00–07:00 giờ Việt Nam; browser scenario chạy trong khoảng này đã thành công sau sửa.

Ở lần khôi phục UI trước đã có smoke 23 route (10 Web + 13 Admin) với gateway responses giả lập. Kết quả đó chỉ chứng minh render/legacy request của các màn hình; không coi kho/news/rating/social/notification/users/storage đã có backend thật. Gateway hiện chỉ nối Booking Core; các route khác trả 404. File ID ảnh của centre chỉ lưu metadata, chưa có Storage URL resolver/upload. Xem [API_GATEWAY.md](API_GATEWAY.md) và [LEGACY_UI.md](LEGACY_UI.md).

Kiểm tra dùng PostgreSQL riêng/port localhost ngẫu nhiên, không dùng DB hoặc checkout ứng dụng cũ, không dừng k3d của người dùng. Container/volume của project kiểm tra được dọn sau khi hoàn thành. Prometheus/Grafana/Loki và outbox publisher chưa triển khai; metrics/config/logs đã có để ghép monitoring sau. Trivy phản ánh vulnerability DB tại thời điểm quét; CI quét lại. Feature push không tự kích hoạt workflow, chạy qua PR main hoặc workflow_dispatch.
