# System integration contract — Badminton Manager V2

## Phiên bản, phạm vi và nguồn sự thật

Version **0.1.0 Proposed**, ngày 18/10/2026, DRI Người 1 điều phối, từng owner chịu trách nhiệm domain. Bản này bao phủ các thành phần đích và critical interaction của tuần 4–5; **chưa là hợp đồng được toàn nhóm chấp thuận hoặc tài liệu endpoint đã deploy**. Các thông số còn mở và raw provider webhook có danh sách riêng cuối tài liệu.

| Lớp | Nguồn chuẩn | Trạng thái |
| --- | --- | --- |
| Booking Core đang có | [OpenAPI](../contracts/booking/openapi.json), [BOOKING_CORE](BOOKING_CORE.md) | Runtime baseline fbd3d4d |
| Gateway đang có | [OpenAPI](../contracts/gateway/openapi.json), [API_GATEWAY](API_GATEWAY.md) | Runtime baseline, giữ UI compatibility |
| AI đang có | [AI_SERVICE](AI_SERVICE.md), [AI schemas](../contracts/ai-tools/) | Runtime planning/execution; không phải read-only |
| Booking events đang có | [booking-event schema](../contracts/events/booking-event.schema.json) | Outbox record; chưa có publisher/broker mới |
| Toàn hệ thống bổ sung | [OpenAPI theo service](../contracts/README.md), [event](../contracts/events/domain-event.schema.json), [Socket](../contracts/sockets/social-event.schema.json), [examples](../contracts/booking/openapi.examples.json) | Proposed; đã có CI kiểm contract, chưa có runtime tương ứng |
| Yêu cầu nghiệp vụ | [BRD baseline](BRD.md), [BRD V2](week-4/BRD_SYSTEM_V2.md) | Hai phạm vi được ghi rõ, không ghi đè baseline |

Nếu prose và schema proposal lệch nhau, không tự triển khai một bên: owner sửa cùng PR trước G02. Operation implemented mô tả baseline; proposed chưa có runtime. Schema request/response baseline tiếp tục là nguồn chuẩn. Source legacy pin commit 484d381e; provenance và mapping ở [delivery index](DELIVERY_W04_W05.md).

## Contract theo service và public/native paths

Mỗi service/API có `contracts/<owner>/openapi.json`; Gateway tham chiếu provider Path Items cho public proposals, mapping ở `x-upstreams`. Provider tương lai dùng base `/api/v1`; bảng REST dưới đây liệt kê **public Gateway paths**. Ví dụ `/api/booking/pass-posts` → Core `/api/v1/pass-posts`, `/api/social/conversations` → Social `/api/v1/conversations`, `/api/ai/v1/chat` → AI `/v1/chat`. Internal/health có server origin riêng, không nhập vào Gateway public.

Booking/Gateway/AI có cả current và proposed operations với nhãn rõ. Sửa OpenAPI không tự thêm route hoặc đổi auth. [Catalog](../contracts/README.md) chỉ rõ owner, ví dụ và cách kiểm tra.

## Ownership và bên cung cấp/tiêu thụ

| Provider / DRI | Caller / consumer | Đường giao tiếp | Dữ liệu được sở hữu |
| --- | --- | --- | --- |
| Gateway / N1 phối hợp N5 | Web, Admin | HTTP/BFF và GraphQL center compatibility | Không có domain database |
| Identity / N4 | Gateway/Core/Social/AI/Commerce | JWT verify và user/assignment API; user-updated event | Account, session, profile, role, assignments |
| Core / N1; pass module N2 | Gateway, AI read tools, Social context lookup | REST + outbox events | Center/court/pricing/hold/booking/payment/pass/transfer |
| Commerce / N4 | Admin qua Gateway | REST + local outbox | Product, balance, movements, sale, invoice |
| Social / N3 | Web qua REST/Socket; Notification event consumer | /api/social, /social Socket.IO namespace | Friendship, conversation, message, read cursor |
| Content / N4 | Web/Admin qua Gateway | REST | Review/rating/news/moderation |
| Notification / N3 | Event producers, Web/Admin | RabbitMQ consume + /api/notifications | Inbox/delivery/in-app notification/read state |
| Storage / owner đề xuất N4+N5 | Domain services/Web/Admin | Multipart/file metadata REST | File metadata; Cloudinary sở hữu object |
| AI / N5 | Web qua Gateway; Core public read tools | Current conversations hoặc proposed /api/ai/v1/chat | Conversation/workflow state; không owner lịch/giá |
| Platform / N5 | Mọi service | Health/metrics/logs/tracing/secrets | Cấu hình vận hành; không owner business state |

Không đọc/ghi database service khác. User/center foreign references không là FK xuyên database. Projection chỉ đọc có version/reconciliation. Gateway truyền token/correlation, adapter dữ liệu, không ghi thẳng bảng domain.

## Primitive và quy ước dữ liệu

| Khái niệm | Contract |
| --- | --- |
| Business ID | Entity mới dùng public UUID; userId giữ string1..128 để tương thích sub hiện tại. Map ObjectId/publicUserId legacy có bảng mapping, không tự ép kiểu |
| Time | RFC3339 UTC `...Z` cho timestamp; `YYYY-MM-DD` là ngày nghiệp vụ Asia/Ho_Chi_Minh |
| Slot | 60 phút, startMinute 0..1380 bội60, durationMinutes bội60; start+duration ≤1440 và trong giờ mở cửa do business validation |
| Price | Integer VND ≥0; server authoritative; tránh vượt safe integer, kiểm tổng và conversion |
| Paging | cursor opaque + limit1..100 (default20) cho API mới, response items/nextCursor; baseline giữ format cũ |
| Concurrency | Version/CAS hoặc row lock + DB constraints, không dùng UI cache/Redis lock làm bảo vệ cuối |
| Headers | Authorization Bearer, X-Request-Id, Idempotency-Key với thao tác ghi đã chỉ định; browser CORS allowlist và expose request ID |
| Sensitive fields | Không token/password/secret/raw chat trong logs; metric labels chỉ cardinality thấp |

Ví dụ 18:00–20:00 là startMinute1080/durationMinutes120, tương ứng hai slot, không bốn slot30phút. Date/giờ/mã ID sai phải trả lỗi validation; 18:30 cần hỏi người dùng chọn giờ tròn.

## Authentication và authorization

Current Gateway dùng HS256, issuer `badminton-identity`, audience `badminton-system`; yêu cầu sub string, role lowercase và exp hợp lệ khi bearer được gửi. Không có header bearer thì authenticate cho qua để route public đọc được; route ghi/private gắn authorize. Core verify lại JWT trong common/auth và kiểm resource owner/manager. Identity service hiện chưa được triển khai.

Demo token ở Core `src/modules/development` chỉ hoạt động khi NODE_ENV=development và ENABLE_DEMO_AUTH=true; nó không phải Identity service hay production login. Khi triển khai Identity cần loại demo auth khỏi đường production và kiểm việc mint/revoke/rotation thật.

Target claim profile: sub,role,iss,aud,iat,exp,jti theo ADR-006; không coi fields target đã enforce đều trong runtime hiện tại. Không forward role/userId bằng header tự khai thay JWT. Algorithm/JWKS migration cần đồng bộ verifier và key rotation, không chấp nhận token legacy userId/uppercase mà không mapping.

| Resource | Authorization bắt buộc |
| --- | --- |
| Booking/pass | Owner hoặc assigned center manager theo từng action; transfer chỉ seller hiện tại |
| Center/stock/sale/invoice | center_manager của center, hoặc super_admin; audit ghi nhạy cảm |
| Role/assignment | super_admin, không self-escalation qua profile |
| Chat/history/socket | Conversation member + context write state; role admin không tự bỏ ACL |
| Notification | recipientUserId=actor |
| Content | Public published; write/moderate theo editor/admin policy còn chốt |
| Storage | Uploader/domain/center scope, file type, MIME/content/size allowlist; invoice private |
| AI | Conversation owner, Core tool scope theo actor, không cross-user context |
| Internal API/metrics | Workload identity/service audience+scope hoặc monitoring credential riêng; không chỉ user JWT |

Internal endpoints không expose public qua ingress. Refresh cookie HttpOnly/Secure + rotation/CSRF là proposal; expiry/revocation/retention phải được review trước triển khai. OAuth state/PKCE, allowlisted callback, chống account linking bằng email tự khai; callback provider details cần contract riêng khi cấu hình provider thật.

## REST routing và request/response

Baseline Core server `/api/v1`, Gateway `/api` + `/graphql`; không đổi route cũ trong lần tài liệu này. Target prefixes:

| Prefix | Provider | Critical operations / schema |
| --- | --- | --- |
| /api/identity | Identity | register/login/refresh/logout/me/role/assignments; Actor, TokenResponse |
| /api/booking/pass-posts | Core pass | list/create/detail/cancel/interest/listInterests/transfer; PassPost/TransferResult |
| /api/booking/payments | Core payment | checkout/status; Checkout/PaymentStatus |
| /api/commerce | Commerce | products/inventory/stock-receipts/sales/invoices/reports; Sale/Invoice/Balance |
| /api/social | Social | friendships/conversations/messages/read; Conversation/Message |
| /api/content | Content | center reviews/moderation/news/publication |
| /api/notifications | Notification | list/read/read-all; own recipient |
| /api/storage | Storage | file upload/detail/delete/bulk-urls; FileMetadata |
| /api/ai/v1/chat | AI proposal | read-only chat; AIChatRequest/Response; chưa thay current conversations |
| /internal/identity | Identity | trusted service lookup; ServiceBearer |
| /internal/booking/payments/verified-events | Core adapter | normalized verified event, **không phải raw webhook public** |

Chi tiết fields/required/format/example nằm trong OpenAPI provider/Gateway, không có prefix /api/conversations mới cho Social vì đang trùng AI. Browser chỉ gọi Gateway/edge, không biết địa chỉ DB hoặc internal service credential. Internal route và health dùng server origin service tương ứng, không route dưới public gateway mặc định.

### Idempotency / timeout / retry

- Mutation có Idempotency-Key: scope `(actor,operation,key)`, fingerprint canonical payload, lưu key/result trong transaction cùng side effect. Concurrent same key phải serialize/replay, khác payload trả409 IDEMPOTENCY_CONFLICT.
- Key8..128, chữ/số/underscore/hyphen theo baseline; request đang thực hiện không được chạy bản thứ hai. Thời gian giữ key cho API mới cần chốt, không hứa dedupe vô hạn. Operation retry sau timeout giữ key/body, đọc status nếu chưa rõ kết quả.
- PUT/DELETE interest, read cursor/notification/cancel lặp có semantics idempotent như OpenAPI; không dùng toggle quan tâm legacy. `clientMessageId` dedupe theo actor/room, khác content cùng id phải409.
- GET chỉ retry có giới hạn; mutation không retry với key mới. Timeouts/backoff/retry budgets cần chốt từ tải và dependency, tôn trọng Retry-After cho429.
- **Gap hiện tại:** Web daily booking chưa gửi Idempotency-Key, Gateway có thể tạo UUID mới cho mỗi lần gọi; bản contract này không tự sửa UI. Backend/Ai/Admin có khả năng idempotency không đồng nghĩa toàn hành trình Web đã an toàn retry.

### Errors và compatibility

API mới trả `{code,message,requestId,details?}`; details chỉ field lỗi an toàn, không stack/SQL/token. Baseline Gateway đang trả `{message,requestId}` và Core có shape riêng; adapter/version rollout phải được implement trước khi UI đòi `code` ở route cũ.

| HTTP | Code ví dụ | Ý nghĩa |
| --- | --- | --- |
| 400 | VALIDATION_ERROR, INVALID_RECEIVER | Body/giờ/receiver sai |
| 401 | UNAUTHENTICATED | Thiếu/sai/hết hạn danh tính |
| 403 | FORBIDDEN | Đúng danh tính, sai quyền resource |
| 404 | NOT_FOUND | Resource không có hoặc ẩn theo policy |
| 409 | SLOT_CONFLICT, PASS_NOT_ACTIVE, INSUFFICIENT_STOCK, IDEMPOTENCY_CONFLICT | Conflict nghiệp vụ/concurrency |
| 410 | RESERVATION_EXPIRED | Baseline hold hết hạn; Core đã cleanup allocation |
| 429 | RATE_LIMITED | Limit/cooldown, Retry-After |
| 502/504 | UPSTREAM_ERROR, UPSTREAM_TIMEOUT | Gateway dependency lỗi; trạng thái ghi chưa chắc thất bại |
| 503 | DEPENDENCY_UNAVAILABLE | Domain chưa xác minh được dependency, fail-closed |

Unknown field bị từ chối ở payload mới (additionalProperties=false). Breaking field/type/required/enum cần version mới hoặc migration có compatibility tests. Không chỉ sửa schema để consumer đang dùng tự hết lỗi.

## Transaction flows liên thành phần

### Booking và payment

Current reserve→confirm đi thẳng booking, chưa có payment. Target: Core giữ allocation với TTL; tạo attempt/check-out với amount server; gọi provider ngoài transaction; raw webhook adapter kiểm canonical signature/order/amount/currency và dedupe; transaction local cập nhật payment/booking/outbox. Redirect trình duyệt chỉ để UI poll trạng thái.

Webhook paid đến sau hold expiry hoặc amount mismatch phải reconciliation, không cướp slot của booking mới. Duplicate/out-of-order events không làm confirm hai lần. Cách tạo orderCode, chữ ký webhook PayOS và refund cụ thể thuộc ADR-010 W7, chưa đóng băng trong tuần5. VerifiedPaymentEvent JSON chỉ được tạo sau adapter xác minh bằng credential đáng tin cậy, tuyệt đối không công khai endpoint normalized đó.

### Pass / chat / transfer

1. Seller tạo post từ booking đủ điều kiện, Core derive seller và price/expiry rule.
2. Buyer PUT interest, POST PASS_BOOKING conversation; Social lookup Core đúng post ACTIVE, derive seller, pair membership và unique room.
3. Socket JWT + membership guard; persist message → ack/emit. Gửi lại clientMessageId không tạo message mới.
4. Seller chọn receiver và gọi transfer với stable key. Core kiểm current owner, booking/post state, receiver; lock/CAS và commit owner+SOLD+audit+outbox+idempotency result cùng transaction. Slot không đổi.
5. Social consume transfer/closed event để đổi write state, Notification consume để thông báo. Event lặp không lặp effect; mất event có reconciliation. Close state không chỉ tin cache vô hạn, write fail-closed khi không xác minh được ACTIVE.

### POS và storage

Commerce chọn giá server, validate quantity và manager center, trừ tồn conditional/lock rồi tạo sale/items/invoice/movements/outbox trong cùng transaction; insufficient stock rollback tất cả. Không gọi Inventory HTTP như legacy.

Storage upload provider + metadata không có ACID chung; trạng thái pending/ready/failed và cleanup/reconcile. Domain lưu fileId, không lấy URL/assetId client làm chứng minh quyền. Xóa file phải kiểm domain ownership và xử lý reference policy được duyệt.

## Events và Socket contract

Schema baseline booking: id,type,aggregateId,createdAt,payload (bookingId,reservationId,centerId,userId,date,totalPrice,selections). Hai loại booking.confirmed.v1/cancelled.v1 giữ nguyên.

Schema event bổ sung V2 giữ các tên base đó, thêm schemaVersion=1,producer,correlationId; payload discriminated theo `type`. [W05-N3](week-5/W05-N3_social-events.md) có đủ producer/consumer/payload của bảy loại mới. Không tự đổi tên legacy envelope hoặc sửa consumer đang chạy.

Transport RabbitMQ at-least-once, routing theo event type/exchange được chốt ở implementation; outbox publisher giữ immutable eventId qua retry. Consumer ACK sau local persist, inbox unique `(consumer,eventId)`; notification unique `(eventId,recipientId,channel)`. Retry/backoff hữu hạn + DLQ + alert + replay giữ ID, không tuyên bố exactly-once. Không có publisher/broker wiring mới trong skeleton.

Socket.IO `/socket.io`, namespace `/social` là proposal. Handshake `auth.accessToken` thay query token; server verify origin/JWT, reconnect không tự kế thừa quyền. Schema envelope direction/event/payload dùng làm tài liệu/validation, tên event và payload tương ứng emit Socket.IO. Client events joinConversation/sendMessage/markRead/leaveConversation; server events messageAck/newMessage/readReceipt/conversationUpdated/error. Không client-controlled sender. Schema và threat cases đầy đủ ở W05-N3.

## AI read tools và policy đang mở

AI chỉ được dùng Core public/read API qua typed client, không truy SQL DB Core. Đích mới allowlist search_centers/get_pricing/search_availability/search_faq, source/version/constraints ghi vào response; hỏi lại khi thiếu dữ kiện hoặc thời gian không align60phút. Core snapshot không đảm bảo hold.

**Runtime hiện tại vẫn có execution sau xác nhận.** ADR-008 phải quyết định giữ execution hay chuyển read-only; các schema/read-only no-write expectations là proposal và chưa mô tả đúng toàn bộ API đang chạy. Không đổi tên mode trong docs để tuyên bố đã an toàn no-write.

## Operations và verification

Service mới dự kiến `/health/live`, `/health/ready`, private `/metrics`; health chưa tồn tại trong folder-only skeleton. Readiness timeout dependency, logs JSON requestId/traceId/service/eventId/status/duration, metrics cardinality thấp. Không log Authorization, secret, password, full PII/chat. Runtime ports baseline Core3000/Gateway8081/AI8000; port các service mới chỉ là đề xuất ở W05-N5.

Schema validation/examples chỉ kiểm cấu trúc, không kiểm JWT/ACL/business invariants. Khi triển khai phải có provider/consumer tests, negative permission tests, concurrency booking/transfer/POS, duplicate/out-of-order event cases, raw webhook signature cases, Socket reconnect và AI no-write/grounding evaluation. Không chạy application tests hoặc deploy trong lần docs/folder này.

## Quyết định còn mở trước khi đóng băng contract

| Mục | Owner | Cần chốt / evidence |
| --- | --- | --- |
| AI execution vs read-only | N1/N2/N5 + chủ sản phẩm | ADR-008, UI/tool/session migration và regression plan |
| Pass cap/expiry/repost/receiver | N1/N2 | ADR-004 + acceptance nghiệp vụ |
| Payment/refund/cutover | N1 | Provider raw webhook, state machine, ADR-010 W7 |
| JWT/refresh/CSRF/revocation | N4 + mọi verifier | ADR-006, thời hạn key/token và OAuth callback thực |
| Notification retry/retention | N3/N5 | Ngưỡng/backoff/DLQ/outbox ADR-011 W8 |
| Storage owner/size/ACL/reference policy | N4/N5 | File types, upload limits, cleanup và private assets |
| Content/check-in/POS return/thuế | N1/N4 + chủ sản phẩm | Rules chưa có căn cứ duyệt từ source |
| SLO/budget/RPO/RTO/retention | Từng owner + N5 | Load/eval/restore evidence thật |

G02 chỉ đạt khi nhóm review và cập nhật các quyết định ảnh hưởng contract. Bản này chuẩn bị đủ nhóm thành phần/giao tiếp để review; không giả lập các chỗ chưa thống nhất thành “đã chốt”.
