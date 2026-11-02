# Monitoring và observability — quy ước chung toàn hệ thống

Ngày đối chiếu source và cấu hình: **27/10/2026**. Đối tượng sử dụng: cả 5 thành viên, người review PR và người vận hành môi trường.

Tài liệu này quy định cách quan sát toàn bộ hệ thống: backend, Web/Admin, database, xử lý bất đồng bộ, dịch vụ ngoài, CI/CD và nền tảng triển khai. Mỗi owner bổ sung instrumentation cho phần mình phụ trách; Người 5 điều phối việc thu thập, dashboard và cảnh báo.

## 1. Phạm vi, trạng thái và cách áp dụng

| Nhãn | Ý nghĩa |
| --- | --- |
| **Đã có code** | Đối chiếu được trong working tree; không đồng nghĩa đã deploy hoặc vừa kiểm thử thành công. |
| **Quy ước chung** | Yêu cầu áp dụng khi triển khai mới hoặc sửa instrumentation; các khác biệt hiện tại được ghi riêng. |
| **Cần triển khai** | Thiết kế metric/check/dashboard/alert; chưa được exporter hoặc runtime cung cấp. |
| **Tùy chọn** | Chỉ áp dụng khi thành phần được đưa vào deployment thực tế. |

Kiến trúc và quyền sở hữu nghiệp vụ theo [ARCHITECTURE](ARCHITECTURE.md), [hiện trạng hệ thống](architecture/SYSTEM_ARCHITECTURE.md), [mapping skeleton](architecture/SKELETON_MAPPING.md) và [system contracts](SYSTEM_CONTRACTS.md). Phân công tham chiếu [kế hoạch tuần 5](week-5/README.md). Ví dụ tên metric trong tài liệu kiến trúc là định hướng; tên runtime thực tế và quy ước bổ sung được liệt kê trong tài liệu này.

**Hiện trạng:** Gateway, Booking Core và AI có instrumentation; Web/Admin có ứng dụng; 6 service Identity, Commerce, Social, Content, Notification, Storage mới có skeleton. Compose có hai PostgreSQL cho Core và AI. Profile `monitoring` đã khai báo Prometheus/Grafana/Alertmanager, đọc rule/dashboard dùng chung từ app chart; chưa xác nhận stack Docker chạy ở lần cập nhật này vì không có Docker daemon. Loki/collector/tracing và exporter chưa được tích hợp. Không dùng việc tồn tại một thư mục, contract hoặc file YAML để đánh dấu thành phần đã được giám sát.

Mục lục:

- [Thành phần và trách nhiệm](#2-thành-phần-và-trách-nhiệm).
- [Stack và nơi quản lý cấu hình](#3-stack-và-nơi-quản-lý-cấu-hình).
- [Health checks](#4-health-checks).
- [JSON logs](#5-json-logs).
- [Correlation và distributed tracing](#6-correlation-và-distributed-tracing).
- [Quy ước metric](#7-quy-ước-metric).
- [Metric đã có trong code](#8-metric-đã-có-trong-code).
- [Instrumentation cần bổ sung theo thành phần](#9-instrumentation-cần-bổ-sung-theo-thành-phần).
- [Database, queue, hạ tầng và dịch vụ ngoài](#10-database-queue-hạ-tầng-và-dịch-vụ-ngoài).
- [Scrape và bảo vệ endpoint](#11-scrape-và-bảo-vệ-endpoint).
- [Dashboard](#12-dashboard).
- [SLI, SLO và cảnh báo](#13-sli-slo-và-cảnh-báo).
- [Xử lý sự cố](#14-xử-lý-sự-cố).
- [Bàn giao và Definition of Done](#15-bàn-giao-và-definition-of-done).

## 2. Thành phần và trách nhiệm

DRI là người chịu trách nhiệm chính. Phân công bổ sung cho các phần dùng chung dưới đây là quy ước phối hợp của nhóm, không thay đổi ownership nghiệp vụ.

| Thành phần | DRI / phối hợp | Hiện trạng monitoring và trách nhiệm |
| --- | --- | --- |
| API Gateway | Người 1; Người 5 hỗ trợ platform | Có health, HTTP metrics, JSON logs, request ID; cần quan sát từng upstream và auth rejection. |
| Booking Core | Người 1 | Có HTTP/domain/DB metrics, expiry worker và outbox; theo dõi invariant cấp slot, reservation, booking, transaction. |
| Payment và Pass Marketplace trong Core | Người 1 phụ trách payment; Người 2 phụ trách pass | Chưa có implementation; bổ sung metric webhook, đối soát và transfer khi triển khai. Không tạo service Pass/Payment riêng chỉ để monitoring. |
| AI Service | Người 5 | Có HTTP/planner/tool/token metrics, trace nghiệp vụ; cần tách độ sẵn sàng, chất lượng và chi phí. |
| Identity Service | Người 4 | Skeleton; phải bổ sung auth/session/OAuth monitoring và PostgreSQL riêng khi có runtime. |
| Commerce Service | Người 4 | Skeleton; theo dõi tồn kho, stock movement, sale/invoice và transaction. |
| Social Service | Người 3 | Skeleton; theo dõi REST, Socket.IO, membership/room ACL, persist message và fan-out. |
| Content Service | Người 4 | Skeleton; theo dõi review/rating/news, quyền sửa/xóa và query latency. |
| Notification Service | Người 3 | Skeleton; theo dõi consumer, inbox/deduplication, delivery, retry và DLQ. |
| Storage Service | Người 4; Người 5 hỗ trợ provider/platform | Skeleton; theo dõi upload, metadata, Cloudinary và cleanup/đối soát. |
| Web và Admin | Người 2 điều phối; owner từng tính năng sửa phần mình | Chưa có hệ thống browser telemetry tập trung; cần lỗi JS/API, thời gian tương tác và synthetic journeys. |
| Nginx/ingress/WAF/TLS | Người 5; Người 2 kiểm tra trải nghiệm UI | Có Nginx phục vụ từng UI; edge/WAF theo kiến trúc đích cần triển khai. Theo dõi request, upstream, TLS và block reason. |
| PostgreSQL, MongoDB, Redis, RabbitMQ, Meilisearch | Người 5 phụ trách nền tảng; service owner chịu trách nhiệm dữ liệu/query | Chỉ PostgreSQL Core/AI có trong Compose hiện tại; exporter và các store còn lại chưa được tích hợp. |
| PayOS, Cloudinary, LLM provider, OAuth provider | Owner adapter: Core/Storage/AI/Identity; Người 5 hỗ trợ | Đo từ phía client của ứng dụng; không suy trạng thái nhà cung cấp chỉ từ một health endpoint nội bộ. |
| CI/CD, migration, model/evaluation artifacts | Người 5 điều phối; owner component xử lý lỗi | CI đã có workflow; dashboard release, giám sát migration và triển khai nền tảng cần bổ sung khi có môi trường. |

Người 5 sở hữu đường đi của telemetry; mỗi DRI vẫn sở hữu ý nghĩa metric, log nghiệp vụ, ngưỡng theo tải và runbook của service mình. Khi thay metric/label, service owner phối hợp Người 5 rà soát và cập nhật dashboard/alert tương ứng trong PR.

## 3. Stack và nơi quản lý cấu hình

Metrics trả lời “bao nhiêu, bao lâu, lỗi với tỷ lệ nào”; logs giải thích sự kiện cụ thể; traces giúp lần theo thời gian qua nhiều thành phần. Audit lưu căn cứ nghiệp vụ để đối soát. Một lớp không thay thế các lớp còn lại: service còn sống chưa có nghĩa đặt sân đúng, và log không thay biên nhận đã commit.

| Lớp | Công cụ / cách dùng chung | Trạng thái |
| --- | --- | --- |
| Instrumentation Node.js | Pino + prom-client; tham khảo package `@badminton/observability` | Đã dùng ở Core/Gateway. Factory metrics hiện gắn cứng Booking Core; không gọi nguyên factory đó từ service mới rồi xuất nhầm namespace. |
| Instrumentation Python | Python logging JSON + prometheus-client | Đã dùng ở AI; chưa đồng nhất toàn bộ log fields với Pino. |
| Metrics backend | Prometheus; Grafana hiển thị, Alertmanager định tuyến cảnh báo | Đã cấu hình profile Compose `monitoring`; cần chạy stack để xác nhận scrape/dashboard/alert delivery. |
| Logs backend | Thu stdout JSON bằng agent của môi trường, đưa vào Loki hoặc cloud log backend | Cần triển khai collector, quyền truy cập và retention. Mỗi môi trường chọn một đường thu chính để tránh ingest trùng. |
| Tracing | OpenTelemetry SDK → Collector → trace backend do platform chọn | Cần triển khai; `X-Request-Id` hiện tại chưa phải distributed tracing. |
| Hạ tầng | Exporter hoặc telemetry do nền tảng quản lý cho DB/broker/node/container/ingress | Cần cấu hình theo deployment và phiên bản thực tế. |

Luồng mong muốn: ứng dụng xuất metrics/logs/spans → hệ thống thu thập → Grafana để xem; Prometheus đánh giá rule → Alertmanager → kênh trực của nhóm. Chưa có kênh nhận cảnh báo được cấu hình trong lần cập nhật tài liệu này.

Nguồn quản lý cấu hình được thống nhất trong **app repo**:

- [monitoring/chart](../monitoring/chart/Chart.yaml): Helm chart của ứng dụng; templates ServiceMonitor/PrometheusRule và dashboard ConfigMap.
- [Rule nguồn Core](../monitoring/chart/rules/booking-core.yml), [Gateway](../monitoring/chart/rules/api-gateway.yml), [AI](../monitoring/chart/rules/ai-service.yml): cùng file được Compose mount và Helm đọc; không còn bản production sao chép trong GitOps.
- [Dashboard nguồn](../monitoring/chart/dashboards/backend-overview.json): cùng JSON được provision local và đóng vào ConfigMap cho Grafana sidecar.
- [monitoring/prometheus.yml](../monitoring/prometheus.yml): địa chỉ thu thập trong network Compose; Kubernetes dùng ServiceMonitor từ chart thay cho DNS local.
- [compose.yml](../compose.yml): profile `monitoring`, volume/config mounts, port và token local.
- [Hướng dẫn chạy và phát hành](../monitoring/README.md): lệnh local, kiểm tra tĩnh và bước pin chart trước khi sync.

| Phần | Nguồn quản lý | Cách dùng |
| --- | --- | --- |
| Code ghi logs, đo metrics và `/metrics` | Từng service trong app | Cùng implementation trong image local/production. |
| Rule, dashboard, templates ServiceMonitor/PrometheusRule | `monitoring/chart` trong app | Compose và Helm đọc cùng nguồn rule/dashboard. |
| Scrape/provisioning local | `monitoring/prometheus.yml`, `monitoring/local`, Compose trong app | Profile `monitoring` chỉ bật khi được yêu cầu. |
| Stack Prometheus/Grafana/Alertmanager và monitoring nền tảng/Argo | Repo `badminton-gitops` | Cài chart nền tảng; không giữ bản rule ứng dụng riêng. |
| Commit chart được triển khai và giá trị môi trường | `applications/application-monitoring.yaml` trong GitOps | Tham chiếu chart app bằng SHA đã review; cấu hình namespace/environment/service được bật. |
| AWS, secret delivery và networking | Repo infras/GitOps theo lớp | Cấp tài nguyên và quyền truy cập phù hợp. |

Lần phát hành đầu cần commit/push chart rồi điền SHA thật vào `targetRevision` của Argo Application; marker `UNCONFIGURED_MONITORING_COMMIT` hiện giữ trạng thái chưa cấu hình và không tự sync. Chưa có deployment production được xác nhận. Rule HTTP khởi điểm dùng chung cho local/Kubernetes: lỗi >5%, p95 Core/Gateway >1 giây, AI >2 giây, có minimum traffic. Các ngưỡng này chưa là SLO đã đo.

Service owner review metric/rule/dashboard trong app PR; Người 5 review PR GitOps chọn revision và giá trị môi trường. Khi đổi metric contract, phối hợp phiên bản image/chart để tránh rule tham chiếu metric chưa có. Không chỉnh một bản production rule thứ hai trong GitOps.

## 4. Health checks

### 4.1. Interface chung cho backend

| Endpoint | Quy ước chung |
| --- | --- |
| `GET /health/live` | Process/event loop còn trả lời; không gọi DB, broker hoặc provider ngoài để quyết định liveness. |
| `GET /health/ready` | Có thể phục vụ chức năng được công bố với các dependency bắt buộc; kiểm tra có timeout; lỗi thì 503 theo chuẩn mới. |
| `GET /metrics` | Prometheus exposition, monitoring credential riêng; không dùng business JWT. |

Không đồng loạt đổi sang `/health` và `/ready` theo ví dụ trong kiến trúc: repo hiện thống nhất đường dẫn có `/health/live` và `/health/ready`. Các endpoint vận hành không thuộc public Gateway business API; hạn chế bằng private network/ingress policy. Health response không trả DSN, host nhạy cảm hoặc exception đầy đủ.

Mục tiêu cho health endpoint mới: trả trong 2 giây, không tạo transaction nghiệp vụ hay gọi model tính phí. Khi có Kubernetes, dùng startup probe cho khởi động chậm, liveness để phát hiện process treo, readiness để điều khiển traffic. Không dùng cùng một dependency check cho cả ba loại probe.

### 4.2. Dependency phải quan sát

| Backend | Readiness hiện tại / yêu cầu khi bổ sung runtime |
| --- | --- |
| Core | **Đã có:** `SELECT 1` PostgreSQL, lỗi trả 503. Không chứng minh expiry worker/publisher đang tiến triển hoặc payment provider hoạt động. |
| Gateway | **Đã có:** gọi readiness Core; lỗi đi qua client/error handler nên status có thể là 503, 502 hoặc 504. Chưa kiểm AI hay các service còn lại. Không đổi code response trong lần cập nhật này. |
| AI | **Đã có:** DB AI, checkpoint store và readiness Core; lỗi trả 503. Không gọi provider thật; model lỗi vẫn có thể để readiness xanh. |
| Identity / Commerce | **Cần triển khai:** PostgreSQL riêng; thêm Redis/broker nếu chức năng công bố phụ thuộc bắt buộc vào chúng. OAuth/payment ngoài đo riêng theo dependency. |
| Social | **Cần triển khai:** MongoDB; Redis adapter khi deployment nhiều replica cần fan-out. HTTP 200 chưa chứng minh room ACL, persist/ack và nhận tin qua socket đúng. |
| Content | **Cần triển khai:** MongoDB; dependency đọc ngoài nếu là điều kiện bắt buộc để phục vụ API. |
| Notification | **Cần triển khai:** MongoDB, broker subscription và consumer loop đang hoạt động; đo thời điểm progress/heartbeat. Ít traffic không được xem là consumer hỏng chỉ vì không có message mới. |
| Storage | **Cần triển khai:** metadata store; theo dõi khả năng upload qua provider ở dependency/synthetic riêng, không upload file mỗi lần health probe. |

Một dependency tùy chọn lỗi có thể dẫn tới degraded mode nếu API vẫn giữ đúng contract. Owner phải mô tả rõ chức năng nào còn phục vụ được và tín hiệu degraded riêng. Không trả ready giả khi toàn bộ chức năng chính bị chặn; cũng không để một AI/OAuth provider không liên quan làm rút mọi route Core khỏi traffic.

`up == 1` chỉ cho biết Prometheus scrape thành công, không có nghĩa readiness hoặc nghiệp vụ thành công. Theo dõi readiness bằng probe/telemetry riêng. Job migration một lần không cần luôn live: quan sát exit status, thời lượng và version đã áp dụng.

## 5. JSON logs

### 5.1. Schema chung khi triển khai mới

Một JSON object trên một dòng stdout/stderr. Không ghi file log riêng trong container làm nguồn thu duy nhất.

| Field | Quy ước |
| --- | --- |
| `timestamp` | ISO 8601 UTC; timestamp ứng dụng phát sinh sự kiện. |
| `level` | `debug`, `info`, `warn`, `error`, `fatal`; debug tắt mặc định trên production. |
| `service` | Tên deployment ổn định theo bảng namespace ở mục 7. |
| `environment`, `release` | `local/ci/staging/production`; release là image/git revision, không lấy từ request. |
| `event` | Tên hữu hạn, ví dụ `http.completed`, `booking.confirmed`, `message.persisted`. |
| `requestId` | Request HTTP hoặc một lần xử lý socket; giữ khi gọi HTTP nội bộ tiếp theo. |
| `traceId`, `spanId` | Chỉ có khi tracing SDK tạo/nhận context hợp lệ; không tự gán bằng requestId. |
| `method`, `route`, `status`, `durationMs` | HTTP; route template, status integer, duration theo milliseconds ở log. |
| `operation`, `outcome`, `errorCode` | Tên thao tác, kết quả và mã lỗi hữu hạn; message cho người dùng không thay thế errorCode. |
| `eventId`, `correlationId`, `attempt` | Xử lý bất đồng bộ; log event ID để lần theo retry/deduplication. |
| `actorId`, ID tài nguyên | Chỉ khi cần điều tra và có quyền truy cập; là JSON fields, không là metric/Loki index labels. |

Ví dụ **schema đích**, không phải log vừa phát sinh:

```json
{"timestamp":"2026-10-20T03:00:00.000Z","level":"info","service":"commerce-service","environment":"staging","release":"example-revision","event":"sale.committed","requestId":"demo-request-0001","operation":"sale","outcome":"committed","durationMs":84,"status":201}
```

Log HTTP một bản tổng kết; log lỗi có errorCode và context đã lọc. Validation/401/403/409 dự kiến không nên tạo stack trace mức error cho mọi request. Mutation thành công chỉ ghi thành công sau commit. Log/counter vẫn có thể mất ở cửa sổ process crash; audit/database mới là căn cứ đối soát giao dịch, không tính doanh thu từ log hoặc Prometheus.

### 5.2. Khác biệt runtime phải xử lý khi thu thập

- Core/Gateway dùng Pino: `time` là timestamp, `level` dạng số, tên sự kiện thường nằm trong `msg`; đã có `service`. Collector có thể chuẩn hóa sang schema trên, giữ raw record khi cần.
- Core ghi `http.request`, `booking.transition`, `request.failed`, `reservation.expiry.failed`; Gateway ghi `request_completed`/`request_failed`. Không viết query chỉ tìm `http.completed` rồi kết luận hai service không có log.
- AI dùng `service`, `event`, `requestId`, `node`, `outcome`; hiện chưa có application timestamp/level/environment/release trong JSON payload. Timestamp collector thu nhận không thay hoàn toàn timestamp sự kiện; bổ sung ở đợt instrumentation sau.
- Shared logger hiện redact một số field tên cụ thể, không tự bảo vệ mọi object lồng nhau. Không truyền nguyên request/error từ SDK/HTTP client vào log rồi dựa hoàn toàn vào redaction.
- Browser hiện có các chỗ `console.error(error)` trong API helpers; chưa phải telemetry an toàn tập trung. Cần chuyển sang record được chọn field trước khi gửi về collector, vì object lỗi Axios có thể chứa config/header.

### 5.3. Dữ liệu được phép thu và retention

Không log Authorization, cookies, password, access/refresh token, API key, connection string, chữ ký webhook, raw Idempotency-Key, prompt/transcript/chat message, nội dung ảnh hoặc dữ liệu thanh toán. Route/path phải bỏ query và thay ID bằng template. Stack trace chỉ tới nơi nội bộ có kiểm soát; lọc message có thể mang secret/PII từ thư viện ngoài.

Transcript AI nằm trong DB AI theo quyền owner, không đưa sang stdout để “debug model”. Trace nghiệp vụ không chứa chain-of-thought. ID người dùng/tài nguyên chỉ thu khi cần, giới hạn truy cập và thời gian lưu; không gửi PII qua tracing baggage.

**Mức khởi điểm đề xuất để cấu hình khi có backend thu thập:** metrics staging 15 ngày, production 30 ngày; application logs staging 7 ngày, production 14 ngày; traces 7 ngày. Đây là ngân sách lưu trữ ban đầu, chưa có retention được bật trong repo. Audit thanh toán/chuyển chủ và dữ liệu hội thoại có policy riêng; không dùng TTL log để xóa audit. Người 5 cấu hình quyền/retention, các DRI rà soát dữ liệu của mình.

## 6. Correlation và distributed tracing

### 6.1. HTTP hiện tại

Gateway/Core/AI nhận `X-Request-Id` khớp `[A-Za-z0-9_-]{8,64}`, nếu không hợp lệ thì tạo UUID; trả lại response và forward khi gọi Core/AI nội bộ. Core dùng AsyncLocalStorage để đưa request ID vào mutation logs. CORS Gateway expose `X-Request-Id` cho browser.

Quy ước cho service mới: giữ request ID qua chuỗi HTTP nội bộ; mỗi request retry có thể có request ID mới, nhưng giữ business idempotency key khi retry cùng ý định. Request ID chỉ phục vụ quan sát, không xác thực actor và không chống tạo giao dịch trùng.

Web/Admin hiển thị mã lỗi/request ID để hỗ trợ tra cứu; không hiện stack trace, header hoặc toàn response nhạy cảm. Chưa có response interceptor chung thu error telemetry trong hai ứng dụng.

### 6.2. Event và socket cần triển khai

Event catalog theo [contracts/events](../contracts/events/). Envelope tương lai dùng `id`, `correlationId`, `type`; `eventId` trong log ánh xạ từ `id`. Core outbox hiện có ID bản ghi, type và `payload.correlationId`, chưa phải toàn bộ envelope tương lai.

Publisher/consumer phải giữ correlation ID, event ID, event type và attempt khi chuyển qua RabbitMQ. Không thêm tùy tiện field vào JSON Schema đang `additionalProperties: false`; trace context mới phải có contract/header mapping được version và review. Broker publish ack không có nghĩa Notification đã xử lý thành công. Consumer chỉ báo processed/ack sau persist thành công; duplicate được ghi nhận riêng, không tăng số notification nghiệp vụ mới.

Social cấp request ID cho từng thao tác socket có ack; log event name hữu hạn, outcome và thời gian xử lý. Không dùng socket ID làm label. Long-lived socket không giữ một span mở cho toàn phiên: tạo span cho connect/auth và các thao tác send/persist/fan-out phù hợp.

### 6.3. Tracing đích

Dùng OpenTelemetry với W6C `traceparent`/`tracestate`; SDK inject/extract context, logs gắn traceId/spanId khi có context. Cần instrument HTTP ingress/outbound, DB, publish/consume và socket handlers. Xem [tài liệu context propagation chính thức](https://opentelemetry.io/docs/concepts/context-propagation/).

Sampling khởi điểm đề xuất: parent-based 10% trace trên staging/production; synthetic test có sampling riêng. Head sampling không bảo đảm giữ mọi trace lỗi. Muốn ưu tiên toàn bộ error/slow trace cần tail sampling ở Collector và đánh giá chi phí. Không bật ghi body/prompt/DB parameters. Context nhận từ public client cần validation và không được dùng để thay đổi quyền hoặc gửi secret sang provider ngoài.

## 7. Quy ước metric

### 7.1. Tên service và namespace

| `service` / scrape job mục tiêu | Metric namespace |
| --- | --- |
| `api-gateway` | `api_gateway` |
| `booking-core` | `booking_core` |
| `ai-service` | `ai` |
| `identity-service` | `identity` |
| `commerce-service` | `commerce` |
| `social-service` | `social` |
| `content-service` | `content` |
| `notification-service` | `notification` |
| `storage-service` | `storage` |

Web/Admin dùng identity `web`/`admin` trong browser telemetry; edge dùng `edge`; exporter giữ tên metric chuẩn của exporter. Không đổi tên metric đang có chỉ để đồng nhất với ví dụ mới.

Tên Prometheus dùng snake_case; counter kết thúc `_total`, thời gian dùng `_seconds`, dung lượng `_bytes`, tỷ lệ 0..1. Giá VND nếu thật sự cần thì ghi đơn vị `_vnd`, không trộn với currency khác; tổng tiền nghiệp vụ vẫn đối soát từ DB. Đây là lựa chọn của nhóm theo [quy ước naming Prometheus](https://prometheus.io/docs/practices/naming/).

### 7.2. Bộ tối thiểu cho backend mới

Trong bảng dưới, `<ns>` là namespace ở trên, không phải tên literal để copy vào code.

| Metric chuẩn | Type / labels | Thời điểm ghi |
| --- | --- | --- |
| `<ns>_http_requests_total` | Counter: `method,route,status` | Một lần khi HTTP request kết thúc; không đếm scrape `/metrics` vào traffic nghiệp vụ. |
| `<ns>_http_duration_seconds` | Histogram: `method,route,status` | Thời gian HTTP theo seconds; chưa bắt buộc đổi label hiện tại của AI. |
| `<ns>_dependency_requests_total` | Counter: `dependency,operation,outcome` | Mỗi lần gọi dependency; phân biệt success/error/timeout, không gắn URL thật. |
| `<ns>_dependency_duration_seconds` | Histogram: `dependency,operation,outcome` | Thời gian mỗi outbound call, kể cả lỗi. |
| `<ns>_database_up` | Gauge: 0/1 | Kết quả kiểm store bắt buộc gần nhất; không suy từ HTTP 200 bất kỳ. |
| `<ns>_build_info` | Gauge bằng 1: `version,revision` | Thông tin build; không thêm commit SHA vào mọi series request. |
| Runtime/process telemetry | Metric chuẩn của runtime hoặc container | CPU, memory, event loop/GC, restart, resource saturation. |

Một metric mới phải có tên, help, type, unit, labels với tập giá trị cho phép, điểm tăng/observe và ý nghĩa khi không có dữ liệu. Ghi vào PR và phần service tương ứng của tài liệu này. Không xuất metric success giả mặc định hoặc giữ series bằng 0 để che service chưa triển khai.

### 7.3. Labels và cardinality

- Cho phép `method`, route template, status, operation, outcome, dependency, event type/queue trong allowlist. Method lạ gom `OTHER`; route không match gom một giá trị ổn định.
- Không dùng userId, centerId, courtId, bookingId, conversationId, socketId, eventId, requestId, traceId, email, IP, raw URL/query, prompt, exception text hoặc tên file do người dùng nhập làm label.
- Platform bổ sung `service`, `environment`, cluster/namespace nếu có qua scrape/discovery. `instance`/pod là chiều hạ tầng có giới hạn theo deployment, không do application request tạo. Ba job Compose gắn `environment=local` và tên service; ServiceMonitor Helm gắn environment từ values và tên service.
- Label `operation`, `reason`, `errorCode`, `model` phải là tập hữu hạn được owner kiểm soát. Không dùng model/version tùy ý từ body; phiên bản evaluation/corpus có thể nằm trong artifact hoặc info metric riêng.
- Với Loki, index labels chỉ nên gồm các chiều ổn định như service/environment/namespace. ID dùng JSON field hoặc structured metadata, không dùng index label, theo [hướng dẫn cardinality của Loki](https://grafana.com/docs/loki/latest/get-started/labels/cardinality/).

### 7.4. Đếm đúng và đọc đúng

Counter mutation thành công tăng sau commit; replay idempotent không tăng số giao dịch mới. Tách `attempt`, `rejected`, `committed`, `duplicate` theo đúng ý nghĩa. Counter là tín hiệu vận hành, không là sổ giao dịch tuyệt đối khi có crash giữa DB commit và ghi metric.

Gauge đọc tổng từ một DB chung, như active holds/outbox pending, không cộng qua các replica ứng dụng vì mỗi replica có thể đang báo cùng một tổng. Dùng một collector có owner, hoặc `max` theo cùng environment/store khi các replica cùng đo đúng một scope. Ngược lại, active sockets là số cục bộ mỗi replica thì có thể cộng. Không cộng giá trị thuộc các store/shard khác nhau rồi coi là một scope giống nhau.

Histogram request thông thường mới dùng buckets theo seconds: `[0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5,10]`. AI/route chờ LLM cần dải dài, đề xuất `[0.05,0.1,0.25,0.5,1,2,5,10,15,25,30,40,45,60]`. Đây là cấu hình cần triển khai, chưa thay buckets runtime. Replica cùng metric cần cùng bucket layout; không đổi layout giữa deployment mà bỏ qua dashboard/recording rule.

p95 tính từ tổng bucket counters sau `rate`, giữ label `le`; không lấy trung bình p95 của các replica. Query trong tài liệu dùng **classic histogram** phù hợp instrumentation hiện tại; không tự chuyển sang native histogram nếu chưa kiểm support cả client/backend. Cách aggregate và giới hạn bucket được giải thích trong [Prometheus histograms](https://prometheus.io/docs/practices/histograms/).

## 8. Metric đã có trong code

### 8.1. Booking Core

Source: [packages/observability](../packages/observability/src/index.ts), [request middleware](../services/booking-core/src/common/observability/request-telemetry.middleware.ts), [health controller](../services/booking-core/src/modules/health/health.controller.ts).

| Metric | Type / labels | Ý nghĩa |
| --- | --- | --- |
| `booking_core_http_requests_total` | Counter: method/route/status | HTTP hoàn tất, bỏ `/metrics`; method lạ gom OTHER, unmatched là `<unmatched>`. |
| `booking_core_http_duration_seconds` | Histogram: method/route/status | HTTP latency; finite buckets hiện tới 5 giây, có bucket +Inf. |
| `booking_core_transitions_total` | Counter: action | held/confirmed/released/expired/cancelled/fixed_created/center_created/center_updated sau commit. |
| `booking_core_conflicts_total` | Counter: operation | Xung đột allocation hoặc DB unique/exclusion constraint tại các điểm đã instrument. |
| `booking_core_transaction_duration_seconds` | Histogram: operation | Thời gian wrapper transaction, kể cả nhánh lỗi. |
| `booking_core_active_holds` | Gauge | Số HELD còn hạn tại lần scrape thành công gần nhất. |
| `booking_core_outbox_pending` | Gauge | Số outbox record chưa có publishedAt tại lần scrape thành công gần nhất. |
| `booking_core_database_up` | Gauge: 0/1 | DB reachable tại lần scrape gần nhất. |
| `process_*`, `nodejs_*` | Runtime collectors | Core gọi collectDefaultMetrics; Gateway/AI hiện chưa xuất bộ runtime giống Core. |

Registry Core có default label `service=booking-core`. `fixed_created` đếm từng occurrence, không đếm một series. Conflict counter không bao phủ mọi HTTP 409 nghiệp vụ và có các điểm ghi khác nhau; không coi là số duy nhất của toàn bộ request bị từ chối. Khi DB lỗi, hold/outbox gauge có thể giữ giá trị cũ; đọc cùng database_up và scrape freshness.

Expiry worker chạy mỗi 15 giây; mutation cũng dọn hold hết hạn cùng center. Worker chưa có heartbeat/last-success metric riêng. Availability bỏ qua hold đã hết hạn ngay cả trước khi cleanup xóa allocation.

Outbox đã được ghi cùng transaction booking nhưng **publisher chưa được triển khai**. Backlog tăng hiện chưa chứng minh sự cố publish; chưa bật cảnh báo delivery lag như một chức năng đang hoạt động.

### 8.2. API Gateway

Source: [request telemetry](../services/api-gateway/src/middleware/request-telemetry.ts), [app](../services/api-gateway/src/app.ts).

| Metric | Labels | Ý nghĩa |
| --- | --- | --- |
| `api_gateway_http_requests_total` | method/route/status | HTTP hoàn tất ở Gateway. |
| `api_gateway_http_duration_seconds` | method/route/status | Bao gồm thời gian chờ upstream. |

Middleware hiện **đếm cả `/metrics` và health**, method chưa có bước gom OTHER. Route bên trong router có thể là path tương đối thay vì public URL đầy đủ; GraphQL đi qua `/graphql`. Chưa có metric theo từng upstream hoặc GraphQL error code; HTTP 200 có thể chứa GraphQL errors. Không suy toàn bộ business success từ tỷ lệ HTTP 2xx.

Dashboard hiện phải loại probe/scrape rõ ràng. Gateway mất kết nối Core trả 502, timeout trả 504. Core upstream timeout mặc định 5 giây, AI 45 giây. Gateway không tự retry mutation.

### 8.3. AI Service

Source: [observability.py](../services/ai-service/app/observability.py), [main.py](../services/ai-service/app/main.py), [workflow.py](../services/ai-service/app/workflow.py). Diễn giải chi tiết tại [AI service walkthrough](AI_SERVICE_CODE_WALKTHROUGH.md).

| Metric | Labels | Ý nghĩa / giới hạn |
| --- | --- | --- |
| `ai_http_requests_total` | method/route/status | Bỏ `/metrics`; nhánh body POST vượt 8192 bytes trả 413 sớm chưa vào counter/log hoàn thành. |
| `ai_http_duration_seconds` | **route** | Histogram HTTP hiện chỉ có route, không có method/status; dùng buckets mặc định thư viện. |
| `ai_agent_actions_total` | action | Quyết định PLAN của workflow. |
| `ai_tool_calls_total` | tool/outcome | Search started/success/failed; details started; create_booking started/confirmed/conflict/uncertain. Chưa có mọi outcome cho mọi tool. |
| `ai_llm_tokens_total` | direction | Input/output usage provider trả về sau parser thành công; fake không có usage. Không bao phủ mọi call lỗi hoặc tự tính chi phí tiền. |
| `ai_search_outcomes_total` | outcome | FOUND/NO_MATCH/SEARCH_FAILED/SEARCH_INCOMPLETE; không gộp lỗi thành hết sân. |
| `ai_near_miss_candidates_total` | không | Số candidate đủ điều kiện near-miss trong pool đã kiểm chứng; khác số proposal thực sự trình bày. |
| `ai_proposals_total` | outcome | proposed/accepted/rejected/expired/stale; đồng ý proposal chưa là booking. |
| `ai_negotiation_turns` | không | Histogram số lượt trong negotiation đã kết thúc hoặc tìm được feasible option. |
| `ai_revalidation_failures_total` | reason | Slot/price đổi hoặc search failed/incomplete sau khi user đồng ý đổi điều kiện. |
| `ai_constraint_guard_rejections_total` | reason | Chặn stale/forged proposal, pending booking hoặc constraint change không đủ evidence. |
| `ai_search_duration_seconds` | stage | total/core/evaluate; thời gian xử lý, không là capacity benchmark. |
| `ai_parser_failures_total` | không | Parser exception hoặc structured-output failure; không đo độ chính xác LLM. |

Đã có search duration theo stage nhưng chưa có histogram outbound LLM riêng, gauge pending_booking, parser-quality metric online hoặc model-version info metric. Không lấy started trừ confirmed làm pending count: conflict, error và retry khiến phép trừ đó sai.

Trace API chỉ owner hội thoại đọc được; trace DB lưu node/outcome/turn/version, hiện không có requestId trực tiếp. Logs có requestId; trace này chưa là distributed trace OpenTelemetry.

Luồng AI hiện có reserve/confirm sau consent; read-only profile còn Proposed. Chỉ báo BOOKED khi có receipt CONFIRMED từ Core. Khi RETRY_BOOKING hoặc mất response, giữ client_message_id và intent key cũ để đối soát.

Từ 28/10/2026, node `ASSIST` có thêm `list_my_bookings`, `get_my_booking_stats`, `compare_centers`, `search_faq`, `cancel_my_booking` trong `ai_tool_calls_total{tool,outcome}`. List phát `success`; stats phát `complete/partial`; centers phát `success/partial`; FAQ phát `found/abstained`. Lỗi truy vấn tương ứng phát `failed/invalid`. Luồng thực thi cancel phát `started/confirmed/refused/uncertain`; lỗi preview có thể phát `failed/invalid`, nhưng không phải mọi consent guard đều tăng counter. Trace `ASSIST` ghi kết quả xử lý theo request/version; không ghi transcript hoặc key. Chi tiết và giới hạn ở [AI_ASSISTANCE_FEATURES.md](AI_ASSISTANCE_FEATURES.md).

`RETRY_CANCELLATION` là kết quả chưa xác định, không phải hủy thất bại hoặc thành công. Client retry HTTP bằng `client_message_id` cũ; recovery nghiệp vụ kiểm tra booking gốc trước khi gửi lại cancel. Chỉ báo `BOOKING_CANCELLED` khi đọc được trạng thái CANCELLED của đúng booking. Không lấy `started - confirmed` làm gauge pending vì retry, refusal và kết quả chưa rõ làm phép trừ sai. Cấu hình scrape/rule hiện có tiếp tục dùng các metric hữu hạn này; chưa có gauge DB-derived cho pending cancellation.

## 9. Instrumentation cần bổ sung theo thành phần

**Toàn bộ tên metric trong mục 9 là mục tiêu cần triển khai**, trừ khi được nêu ở mục 8. Ngoài bộ HTTP/dependency/runtime chung, owner bổ sung các metric dưới đây. Dấu `;` trong ô metric phân tách các tên, không phải một tên metric ghép.

| Thành phần | Metric nghiệp vụ đề xuất | Labels / ý nghĩa bắt buộc |
| --- | --- | --- |
| Gateway | `api_gateway_upstream_requests_total`; `api_gateway_upstream_duration_seconds`; `api_gateway_auth_rejections_total` | upstream/operation/outcome; reason hữu hạn cho auth. GraphQL lỗi đếm bằng operation allowlist/errorCode, không query text. |
| Core — booking | `booking_core_invariant_violations_total`; `booking_core_expired_holds_pending`; `booking_core_expiry_last_success_timestamp_seconds` | Vi phạm cấp slot/booking, hold hết hạn chưa cleanup và tiến trình worker; không dùng booking/court ID làm label. |
| Core — outbox | `booking_core_outbox_oldest_pending_age_seconds`; `booking_core_outbox_publish_total` | Age record chưa publish; outcome published/retry/error. Chỉ có ý nghĩa delivery khi publisher thực sự được triển khai. |
| Core — payment | `booking_core_payment_webhooks_total`; `booking_core_payment_reconciliations_total`; `booking_core_payment_unresolved` | Webhook applied/duplicate/invalid_signature/rejected/error; đối soát matched/mismatch/error. CONFIRMED hiện tại không tự có nghĩa PAID. |
| Core — pass | `booking_core_pass_transfers_total`; `booking_core_pass_transfer_duration_seconds` | committed/conflict/denied/error; chỉ tăng committed khi đổi owner và post state đã commit. Transfer conflict bình thường không là invariant violation. |
| Identity | `identity_auth_attempts_total`; `identity_auth_duration_seconds`; `identity_refresh_reuse_total`; `identity_sessions_active` | operation login/refresh/oauth; outcome success/invalid_credentials/denied/error; reuse và session aggregate. Không log credential, email hoặc token thô. |
| Commerce | `commerce_transactions_total`; `commerce_stock_rejections_total`; `commerce_invariant_violations_total` | operation import/sale/return/adjust; committed/rejected/error; insufficient_stock khác negative_stock invariant. Sale và stock movement cùng transaction. |
| Social | `social_websocket_connections`; `social_websocket_events_total`; `social_message_persist_duration_seconds`; `social_room_denials_total` | Gauge connection mỗi replica; connect/disconnect/reconnect/send/ack và outcome hữu hạn. Persist thành công khác fan-out/recipient đã nhận. |
| Content | `content_operations_total`; `content_query_duration_seconds`; `content_write_rejections_total` | operation review_create/review_update/news_publish/... theo allowlist; outcome committed/rejected/error; quyền/duplicate/business rule là reason hữu hạn. |
| Notification | `notification_events_total`; `notification_delivery_attempts_total`; `notification_event_processing_duration_seconds`; `notification_oldest_pending_age_seconds` | processed/duplicate/retry/dead_letter; channel và outcome delivery; queue wait tách khỏi thời gian xử lý. processed chỉ sau persist/inbox commit. |
| Storage | `storage_uploads_total`; `storage_upload_duration_seconds`; `storage_assets`; `storage_cleanup_failures_total` | provider/outcome; state pending/ready/failed của metadata; cleanup/đối soát object mồ côi. HTTP upload xong chưa chắc metadata ready. |
| AI | `ai_parser_results_total`; `ai_llm_request_duration_seconds`; `ai_llm_requests_total`; `ai_pending_bookings`; `ai_oldest_pending_booking_age_seconds` | valid/invalid/low_confidence; provider/outcome success/error/timeout/rate_limited; pending lấy từ DB, không suy từ tool counter. |

`*_duration_seconds` là Histogram, `*_total` là Counter; `*_timestamp_seconds`, `*_age_seconds`, `*_active`, `*_pending`, `booking_core_payment_unresolved`, `storage_assets`, `social_websocket_connections` là Gauge trong danh mục trên. Gauge tổng DB dùng scope/collector rõ ràng và không full-scan bảng lớn mỗi 15 giây; dùng query có index, cache hoặc background sampler phù hợp.

### 9.1. Web và Admin

Owner UI bổ sung một adapter telemetry chung: app/release/environment, event name, route pattern, status/errorCode, duration và requestId từ response header/body. Không gửi nguyên Axios error hoặc `window.__BADMINTON_SESSION__`.

Các tín hiệu cần có:

- JS unhandled error/unhandled rejection được sanitize và giới hạn tần suất; source map ở nơi nội bộ có quyền.
- API failure/timeout và thời gian request theo endpoint template; lỗi mạng không có status ghi riêng. Không giữ query, body, chat text hoặc token.
- Route load/render và Web Vitals nếu có SDK; giữ app/version và page template, không full URL người dùng.
- Journey đặt sân: tải danh sách → xem lịch → giữ chỗ → xác nhận → đọc booking; phân biệt conflict/expiry dự kiến với lỗi kỹ thuật.
- Journey chatbot: gửi → nhận options → consent → receipt/recovery; không ghi nội dung hội thoại.
- Journey Admin: tải lịch và thao tác được cấp quyền; module mới được owner tương ứng bổ sung journey khi triển khai.

Browser không expose `/metrics` cho Prometheus và không chứa METRICS_TOKEN. Nếu cần metric từ browser events, gửi qua collector có xác thực/rate limit/sampling rồi aggregate ở backend. Browser telemetry mất mạng có thể thất lạc; không thay metric transaction phía server.

Synthetic checks cho Web/Admin kiểm cả asset JS và một API đọc có quyền; `GET /` trả SPA index 200 chưa chứng minh app dùng được. Dùng test account/dữ liệu riêng và cleanup. Trên production mặc định chỉ probe đọc; không tự tạo booking/thanh toán thật để test uptime.

### 9.2. Edge và reverse proxy

Theo dõi status/latency của ingress, upstream connect/read time, 499/502/503/504, TLS expiry, WAF blocks và rate-limit rejects. Tách blocked traffic khỏi lỗi ứng dụng; route template được chuẩn hóa, access log không có cookie/query/token.

Hai Nginx UI hiện dùng template proxy Gateway và serve static assets; chưa có exporter hoặc access-log format chuẩn được cấu hình. Cần kiểm tra timeout của **mọi hop**, gồm UI Nginx/ALB/ingress, không chỉ SDK: Web chat timeout 65 giây, Gateway→AI 45 giây, graph AI 40 giây, LLM mặc định 25 giây, AI→Core 5 giây mỗi call. Đây là budget code, không là SLA đã đo. Client/network có thể mất kết nối sau khi Core commit; không mặc định retry mutation bằng key mới.

### 9.3. Chất lượng và chi phí AI

Dashboard AI tách 3 nhóm: service health, chất lượng trên bộ dữ liệu có nhãn, usage/cost. Provider/model/prompt/corpus version gắn với report/build; không lấy confidence của model làm accuracy.

Hiện CI có fake-provider golden: schema_validity ≥ 1.0, constraint_f1 ≥ 0.90, critical_field_accuracy ≥ 0.95 theo [CI manifest](../.github/ci/components.yml). Small 30 mẫu, full 40 mẫu. Critical metric hiện xét expected date/duration/budget; xem [evaluator](../services/ai-service/evaluation/evaluate.py) để hiểu mẫu số. Đây là regression gate parser, không phải benchmark LLM thật hay tỷ lệ đặt sân thành công.

Khi có RAG/model mới: thêm schema validity, constraint/critical accuracy, retrieval Recall@k/MRR, grounded-answer/no-write checks theo profile được duyệt, p95 và chi phí trên tập đánh giá versioned. Runtime hiện chưa có RAG. Không vẽ Recall@k bằng 0 khi chưa triển khai; hiển thị N/A.

Token usage là dữ liệu đầu vào tính cost estimate với bảng giá/version do owner quản lý; chi phí thực đối chiếu provider billing. Không tự chuyển số token thành VND/USD bằng một mức giá chưa xác định.

## 10. Database, queue, hạ tầng và dịch vụ ngoài

Các tín hiệu dưới là checklist cho deployment khi thành phần được bật. Không giả định đã có exporter, PromQL name hoặc dashboard sẵn; Người 5 pin phiên bản và ghi metric mapping thực tế khi tích hợp.

| Thành phần | Tín hiệu tối thiểu | Owner xử lý nghiệp vụ |
| --- | --- | --- |
| PostgreSQL Core/AI, tương lai Identity/Commerce | Reachability, connection/pool wait/saturation, CPU/RAM/disk/IOPS, locks/deadlocks, slow query tổng hợp, transaction rollback, replication lag nếu có | Owner từng DB tối ưu query/index và transaction; không log SQL parameters/DSN. |
| MongoDB Social/Content/Notification/Storage | Primary/replica health, connection, operation latency, replication lag, disk/index/cache pressure và lỗi write | Người 3/4; mỗi service sở hữu dữ liệu riêng, không join chéo DB để làm dashboard. |
| Redis | Memory/eviction, blocked clients, command latency, connection/reconnect, replication và adapter/queue errors | Platform + owner dùng cache/session/fan-out/queue. Redis lock không thay Core DB invariant. |
| RabbitMQ | Broker/node/disk alarm, connection/channel, ready/unacked count, publish/ack/nack/redelivery rate, consumer count, DLQ và tuổi message chờ xử lý | Producer + Người 3 cho consumer; broker depth không tự cung cấp end-to-end business lag. |
| Outbox / inbox / worker | Pending count, oldest age, last-success/heartbeat, retry/dead-letter, dedupe và processing duration | Owner producer/consumer; ack sau persist, retry hữu hạn, replay có quyền. |
| Meilisearch — tùy chọn | Health, task backlog/failure, indexing delay, search latency, độ mới dữ liệu | Người 4; search index không thay Identity source of truth. |
| PayOS — khi payment được triển khai | Outbound outcome/latency, signature validation, duplicate webhook, trạng thái chưa đối soát, lệch số tiền | Người 1; webhook HTTP 200 không tự chứng minh booking/payment đã commit đúng. |
| Cloudinary — khi Storage được triển khai | Upload/delete latency, timeout/quota/rate limit, metadata–object mismatch và cleanup | Người 4 + Người 5; không log signed URL/credential. |
| LLM/OAuth provider | Timeout/429/5xx, quota, circuit/degraded state nếu có implementation; latency và usage khi provider hỗ trợ | Người 5/4; không gọi provider mỗi health scrape. |
| Model/dataset artifacts — khi có | Version/checksum/manifest, khả năng đọc artifact, load failure, eval gate và rollback version | Người 5; repository chỉ giữ metadata phù hợp, không weights/key/dataset riêng tư. |
| Container/host/Kubernetes — khi có | CPU/RAM, OOM/restarts, throttling, disk, desired/ready replicas, pending pod, rollout failure, node/network/DNS và certificate | Người 5; map metric theo nền tảng thực tế, không coi Compose là Kubernetes. |
| Backup/restore | Last successful backup, backup age/failure, thời gian restore và evidence diễn tập | Người 5 + DB owner; backup job xanh chưa chứng minh restore được. |
| CI/CD và migration | Failed/queued jobs, duration, deploy revision, rollout/rollback, migration exit/duration/version, release blocked vì quality/security gate | Người 5 + component owner; CI xanh chưa chứng minh runtime healthy. |
| Monitoring stack | Prometheus target missing/rule evaluation error/disk, collector drops, Loki ingestion, trace export, Alertmanager routing và test alert | Người 5; cần quan sát chính hệ thống quan sát để tránh im lặng khi collector hỏng. |

Worker expiry hiện tại chạy trong Core bằng timer; không mô tả như một BullMQ worker đã chạy. Redis/RabbitMQ trong kiến trúc là phần cần triển khai, chưa có trong Compose. Với deployment AWS tương lai, lấy tín hiệu RDS/EKS/ALB/S3 hoặc dịch vụ quản lý tương ứng qua nguồn cloud được cấp quyền; không mở DB/broker public để phục vụ scrape.

## 11. Scrape và bảo vệ endpoint

### 11.1. Các target trong profile Compose

[Prometheus local](../monitoring/prometheus.yml) đặt scrape interval 15 giây; target là DNS trong network container, không phải host localhost. Bật bằng `docker compose --profile monitoring up -d --build`. Grafana: http://localhost:3001; Prometheus: http://localhost:9090; Alertmanager: http://localhost:9093. Receiver local không gửi thông báo ra ngoài.

| Job | Target trong Compose network | Host local | Bearer file trong Prometheus |
| --- | --- | --- | --- |
| booking-core | `api:3000` | `127.0.0.1:3000` | `/run/secrets/booking_metrics_token` |
| api-gateway | `gateway:8081` | `127.0.0.1:8081` | `/run/secrets/gateway_metrics_token` |
| ai-service | `ai:8000` | `127.0.0.1:8000` | `/run/secrets/ai_metrics_token` |

Compose mount cấu hình vào `/etc/prometheus/prometheus.yml`, thư mục rule nguồn `monitoring/chart/rules` vào `/etc/prometheus/rules`, và monitoring token qua `configs.content` vào các đường dẫn trong bảng. Cần Compose >=2.23.1. Giá trị token mount và `METRICS_TOKEN` của service lấy từ cùng biến local; không dùng business JWT hoặc một token chung cho mọi môi trường.

Compose hiện có token mẫu local. Ví dụ đọc thủ công **chỉ cho stack local có cấu hình mặc định**:

```bash
curl -fsS http://127.0.0.1:3000/health/live
curl -fsS http://127.0.0.1:3000/health/ready
curl -fsS -H 'Authorization: Bearer local-monitoring-only' http://127.0.0.1:3000/metrics
curl -fsS -H 'Authorization: Bearer local-gateway-monitoring-only' http://127.0.0.1:8081/metrics
curl -fsS -H 'Authorization: Bearer local-ai-monitoring-only' http://127.0.0.1:8000/metrics
```

Core hiện chỉ chặn `/metrics` nếu có METRICS_TOKEN; production validation bắt buộc token. Gateway/AI từ chối khi monitoring token trống. Quy ước cho service mới: thiếu monitoring credential phải từ chối scrape, không tự mở endpoint. Staging/production dùng secret delivery của platform, private network và TLS phù hợp; không đưa token vào browser hoặc Git.

Chưa thêm target của 6 skeleton service. Khi có runtime mới, owner cung cấp service DNS/port/health/metric evidence; Người 5 thêm discovery/scrape và credentials. Không copy port đề xuất rồi bật alert target-down cho một service chưa deploy.

### 11.2. PromQL dùng được với metric hiện tại

Các query mẫu dưới phù hợp schema nguồn đã đọc; cần target đang chạy và đã được scrape. Chưa có kết quả query được đo trong lần cập nhật tài liệu. Chọn environment trước khi aggregate trên deployment nhiều môi trường; local và ServiceMonitor chart đã bổ sung environment label.

Traffic Gateway ở public entry, loại probes/scrape; không cộng thêm Core/AI vào cùng tổng request người dùng:

```promql
sum(rate(api_gateway_http_requests_total{
  job="api-gateway",route!~"/metrics|/health/live|/health/ready"
}[5m]))
```

Tỷ lệ 5xx Core; không xem mọi 409 là lỗi hệ thống:

```promql
sum(rate(booking_core_http_requests_total{
  job="booking-core",route!~"/health/live|/health/ready",status=~"5.."
}[5m]))
/
clamp_min(sum(rate(booking_core_http_requests_total{
  job="booking-core",route!~"/health/live|/health/ready"
}[5m])), 0.001)
```

p95 Core theo route; giữ bucket label `le` khi gộp replica:

```promql
histogram_quantile(0.95,
  sum by (le, route) (
    rate(booking_core_http_duration_seconds_bucket{
      job="booking-core",route!~"/health/live|/health/ready"
    }[5m])
  )
)
```

p95 AI message route, action và usage; histogram AI không có status/method để lọc. Các biểu thức liên tiếp dưới đây là các query riêng, chạy từng biểu thức một:

```promql
histogram_quantile(0.95,
  sum by (le) (rate(ai_http_duration_seconds_bucket{
    job="ai-service",route="/api/conversations/{conversation_id}/messages"
  }[5m]))
)
sum by (action) (rate(ai_agent_actions_total{job="ai-service"}[5m]))
sum by (outcome) (rate(ai_tool_calls_total{job="ai-service",tool="create_booking"}[5m]))
sum by (direction) (rate(ai_llm_tokens_total{job="ai-service"}[5m]))
```

Kết quả p95 ở sát bucket cuối hoặc +Inf không phải số đo latency chính xác; kiểm bucket coverage, sample count và route mix trước khi kết luận. Bổ sung buckets dài cho AI trước khi dùng ngưỡng 20/40 giây như SLI định lượng.

Domain signals và gauges Core, với scope một environment/DB:

```promql
sum by (action) (rate(booking_core_transitions_total{job="booking-core"}[5m]))
sum by (operation) (rate(booking_core_conflicts_total{job="booking-core"}[5m]))
max(booking_core_active_holds{job="booking-core"})
max(booking_core_outbox_pending{job="booking-core"})
min(booking_core_database_up{job="booking-core"})
```

Các `max/min` trên là ví dụ cho một deployment đang cùng đọc một DB, không dùng nguyên query để trộn nhiều tenant/store/environment. DB-down có thể làm gauge giữ số cũ; annotate freshness và lỗi thu thập.

## 12. Dashboard

Một thư mục dashboard chung của hệ thống, filter environment/service/release theo dữ liệu thực tế. Dashboard thiếu target/metric phải hiện **No data / Not deployed**, không tự thay thành 0 hoặc Healthy.

| Dashboard | Panels tối thiểu | DRI |
| --- | --- | --- |
| System overview | Entry traffic/5xx/p95, readiness/synthetic, deployment revision, unavailable targets, active incidents | Người 5 + Người 1 |
| Gateway & edge | Route latency/status, upstream failures/timeouts, auth rejection, GraphQL business error, TLS/WAF/ingress | Người 1 + Người 5 |
| Booking Core | Reservation/booking transitions, conflict, expired holds/worker progress, transaction/DB, outbox; payment/pass khi có | Người 1; Người 2 cho pass |
| Identity / Commerce / Content | Auth/session/OAuth; sale/stock/invariant; review/news/query; HTTP và store health của từng service | Người 4 |
| Social & Notification | Active sockets/churn, persist/ack/fan-out; queue age/depth, consumer progress, dedupe/retry/DLQ/delivery | Người 3 |
| Storage | Upload outcome/latency/quota, pending/failed metadata và cleanup mismatch | Người 4 + Người 5 |
| AI | HTTP/LLM/tool health; uncertainty/pending intent; quality report versions; token/cost estimate riêng | Người 5 |
| Web & Admin | JS/API errors theo release/page template, render/load/Web Vitals, synthetic journeys, request ID để tra cứu | Người 2 |
| Platform & data stores | Resources/restarts, DB pools/locks/disk, broker/Redis/search, backup freshness, cloud cost/quota nếu có | Người 5 + DB owners |
| Release & monitoring health | CI/deploy/migration outcomes, version skew, scrape gaps, rule/collector/alert delivery errors | Người 5 |

Mỗi panel/alert có nguồn metric và liên kết runbook. Link Grafana→logs dùng requestId/traceId qua JSON query, không tạo thêm high-cardinality labels. Chưa có dashboard JSON được tạo hoặc nạp trong lần cập nhật này.

## 13. SLI, SLO và cảnh báo

### 13.1. Đo gì trước khi đặt mục tiêu

- **Availability SLI kỹ thuật:** tỷ lệ request nghiệp vụ đủ điều kiện kết thúc không phải 5xx tại Gateway; loại health/metrics/synthetic được đánh dấu. 4xx dự kiến vẫn được quan sát riêng. DNS/TLS/frontend fail trước Gateway cần synthetic/edge bổ sung; không nằm trong counter Gateway.
- **Latency SLI:** histogram theo loại route và cửa sổ; tách AI dài khỏi CRUD. Giữ cùng bucket layout và giới hạn traffic để tránh kết luận từ một mẫu.
- **Business success:** booking/payment/transfer/sale theo kết quả commit/invariant và dữ liệu authoritative. HTTP 200 hoặc model intent không chứng minh thành công; conflict/invalid credentials không mặc định là sự cố.
- **Async freshness:** thời gian từ event commit tới consumer persist, age của việc chưa hoàn thành, retry/DLQ và consumer heartbeat. Queue depth nhỏ vẫn có thể có event rất cũ.
- **AI quality:** metric trên dataset versioned tách khỏi health; không thay accuracy bằng confidence hoặc fake golden.

Mục tiêu ban đầu **đề xuất để chạy baseline trên staging**: availability entry ≥99.5% theo cửa sổ 30 ngày; CRUD p95 ≤1 giây; AI message p95 ≤20 giây khi dùng provider thật; async end-to-end p95 ≤30 giây khi pipeline đầy đủ. Không phải SLA cam kết hoặc kết quả đã đạt. Owner và Người 5 điều chỉnh sau load test, quotas và profile người dùng; ghi window, exclusions, metric và số mẫu khi duyệt SLO.

### 13.2. Rule hiện có và rule cần bổ sung

[Rule nguồn Core](../monitoring/chart/rules/booking-core.yml), [Gateway](../monitoring/chart/rules/api-gateway.yml) và [AI](../monitoring/chart/rules/ai-service.yml) được dùng chung local/Helm. Target down giữ 2 phút; HTTP 5xx >5% và p95 Core/Gateway >1 giây, AI >2 giây giữ 5 phút, chỉ khi ít nhất 20 request trong 5 phút. HTTP rule loại health/metrics và tổng hợp theo environment/service. Core có thêm DB down và conflict spike. AI tool hiện có outcome started/success, chưa có counter lỗi hoàn chỉnh nên không bật rule coi started là failure. Chưa xác nhận rule đã được nạp trên môi trường Docker/Kubernetes. Các điều kiện còn lại trong bảng là chuẩn cần bổ sung khi runtime có metric phù hợp.

| Alert / điều kiện khởi điểm | Mức / thời gian giữ | Điều kiện bật và owner |
| --- | --- | --- |
| Target down hoặc mất series của deployment đáng lẽ tồn tại; readiness/synthetic fail | critical, 2 phút | Người 5 + service owner; theo expected deployment inventory, không áp lên skeleton. Target bị xóa khỏi scrape có thể cần absent/no-data rule, không chỉ `up == 0`. |
| Database required unreachable | critical, 2 phút | DB owner + Người 5; đối chiếu exporter, pool và network. |
| Entry/service 5xx >5% | warning, 5 phút; >20% kéo dài 2 phút nâng critical | Chỉ khi ≥20 request đủ điều kiện trong 5 phút; filter probe và environment. Đây là ngưỡng đề xuất, chưa có trong rule mẫu. |
| CRUD p95 >1 giây; AI message p95 >20 giây | warning, 5 phút | Đủ mẫu và buckets; tách route/provider; AI cần hoàn thiện bucket coverage. |
| Invariant double allocation, transfer sai owner hoặc stock âm | critical, ngay khi có evidence | Người 1/2/4; phải phân biệt với conflict/rejection hợp lệ. Cần metric/check invariant thực, không suy từ 409. |
| Worker ngừng heartbeat/progress; expired holds cleanup trễ | warning, quá 2 chu kỳ kiểm có giới hạn đã công bố | Owner worker; xác định heartbeat ngay cả khi queue rỗng; expiry cần metric mới. |
| Outbox/consumer oldest age >120 giây; backlog tiếp tục tăng | warning, 5 phút | Chỉ bật sau khi publisher/consumer/age metric hoạt động; baseline Core hiện chưa có publisher. |
| DLQ có message mới hoặc retry exhausted | warning, 1 phút; critical nếu chặn luồng chính | Người 3 + producer owner; link runbook replay có idempotency. |
| Payment mismatch/unresolved tăng; webhook invalid signature tăng bất thường | warning; invariant tài chính sai là critical | Người 1; khi module/provider đã triển khai; không tự retry charge/transfer. |
| AI pending booking quá hạn recovery hoặc tăng liên tục | warning | Người 5 + Người 1; cần DB-derived gauge/age và policy timeout được chốt; không tạo booking mới để “giải quyết”. |
| LLM/Cloudinary/PayOS/OAuth 429/timeout tăng | warning; critical theo journey bị chặn | Adapter owner; cần dependency metrics và quota policy; tránh gọi provider thêm để probe liên tục. |
| Auth denial/reuse hoặc room ACL denial tăng bất thường | warning/security review | Người 4/3; không page chỉ vì một credential sai; không đưa actor/IP vào metric labels. |
| Disk free <15%, resource saturation/OOM/restarts, backup quá lịch | warning/critical theo nguy cơ mất khả năng phục vụ | Người 5 + data owner; ngưỡng phải theo capacity và backup schedule đã cấu hình. |
| Certificate còn <14 ngày; alert delivery/collector/rule errors | warning; gián đoạn đường telemetry kéo dài nâng critical | Người 5; test delivery sau cấu hình/rotation. |

Không dùng tỷ lệ có mẫu số 0 rồi hiển thị “100% khỏe”; hiển thị idle/no-data phù hợp. Không bật page cho một error ratio rất nhỏ mẫu; outage check và synthetic vẫn hoạt động khi ít traffic. Dùng budget burn alert dài/ngắn khi đã có SLO và recording rules thực, không gọi các rule demo hiện tại là hệ thống burn-rate hoàn chỉnh.

Mỗi alert mới phải có `severity`, owner/team, service, environment và annotation summary/impact/runbook. Dedupe/group theo service/environment/alertname; inhibit cảnh báo hệ quả khi đã có incident dependency cha, tránh báo lặp Gateway/AI/Core cùng một lỗi DB. Critical gửi kênh trực được nhóm cấu hình; warning vào kênh/backlog có owner. Chưa thiết lập paging/on-call/SLA phản hồi hoặc gửi thông báo thực tế trong đợt này.

## 14. Xử lý sự cố

Quy trình chung: xác định ảnh hưởng và environment/release → xem entry/synthetic rồi live/ready → kiểm dependency → tìm log theo requestId/traceId/eventId → chọn biện pháp trong runbook → xác minh phục hồi và ghi evidence. Không bật log body/token để điều tra.

| Triệu chứng | Kiểm tra đầu tiên / hành động |
| --- | --- |
| Gateway 502/504 | Phân biệt upstream Core/AI, DNS/connect/timeout và deadline từng hop. Đối chiếu cùng requestId trước khi retry. |
| Scrape 401 hoặc target down | Kiểm credentials file, METRICS_TOKEN, network và port; token sai không nhất thiết process chết. Không tắt bảo vệ metrics để làm dashboard xanh. |
| Core DB-down nhưng hold/outbox gauge không đổi | Gauge có thể stale; xem database_up, scrape freshness, pool/network, DB logs. |
| Booking 409 / 410 | 409: tải lại lịch, kiểm allocation/đầu vào. 410: hold hết hạn, chọn lại slot và tạo ý định mới. Không xóa exclusion/unique constraint hoặc sửa owner trực tiếp. |
| Expiry cleanup chậm | Tìm `reservation.expiry.failed`, kiểm DB/lock/worker; phân biệt expired DB rows với availability đã bỏ qua hold hết hạn. |
| Outbox backlog | Trước hết xác nhận publisher đã được triển khai. Nếu có: kiểm publish ack, retry, broker rồi consumer/inbox; không đánh dấu published hàng loạt để che backlog. |
| Chat kết nối được nhưng không nhận tin | Kiểm auth/room membership, persist message, ack, Redis adapter/fan-out và reconnect; không chỉ xem active socket gauge. |
| Notification trùng hoặc DLQ | Lần theo event ID/correlation ID, inbox unique key, ack-after-persist; replay với cùng event identity, có cleanup và quyền thao tác. |
| Stock/transfer/payment invariant | Dừng mở rộng mutation bị ảnh hưởng theo runbook, giữ evidence, đối soát transaction/audit; owner domain quyết định recovery, không platform tự sửa số dư/chủ booking. |
| Storage có file nhưng metadata failed | Đối chiếu upload state/provider response, quota, cleanup/orphan; không xóa object hàng loạt thiếu ownership mapping. |
| AI RETRY_BOOKING hoặc timeout confirm | GET conversation để xem pending state; retry cùng client_message_id/intent cũ theo API. Core receipt mới là kết quả; không tạo key/booking mới khi chưa biết lần trước. |
| AI RETRY_CANCELLATION hoặc timeout hủy | GET conversation, kiểm pending_cancellation/pending_turn; dùng Kiểm tra lại hủy hoặc replay request cũ. Kiểm status từ Core trước mutation; không chuyển sang booking khác khi chưa rõ kết quả. |
| UI trắng/lỗi sau release | Kiểm JS assets/source map nội bộ, cache/version skew, browser error và API requestId; SPA index 200 chưa đủ. |
| Mọi dashboard không có dữ liệu | Kiểm collector/Prometheus/Loki/storage/Alertmanager trước khi kết luận mọi service healthy hoặc cùng outage. |

Runbook thực nằm trong [docs/runbooks](runbooks/README.md); thư mục hiện còn là tài liệu định hướng, chưa có bằng chứng diễn tập. Mỗi owner cần thêm runbook theo mẫu:

```text
Tên incident và service / owner
Điều kiện nhận biết, impact, dashboard và alert liên quan
Query metrics/logs an toàn; dependency phải kiểm
Các bước khôi phục, quyền thao tác, idempotency và dữ liệu cần giữ
Điều kiện dừng/rollback/escalate
Cách xác minh sau phục hồi và evidence diễn tập
```

## 15. Bàn giao và Definition of Done

### 15.1. Việc từng người cần thực hiện

| Người | Bàn giao monitoring |
| --- | --- |
| Người 1 | Core/Gateway metrics và log chính xác; invariant/expiry/outbox; module payment khi có; dependency timeout và runbook DB/allocation. |
| Người 2 | Telemetry Web/Admin được sanitize, request ID cho support, synthetic journeys; pass transfer metrics/UI outcome cùng Core. |
| Người 3 | Social socket/ACL/message persistence và Notification consumer/dedupe/retry/DLQ; lag/heartbeat và runbook replay. |
| Người 4 | Identity auth/session/OAuth, Commerce stock/sale, Content query/write, Storage metadata/provider; metric phân biệt rejection với invariant. |
| Người 5 | AI health/quality/usage/recovery; scrape/exporters/log collector/tracing/dashboard/alerts/retention/permissions; monitoring stack, release và backup observability. |

### 15.2. Checklist cho PR triển khai service hoặc instrumentation

- [ ] Có owner, trạng thái implemented/proposed và link source/config; service mới có health/metrics thật, không stub trả 200.
- [ ] Metric names/types/units/labels và semantics đã ghi; không có ID/raw text làm label; counters mutation/replay đúng scope.
- [ ] Log theo schema chung hoặc có mapping rõ; redaction và exception handling không lộ token/DSN/body/chat text.
- [ ] Request ID qua HTTP; event ID/correlation qua async; tracing context chỉ công bố khi đã instrument.
- [ ] Readiness kiểm đúng dependency với timeout, liveness không gây restart dây chuyền; worker có heartbeat/progress theo contract.
- [ ] Có verification phù hợp trong PR: protected metrics/auth, route cardinality, error/timeout labels, commit/rollback/replay, dependency failure; không thêm test chỉ để giả lập coverage.
- [ ] Đã kiểm scrape bằng monitoring credential, type/labels/bucket coverage; no-data có nghĩa rõ ràng. Chỉ cấu hình target khi service đã deploy.
- [ ] Dashboard/panel và alert có owner, environment, minimum traffic khi phù hợp, severity, runbook và thông tin metric source.
- [ ] Threshold/SLO dựa baseline hoặc ghi rõ proposed; có tình huống lỗi mô phỏng an toàn và bằng chứng recovery/alert delivery trước khi gọi là operational.
- [ ] Deployment/migration/collector failure không làm mất business invariant; metric/log không là nguồn sự thật thay DB.
- [ ] File cấu hình chỉ có một nguồn deploy chính, secret được phân phối ngoài Git; cập nhật tài liệu khi thay schema/names/labels.

### 15.3. Thứ tự áp dụng

1. Giữ các metric hiện tại; sửa cách đọc dashboard/query theo mục 8. Ghi backlog các khác biệt Gateway scrape traffic, AI log fields/buckets và readiness coverage.
2. Người 5 đưa stack thu thập tối thiểu lên môi trường thử nghiệm; kết nối 3 backend đã có, log mapping và overview dashboard; xác minh token/no-data/alert delivery.
3. Mỗi skeleton khi có runtime áp dụng bộ chung và danh mục domain, sau đó mới thêm scrape/CI/deployment tương ứng. Bổ sung Web/Admin/edge telemetry cùng các journey thật.
4. Khi broker, provider, publisher/consumer và hạ tầng được triển khai, thêm exporter, age/lag/heartbeat, runbooks và cảnh báo đúng chức năng. Không bật alert cho thành phần chưa hoạt động.
5. Chạy baseline tải/lỗi/restore trong môi trường riêng, review SLO/retention/cost rồi mới sử dụng làm tiêu chí vận hành.

**Phạm vi cập nhật 27/10/2026:** thống nhất cấu hình monitoring ứng dụng tại app repo; thêm profile Compose metrics/dashboard/cảnh báo; chart dùng cùng rule/dashboard; GitOps tham chiếu chart thay cho bản sao. Không đổi instrumentation nghiệp vụ, không khởi động ứng dụng/migrate database hoặc deploy Kubernetes. Docker daemon không có trên máy kiểm tra nên cấu hình/render được kiểm riêng, chưa có bằng chứng stack Compose chạy. Logs tập trung, tracing và exporter vẫn cần triển khai.

## AI Recommendation V1

Quy tắc và panel bổ sung nằm trong cùng nguồn app-owned chart: search outcomes, proposal lifecycle, revalidation/guard/parser failures, search latency và negotiation turns. Alert khởi điểm: search failed >20% khi có ít nhất 20 search/5 phút; revalidation hoặc parser failures >=10/10 phút, giữ 5 phút. Đây là ngưỡng để review, chưa phải SLO đã đo. Chi tiết implementation/evaluation ở [AI_SERVICE_UPGRADE](AI_SERVICE_UPGRADE.md). Không bật alert lỗi tool bằng cách coi `started` là failure.
