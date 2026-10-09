# Kiểm tra Booking Core, UI gốc, API Gateway và AI

## Thu hẹp UI/API về Booking Core + AI — 2026-10-09

Web chỉ giữ home/centre/booking/history/statistics/AI; Admin chỉ giữ dashboard/centre/court/pricing/order/fixed booking. Xóa source/API client, menu, route và asset của các miền khác; không tạo UI booking mới. 54 mapping source còn lại trong `legacy-ui-provenance.json` đều trỏ đến file tồn tại, giữ commit nguồn `484d381e873f513ed4faa4413407502112f4885d`.

| Kiểm tra | Kết quả |
| --- | --- |
| Web unit / contract | 7/7 và 4/4; history/statistics chỉ gọi Core, filter confirmed, không còn cột phương thức thanh toán |
| Admin unit / contract | 5/5 và 4/4; dashboard chỉ có Booking Core, form centre gọi một mutation và không upload/clear media metadata |
| Web/Admin lint / TypeScript / production build | Pass; JSX vẫn `checkJs: false`, không tuyên bố đã typecheck đầy đủ JSX |
| Browser với API thật | Chi tiết centre, daily 2 slot 60 phút, history/cancel, statistics, sửa centre, 3 màn hình quản lý booking và trang AI; 25 API responses đều thành công, 0 JS errors, 0 API call ngoài phạm vi |
| Layout history/statistics | Desktop 1440px và mobile 390px: header không che nội dung, 0 JS errors |
| CI manifest / detector | 12 components đều enabled, graph/dependency và mapping change detector pass; xóa 9 placeholder miền chưa triển khai |
| Frozen lockfile / Compose config | Pass; bỏ socket.io-client và package chỉ còn dùng bởi dependency đó, không nâng version thư viện |

Browser dùng Chromium, production dist qua Vite preview và Gateway/Core/PostgreSQL thật trên localhost riêng; session JWT và directory manager/customer do harness cấp. Font/ảnh ngoài host được chặn trong harness. Kiểm tra AI ở lượt này là render/navigation, không gọi model hoặc chạy lại NLP/booking AI. Code backend Core/Gateway/AI không thay đổi; các kết quả backend/LLM ở dưới là lịch sử kiểm tra trước đó.

Docker daemon không khả dụng nên lượt này không build image, chạy Nginx/Compose up hoặc Trivy. Compose chỉ kiểm tra cấu hình. Các database/process kiểm thử được tạo riêng và dừng sau kiểm tra; không dùng dữ liệu ứng dụng hoặc chạy test trên repo nguồn.

## Bổ sung AI — 2026-10-09

Kiểm tra local với Python 3.12.13 / uv 0.8.22, Node 22.23.3 / pnpm 10.25.0:

| Kiểm tra | Kết quả |
| --- | --- |
| AI unit | 16/16; slots/budget/hard-soft/evidence và adapter LangChain/OpenAI SDK với HTTP fixture |
| AI integration | 16/16; 13 protocol/state tests và 3 live Core/PostgreSQL tests |
| AI contract / smoke | 3/3 mỗi nhóm |
| Gateway unit / contract | 17/17 và 2/2 |
| Web unit / contract | 6/6 và 4/4; chọn option không đặt, nonce cuối, replay request sau reload |
| Ruff / mypy / ESLint / TypeScript | Pass; mypy kiểm tra 16 file app AI |
| Production build Web / Gateway | Pass |
| Golden small / full | 30 / 40 mẫu fake; schema validity, constraint F1, critical accuracy, intent accuracy đều 1.0; gate thresholds pass |
| Live browser chat | Web → Gateway → AI → Core → PostgreSQL thật; 2 slot [1140,1200] cùng sân, quote 260000đ, CONFIRMED, reload khôi phục receipt và đọc trace; 6 conversation API requests, 0 JS errors |
| Runtime health / auth / metrics | Core/AI/gateway ready 200; metrics thiếu monitoring token 401/có token 200; conversation thiếu JWT 401, token owner khác 404, đúng owner 200 |
| OpenAPI / JSON Schema | Gateway và AI tools cùng ví dụ dương/âm pass |
| Manifest / detector / Python commands / Compose | Pass; 21 components, 12 enabled; Node 2, Python 1, Web 2, Contract 4 |

Tổng lượt chạy các nhóm test ở lần bổ sung AI ban đầu: **67 test pass**. Live integration kiểm tra allocation hai giờ + booking + outbox đã commit, checkpoint PostgreSQL không chứa bearer; hai cuộc chat cạnh tranh chỉ một booking; hai instance với connection pool độc lập bị advisory lock chặn lượt đồng thời. Protocol tests bổ sung mất receipt sau Core commit, dừng worker sau commit consent, stale option/nonce, thay giá phải xin consent lại, hard budget, ownership và model intent không tự cấp quyền BOOK.

Docker daemon trên host không khả dụng trong lượt này. Live tests/browser chạy với PostgreSQL 16.2 standalone và các process Core/AI/Gateway/Web trên cổng localhost riêng, database `booking_test`/`ai_test`, không dùng dữ liệu ứng dụng. Migration Alembic và checkpoint setup thật đã chạy. Các process/DB kiểm thử được dừng sau kiểm tra. Docker build/Trivy của AI và testcontainers startup path chưa chạy local; workflow Python có Docker sẽ chạy live integration và build/scan, thiếu Docker trên CI là fail chứ không skip. Compose mới được kiểm tra cấu hình, chưa chạy `up` trên host này.

Provider ở các test/golden/browser trong lần bổ sung AI ban đầu là **fake**; HTTP fixture kiểm tra adapter SDK thật, không phải response từ model thật. Lần đó chưa gọi LLM bên ngoài vì chưa có API key; các tỷ lệ golden không được dùng làm độ chính xác NLP của model. Không triển khai thêm Identity, payment/pass hoặc backend các màn hình cũ khác.

### Bổ sung Groq thật — 2026-10-09

Sau khi người dùng cung cấp key, cấu hình local chọn endpoint `https://api.groq.com/openai/v1`, model `openai/gpt-oss-120b`, protocol `openai-compatible`, `AI_OFFLINE=false`. Groq models endpoint trả 200 và xác nhận model khả dụng. Không cần thay adapter hoặc dependency. Root và service `.env.example` chỉ chứa cấu hình mẫu, key để trống; key thật nằm trong `.env` local được Git/Docker build context loại trừ, quyền 0600.

Đã gọi LangChain adapter với Groq thật: trích xuất đúng ngày mai/19:00/120 phút/tổng 300000đ/khu vực Cầu Giấy. Browser Web → Gateway → AI/Groq → Core/PostgreSQL thật xác nhận 2 slot [1140,1200] cùng sân, tổng 260000đ, reload khôi phục receipt và trace; 6 conversation API requests, 0 JS errors. Scenario 3 lượt thật (thiếu ngày/giờ → bổ sung → bỏ khu vực) giữ duration/budget/date, tăng plan version, không tạo Reservation trước consent. Metrics runtime ghi 3045 input tokens và 1181 output tokens từ 4 lượt model trong hai scenario này.

Đây là kiểm tra kết nối và scenario có giới hạn, không phải kết quả golden 30/40 mẫu với model thật. Dữ liệu/DB/process kiểm tra được tạo riêng và dừng sau kiểm chứng. Docker daemon vẫn không khả dụng nên chưa chạy Compose build hoặc Trivy trong lượt cấu hình Groq.

## Kết quả nền trước khi bổ sung AI

Kết quả đã ghi của bản nối gateway trước AI, Node 22.23.3 / pnpm 10.25.0; chưa phải kết quả GitHub Actions. Bảng này được giữ làm lịch sử, không có nghĩa các image cũ và Trivy được chạy lại trong lượt bổ sung AI.

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

Ở lần khôi phục UI trước đã có smoke 23 route (10 Web + 13 Admin) với gateway responses giả lập. Kết quả đó chỉ chứng minh render/legacy request của các màn hình; không coi kho/news/rating/social/notification/users/storage đã có backend thật. Ở lần khôi phục đó gateway chỉ nối Booking Core; các route khác trả 404. File ID ảnh của centre chỉ lưu metadata, chưa có Storage URL resolver/upload. Xem [API_GATEWAY.md](API_GATEWAY.md) và [LEGACY_UI.md](LEGACY_UI.md).

Kiểm tra dùng PostgreSQL riêng/port localhost ngẫu nhiên, không dùng DB hoặc checkout ứng dụng cũ, không dừng k3d của người dùng. Container/volume của project kiểm tra được dọn sau khi hoàn thành. Prometheus/Grafana/Loki và outbox publisher chưa triển khai; metrics/config/logs đã có để ghép monitoring sau. Trivy phản ánh vulnerability DB tại thời điểm quét; CI quét lại. Feature push không tự kích hoạt workflow, chạy qua PR main hoặc workflow_dispatch.
