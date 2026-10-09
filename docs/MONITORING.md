# Monitoring Booking Core, API Gateway và AI

## Metrics và health

`GET /health/live` kiểm tra tiến trình; `GET /health/ready` query PostgreSQL và trả 503 khi DB không hoạt động. `GET /metrics` dùng `Authorization: Bearer <METRICS_TOKEN>`; production bắt buộc token. Compose local dùng token mẫu `local-monitoring-only`.

```bash
curl -H 'Authorization: Bearer local-monitoring-only' http://localhost:3000/metrics
```

| Metric                                      | Ý nghĩa / labels                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `booking_core_http_requests_total`          | Request hoàn tất: method, route template, status                                                          |
| `booking_core_http_duration_seconds`        | Histogram latency theo cùng labels                                                                        |
| `booking_core_transitions_total`            | Mutation đã commit theo action: held/confirmed/released/expired/cancelled/fixed_created, center mutations |
| `booking_core_conflicts_total`              | Conflict khi cấp slot/DB unique constraint, theo operation                                                |
| `booking_core_transaction_duration_seconds` | Thời gian transaction theo operation                                                                      |
| `booking_core_active_holds`                 | Hold còn hạn tại lần scrape gần nhất                                                                      |
| `booking_core_outbox_pending`               | Event chưa có publishedAt                                                                                 |
| `booking_core_database_up`                  | 1/0 kết nối DB thành công/thất bại tại lần scrape                                                         |
| `process_*`, `nodejs_*`                     | CPU, RAM, event loop và runtime do prom-client thu thập                                                   |

Metric không có user/court/booking ID làm label. Route được chuẩn hóa (`:id`), unmatched request gom chung; không tự tính scrape `/metrics`. `fixed_created` tăng theo số occurrence, không phải số series; replay idempotent không tăng transition. Gauge hold/outbox có thể stale khi DB lỗi, nên luôn đọc cùng database_up. Conflict metric không đại diện cho mọi HTTP409 nghiệp vụ; dùng HTTP status để đo tổng các rejection.

Scrape config `monitoring/prometheus.yml` và alert `monitoring/booking-core-alerts.yml` là mẫu để ghép vào Prometheus của bạn. Mount hai file vào `/etc/prometheus/`, file token (chỉ giá trị token) tại `/run/secrets/booking_metrics_token`, nối Prometheus cùng network API hoặc đổi target. Mẫu cảnh báo DB/service unavailable 2 phút, tỷ lệ 5xx >5% trong 5 phút, p95 >1 giây. Chưa triển khai Prometheus/Grafana/Loki trong Compose này.

PromQL gợi ý:

```promql
sum(rate(booking_core_http_requests_total[5m]))
histogram_quantile(0.95, sum by (le, route) (rate(booking_core_http_duration_seconds_bucket[5m])))
sum by (action) (rate(booking_core_transitions_total[5m]))
sum by (operation) (rate(booking_core_conflicts_total[5m]))
booking_core_active_holds
booking_core_outbox_pending
```

Outbox publisher chưa triển khai nên backlog sẽ tăng khi booking được tạo/hủy. Chỉ đặt alert backlog sau khi có publisher và thống nhất SLO phát event.

Gateway (8081) có `/health/live`, `/health/ready` (gọi readiness của Core), `/metrics` bảo vệ bởi monitoring token riêng. Compose dùng `local-gateway-monitoring-only`. Metrics `api_gateway_http_requests_total` và `api_gateway_http_duration_seconds` có method/route template/status; không chứa URL raw, actor hoặc booking ID trong labels. Prometheus sample thêm job `api-gateway`; mount thêm `/run/secrets/gateway_metrics_token`. Gateway lỗi kết nối Core trả 502, timeout trả 504. Gateway không tự retry mutation; client retry với cùng Idempotency-Key.

## JSON logs và correlation

Pino ghi một JSON record mỗi dòng ra stdout: service, level, time, msg. HTTP log có requestId, method, route, status, durationMs và actorId nếu guard đã xác thực. Mutation log có action, reservation/booking/center ID khi phù hợp. Không ghi body, query string, Authorization hoặc cookie; credential fields của logger được redact. Xem local: `docker compose logs -f api gateway`.

Gateway nhận hoặc cấp X-Request-Id, chuyển sang Core trên mọi upstream request và trả lại browser; API chấp nhận chuỗi an toàn 8–64 ký tự hoặc cấp UUID mới, trả header này và body lỗi. AsyncLocalStorage truyền requestId vào mutation logs và correlationId trong outbox. Frontend log warning API lỗi với status/requestId, không log token. Request ID không phải tracing phân tán và không phải Prometheus label.

Để nối Loki/ELK, thu stdout JSON bằng agent của môi trường. Dùng service/env làm label; requestId/actorId/bookingId là field để tìm kiếm, không phải label index. Không log secret/DATABASE_URL; tuân theo retention/access policy khi dùng actor ID.

## Xử lý sự cố

1. Kiểm tra live/ready và database_up; xem DB/connection pool trước khi retry hàng loạt.
2. Với 409, tải lại lịch; đối chiếu requestId và allocation của sân/ngày. Không xóa exclusion constraint để xử lý xung đột.
3. Với 410, hold đã hết hạn; chọn lại slot và dùng Idempotency-Key mới.
4. Nếu hold tồn quá hạn trong DB, kiểm tra log reservation.expiry.failed; worker chạy 15 giây và mutation tiếp theo dọn hold cùng center. Availability đã bỏ qua hold hết hạn.
5. Với 5xx, tìm request.failed và http.request cùng requestId. Không gửi stack/secret cho browser.

Các test kiểm tra redaction, JWT/role, protected metrics, route cardinality, correlationId outbox, concurrency, snapshot giá, expiry và rollback trên PostgreSQL thật.

## AI service

Prometheus config thêm job `ai-service` tại `ai:8000`, bearer file `/run/secrets/ai_metrics_token`; token phải khớp METRICS_TOKEN của AI (Compose development: local-ai-monitoring-only). Không dùng business JWT để scrape. Readiness kiểm tra AI DB, checkpoint và Core; liveness trả provider và slot_minutes, không gọi model thật.

| Metric | Labels / ý nghĩa |
| --- | --- |
| ai_http_requests_total | method/route/status; route template không có conversation ID |
| ai_http_duration_seconds | route; latency cả lượt API |
| ai_agent_actions_total | action; quyết định của planner |
| ai_tool_calls_total | tool/outcome; search, details, create booking started/confirmed/conflict/uncertain |
| ai_llm_tokens_total | direction input/output; usage provider trả về, fake không có usage |

Logs JSON gồm requestId xuyên gateway/AI/Core, node/outcome để quan sát workflow; không ghi body, transcript, Authorization hay API key. Transcript nằm trong DB AI với owner access, không nằm trong stdout. GET trace chỉ owner đọc, không phải distributed tracing đầy đủ hay chain-of-thought. Khi nhận RETRY_BOOKING hoặc timeout lúc confirm, retry cùng client_message_id/Core intent key để lấy biên nhận; không tạo một yêu cầu đặt khác trước khi biết kết quả.

```promql
histogram_quantile(0.95, sum by (le, route) (rate(ai_http_duration_seconds_bucket[5m])))
sum by (action) (rate(ai_agent_actions_total[5m]))
sum by (outcome) (rate(ai_tool_calls_total{tool="create_booking"}[5m]))
sum by (direction) (rate(ai_llm_tokens_total[5m]))
```

Prometheus/Grafana/Loki chưa được thêm thành stack chạy trong Compose; đây là instrumentation/config để tích hợp.
