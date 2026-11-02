# W05-N5 — AI API/tool spec, deployment và ADR

| Thuộc tính | Giá trị |
| --- | --- |
| DRI | Người 5 — AI Service · MLOps · Platform |
| Peer reviewer của task | Người 3 |
| Deliverable gốc, ô H11 | AI API/tool spec + system deployment + ADR |
| Ưu tiên / giờ dự kiến | P0 / 9 giờ |
| Phụ thuộc | W4 AI/NFR; W5 boundary |
| Definition of Done gốc | Chốt model baseline/eval, tech budget, port/secrets, platform NFR. |
| Nguồn kế hoạch | Sheet “Kế hoạch 10 tuần”, A11:O11 |
| Đầu ra của tuần | Tài liệu thiết kế kỹ thuật và contract |

Tài liệu trình bày thiết kế trong tuần 5: ranh giới thành phần, mô hình dữ liệu và contract làm đầu vào cho giai đoạn triển khai.

## AI design và công nghệ

Thiết kế dùng FastAPI/Pydantic cho HTTP và schema validation. Retrieval bắt đầu bằng lexical baseline để có mốc đánh giá chi phí thấp, sau đó so sánh embedding retrieval/rerank. LLM đi qua provider adapter có timeout/quota và optional fallback; model/prompt/dataset được version cùng report đánh giá.

Đặc tả tuần 5 dùng profile read-only: Gateway `/api/ai/v1/chat` → AI `/v1/chat`, hỗ trợ hỏi đáp và gợi ý rồi chuyển người dùng sang Booking UI. Đây là contract thiết kế; mô tả implementation hội thoại hiện tại được quản lý riêng tại [AI_SERVICE](../AI_SERVICE.md).

## AI API/tool contract đề xuất

```json
{"conversationId":null,"message":"Ngày mai 18h đến 20h ở trung tâm A","clientMessageId":"msg-00000001"}
```

Response: conversationId,reply,constraints(date/startMinute/durationMinutes/centerId/...),options[],sources[],needsClarification,requestId. Không có bookingCreated hoặc confirmation token trong read-only response. Option hiển thị snapshot rồi dẫn Booking UI kiểm tra lại, không giữ sân.

| Tool allowlist mục tiêu | Input | Output / giới hạn |
| --- | --- | --- |
| search_centers | query/location/limit | Center public fields; giới hạn kết quả |
| get_pricing | centerId,date | Pricing public, VND nguyên |
| search_availability | centerId,date,startMinute,durationMinutes | Slots 60 phút, Core snapshot |
| search_faq | query,topK | Answer chunks/sourceId/corpusVersion |

Tool read tham chiếu [search-availability schema](../../contracts/ai-tools/search-availability.schema.json). Profile read-only không có SQL credential Core hoặc quyền createReservation/createBooking/transfer/payment. Tiêu chí no-write phải được kiểm chứng bằng tool allowlist và bộ abuse cases đúng profile trong giai đoạn triển khai.

## Evaluation / model artifacts

Dataset manifest: source checksum/version, preprocessing version, license/PII review, split by FAQ group, gold labels, model/provider version, prompt/tool schema version. Report gồm schema validity, constraint F1/critical accuracy, retrieval recall/MRR, grounded answers, abuse/no-write, p95 latency và token cost. Fake-provider golden không thay thế model evaluation.

`model-artifacts/ai` chỉ chứa metadata/URI/hash khi có, không weights hoặc khóa. Corpus và dữ liệu đánh giá được quản lý theo manifest, version và quyền truy cập. Cache key cần corpus/model/version và không giữ PII vô hạn; retention phải được duyệt.

## Thiết kế deployment và environment matrix

| Môi trường | Thiết kế sử dụng | Cấu hình và secret |
| --- | --- | --- |
| Local | Compose chạy các thành phần được triển khai theo từng giai đoạn | Env local, credential riêng theo môi trường |
| Local toàn hệ thống | Service runtime, PG/Mongo/RabbitMQ/Redis và reverse proxy theo kiến trúc | Secret/port tách theo service, dependency health và migration jobs |
| CI | Matrix theo component, contract validation, lint/typecheck/test/build/scan | Test fixtures cô lập, secret theo job có quyền |
| Staging | K8s/ingress/TLS/network policy và smoke/rollback gate | Secret delivery, resource limits, telemetry và deployment revision |
| Production | Triển khai theo sizing, SLO, backup/restore và release/rollback plan | Secret manager/external secret, least privilege, không default credential |

Port tham chiếu trong [compose.yml](../../compose.yml): Core 3000, Gateway 8081, AI 8000 trong container. Port **đề xuất nội bộ**: Identity 3002, Commerce 3003, Social 3004, Content 3005, Notification 3006, Storage 3007. Thiết kế staging/production chỉ public Nginx/ingress qua 443; DB/RabbitMQ/Redis và các backend ở private network. Port map là đầu vào cho Compose/manifests và network policy khi triển khai.

Secret/env names dự kiến: DATABASE_URL từng store; JWT issuer/audience/key material; RABBITMQ_URL; REDIS_URL; CLOUDINARY_URL hoặc bộ credential riêng; LLM provider/base URL/model/key; METRICS_TOKEN. Validation fail-fast nếu thiếu, redaction token/Authorization và secret; không ghi secret vào artifact. Không in resolved Compose env chứa secret.

## CI/release/observability proposal

1. PR: format/lint/typecheck, domain unit tests, integration DB fixtures cô lập, contract examples, build, dependency/image scan. Quyền merge hiện tại dùng aggregate `CI / required`; component được tích hợp khi có runtime và checks tương ứng.
2. AI: fake golden hồi quy + evaluation thật tách bằng credential/quota trên job kiểm soát; quality gate versioned.
3. Release: immutable image tags/digests, deploy staging, smoke/security/rollback gate rồi promote theo release plan.
4. Logs JSON requestId/traceId/service/eventId/status/duration, redact PII. Metrics HTTP rate/error/p95, DB pool, allocation conflict, transfer conflict, stock reject, outbox lag, RabbitMQ redelivery/DLQ, sockets, AI tool/errors/tokens.
5. Dashboard/alert phải có owner, threshold từ load baseline; không gắn userId/conversationId vào metric labels.

## Thiết kế health và observability

`/health/live` kiểm process; `/health/ready` kiểm dependencies tối thiểu với timeout; `/metrics` chỉ monitoring identity. Service mất LLM có thể degrade FAQ nếu policy cho phép, không fake answer. Health, timeout và monitoring là tiêu chí triển khai service, thống nhất với [MONITORING](../MONITORING.md).

[ADR-008](../adr/ADR-008.md) mô tả profile AI/evaluation; [ADR-009](../adr/ADR-009.md) mô tả platform, observability và delivery. Người 5 điều phối nền tảng; từng service owner cung cấp metric, invariant và kết quả kiểm chứng của service trong giai đoạn triển khai.

## Đầu ra tài liệu và bàn giao

- AI API/tool spec, evaluation/model-artifact design và deployment matrix.
- Port/secrets, CI/release, health/metrics và trách nhiệm platform.
- Đầu vào liên quan: [quy ước monitoring](../MONITORING.md).
