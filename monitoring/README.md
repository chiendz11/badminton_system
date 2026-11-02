# Monitoring của ứng dụng

Repo app là nguồn quản lý duy nhất cho rule cảnh báo, dashboard và ServiceMonitor của các service ứng dụng. Compose và Helm cùng đọc các file rule/dashboard bên trong chart; không sinh rồi giữ thêm một bản production ở repo GitOps.

```text
monitoring/
├── chart/
│   ├── rules/             # một file rule cho mỗi backend
│   ├── dashboards/        # JSON dùng chung local/Kubernetes
│   ├── templates/         # ServiceMonitor, PrometheusRule và dashboard ConfigMap
│   └── values.yaml        # bật 3 backend hiện có; 6 skeleton tắt mặc định
├── local/
│   ├── alertmanager.yml   # receiver local, không gửi thông báo ra ngoài
│   └── grafana/           # tự provision datasource và dashboard local
├── prometheus.yml         # địa chỉ thu thập trong network Compose
└── check.py               # kiểm tra nguồn chung, Helm và Compose
```

## Chạy local

Cần Docker daemon và Docker Compose từ 2.23.1 trở lên vì dùng `configs.content` để mount monitoring token. Giữ cấu hình LLM riêng trong `.env` hiện có; các biến monitoring có giá trị mặc định local, không cần ghi đè `.env` để chạy profile.

```bash
docker compose --profile monitoring up -d --build
docker compose --profile monitoring ps
```

| Giao diện | Địa chỉ |
| --- | --- |
| Grafana | http://localhost:3001 — mặc định `admin` / `local-grafana-only` |
| Prometheus | http://localhost:9090 — xem Targets, Rules và Alerts |
| Alertmanager | http://localhost:9093 — receiver local chỉ hiển thị cảnh báo |

Dashboard **Badminton — Backend overview** trong folder **Badminton** được provision tự động. Chọn environment `local`; tạo request qua Web/Admin/Gateway để có dữ liệu nghiệp vụ. Rule lỗi/độ trễ yêu cầu ít nhất 20 request trong cửa sổ 5 phút và giữ điều kiện 5 phút, nên healthcheck đơn thuần chưa làm các rule đó phát cảnh báo.

Compose mount trực tiếp `chart/rules/` và `chart/dashboards/`; Helm cũng đọc chính các file này qua `.Files.Get`. Prometheus local chỉ nạp rule của Booking Core, API Gateway và AI. Token thu thập lấy từ cùng biến `BOOKING_METRICS_TOKEN`, `GATEWAY_METRICS_TOKEN`, `AI_METRICS_TOKEN` với biến `METRICS_TOKEN` của service. Không dùng business JWT để thu metrics.

Khi không cần monitoring:

```bash
docker compose --profile monitoring stop prometheus grafana alertmanager
```

Prometheus giữ dữ liệu local 3 ngày; các volume monitoring độc lập với volume database ứng dụng. Profile hiện gồm metrics, dashboard và cảnh báo. Logs vẫn xem bằng `docker compose logs`; chưa bổ sung Loki/collector, tracing, PostgreSQL exporter hoặc browser telemetry. Sáu service skeleton chưa có runtime để thu thập.

## Dùng cùng nguồn trên Kubernetes

Repo `badminton-gitops` cài kube-prometheus-stack, quản lý hạ tầng môi trường, secret delivery và networking. Argo Application `application-monitoring` tham chiếu `monitoring/chart` trong repo app. Chart tạo ServiceMonitor/PrometheusRule cho backend đã bật và ConfigMap dashboard để Grafana sidecar đọc. Monitoring của nền tảng như Argo CD vẫn thuộc GitOps.

Trước lần sync đầu, commit/push chart lên app repo, lấy commit SHA đầy đủ 40 ký tự rồi điền vào `spec.source.targetRevision` của `applications/application-monitoring.yaml` trong GitOps. Marker `UNCONFIGURED_MONITORING_COMMIT` chỉ là trạng thái chưa phát hành; không sync marker và không tự chuyển sang nhánh `main`. SHA được chọn trong PR GitOps sau khi phiên bản chart tương ứng đã được publish.

Giá trị môi trường như `environment`, `workloadNamespace`, `monitoringRelease`, namespace dashboard và các service được bật do GitOps truyền vào Helm. Nội dung rule/dashboard vẫn do app quản lý. Default bật 3 backend hiện có; rule của 6 skeleton được chuyển về app để giữ contract dự kiến, nhưng chưa được local nạp hoặc Helm render. Chỉ bật sau khi có runtime, secret, `/metrics`, metric/label thực tế và kiểm tra phù hợp.

Trước lần chuyển quyền quản lý nếu cluster đã có ServiceMonitor/PrometheusRule do workload Application cũ sở hữu, cần review trạng thái Argo và chuyển quyền trước khi prune bản cũ. Không chạy hai Application cùng quản lý lâu dài một resource.

Ngưỡng khởi điểm dùng chung: HTTP 5xx >5%; p95 Core/Gateway >1 giây, AI >2 giây. Đây là ngưỡng cảnh báo ban đầu, chưa là SLO đã đo; AI histogram hiện chưa phù hợp để đặt ngưỡng 20 giây. Các biểu thức tổng hợp theo `environment`/`service` để tránh trộn tải giữa môi trường.

## Kiểm tra cấu hình

Python cần PyYAML 6.0.3, Helm và Docker Compose CLI; kiểm tra tĩnh không cần Docker daemon:

```bash
python monitoring/check.py
```

Nếu có Prometheus tooling native:

```bash
python monitoring/check.py --promtool /path/to/promtool
```

CI kiểm tra chart, cấu hình Compose, rule bằng promtool và đối chiếu nội dung Helm render với chính nguồn local. Kiểm tra cấu hình không thay thế việc mở dashboard, xác nhận targets UP và thử chu kỳ cảnh báo khi stack thực sự chạy. Quy ước toàn nhóm nằm ở [docs/MONITORING.md](../docs/MONITORING.md).
