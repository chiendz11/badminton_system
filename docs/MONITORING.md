# Monitoring Booking Core

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

## JSON logs và correlation

Pino ghi một JSON record mỗi dòng ra stdout: service, level, time, msg. HTTP log có requestId, method, route, status, durationMs và actorId nếu guard đã xác thực. Mutation log có action, reservation/booking/center ID khi phù hợp. Không ghi body, query string, Authorization hoặc cookie; credential fields của logger được redact. Xem local: `docker compose logs -f api`.

Browser gửi X-Request-Id; API chấp nhận chuỗi an toàn 8–64 ký tự hoặc cấp UUID mới, trả header này và body lỗi. AsyncLocalStorage truyền requestId vào mutation logs và correlationId trong outbox. Frontend log warning API lỗi với status/requestId, không log token. Request ID không phải tracing phân tán và không phải Prometheus label.

Để nối Loki/ELK, thu stdout JSON bằng agent của môi trường. Dùng service/env làm label; requestId/actorId/bookingId là field để tìm kiếm, không phải label index. Không log secret/DATABASE_URL; tuân theo retention/access policy khi dùng actor ID.

## Xử lý sự cố

1. Kiểm tra live/ready và database_up; xem DB/connection pool trước khi retry hàng loạt.
2. Với 409, tải lại lịch; đối chiếu requestId và allocation của sân/ngày. Không xóa exclusion constraint để xử lý xung đột.
3. Với 410, hold đã hết hạn; chọn lại slot và dùng Idempotency-Key mới.
4. Nếu hold tồn quá hạn trong DB, kiểm tra log reservation.expiry.failed; worker chạy 15 giây và mutation tiếp theo dọn hold cùng center. Availability đã bỏ qua hold hết hạn.
5. Với 5xx, tìm request.failed và http.request cùng requestId. Không gửi stack/secret cho browser.

Các test kiểm tra redaction, JWT/role, protected metrics, route cardinality, correlationId outbox, concurrency, snapshot giá, expiry và rollback trên PostgreSQL thật.
