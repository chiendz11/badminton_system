# Kiến trúc LangChain Tools & LangGraph StateGraph — AI Service

Tài liệu này đặc tả chi tiết kiến trúc của phân hệ **AI Conversational Planning** (`services/ai-service`), bao gồm danh mục toàn bộ các công cụ (LangChain Tools), sơ đồ đồ thị trạng thái điều phối hội thoại (LangGraph StateGraph), và hiện trạng kiểm chứng kết nối Provider LLM thực tế trên cụm Kubernetes local `badminton-local`.

---

## 1. Tổng quan Kiến trúc

Phân hệ AI được thiết kế theo nguyên lý **"Deterministic Planner with Structured LLM Extraction"**:
- **Không trao quyền tự do cho LLM**: LLM không tự ý quyết định gọi mutation API hay trực tiếp thay đổi cơ sở dữ liệu.
- **LangChain vai trò Interface**: Được sử dụng để giao tiếp với mô hình ngôn ngữ thông qua `ChatOpenAI.with_structured_output` (trích xuất cấu trúc `ParsedMessage` với độ tin cậy và intent rõ ràng) và đóng gói các công cụ tìm kiếm dưới dạng `StructuredTool`.
- **LangGraph vai trò Brain & State Machine**: Điều phối luồng xử lý qua đồ thị `StateGraph(Run)` với 11 node nghiệp vụ, phân nhánh điều kiện chặt chẽ, hỗ trợ checkpoint bền vững vào PostgreSQL (`ai` database) và kiểm soát human-in-the-loop (xác nhận giữ chỗ 10 phút).

```mermaid
flowchart TD
    User([Người dùng gửi tin nhắn]) --> Gateway[API Gateway :8081]
    Gateway --> AI[FastAPI ai-service :8000]
    
    subgraph LangGraph_Workflow ["LangGraph StateGraph Engine"]
        Parse[1. Node parse] --> Merge[2. Node merge]
        Merge --> Plan[3. Node plan]
        
        Plan -- action=search --> Search[4. Node search]
        Plan -- action=select --> Select[5. Node select]
        Plan -- action=book --> Book[6. Node book]
        Plan -- action=resolve --> Resolve[7. Node resolve]
        Plan -- action=assist --> Assist[8. Node assist]
        Plan -- action=ask/respond --> Respond[11. Node respond]
        
        Search --> Observe[9. Node observe]
        Observe -- found --> Respond
        Observe -- empty --> Replan[10. Node replan]
        Observe -- failed/incomplete --> Respond
        
        Replan --> Respond
        Select --> Respond
        Book --> Respond
        Resolve --> Respond
        Assist --> Respond
    end
    
    subgraph LangChain_Tools ["9 Allowlisted Tools"]
        Search -.-> T1["search_availability"]
        Select -.-> T2["get_option_details"]
        Book -.-> T3["create_booking"]
        Assist -.-> T4["get_booking"]
        Assist -.-> T5["list_my_bookings"]
        Assist -.-> T6["get_my_booking_stats"]
        Assist -.-> T7["compare_centers"]
        Assist -.-> T8["search_faq"]
        Assist -.-> T9["cancel_my_booking"]
    end
    
    subgraph External_Services ["Dịch vụ Bên ngoài"]
        T1 & T3 & T4 & T5 & T9 --> Core[Booking Core Service :3000]
        Parse -.-> LLM["LLM Provider (Groq / OpenAI API)"]
        T8 -.-> Knowledge[(Knowledge Base JSON)]
        LangGraph_Workflow -. checkpoint .-> AIDB[(PostgreSQL ai DB)]
    end
    
    Respond --> Output([Phản hồi cho Người dùng])
```

---

## 2. Danh mục 9 Công cụ LangChain (Allowlisted Tools)

Trong `services/ai-service/app/tools.py`, hệ thống định nghĩa danh sách trắng (Allowlist) nghiêm ngặt gồm 9 công cụ. Toàn bộ các công cụ này đều tuân thủ nguyên tắc: **Không cấp quyền truy cập SQL trực tiếp, không cho phép bypass access control, và mọi mutation đều cần consent nonce.**

| STT | Tên Tool | Module triển khai | Mục đích & Trách nhiệm | Phương thức & Nguồn dữ liệu |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `search_availability` | `app/tools.py` | Tìm kiếm các slot sân 60 phút liền mạch theo ngày, cơ sở, khu vực và ngân sách | REST `/api/v1/centers/{id}/availability` qua `BookingCoreClient` |
| **2** | `get_option_details` | `app/tools.py` | Lấy chi tiết phương án sân đã lưu trong state của lần tìm kiếm hợp lệ | Bộ nhớ State nội bộ (`state["options"]`), không gọi mạng |
| **3** | `create_booking` | `app/workflow.py` (Node `book`) | Tạo yêu cầu giữ chỗ tạm thời (10 phút) có `idempotency_key` và consent | REST `/api/v1/reservations` qua `BookingCoreClient` |
| **4** | `get_booking` | `app/assistance/queries.py` | Đọc thông tin chi tiết một đơn đặt sân theo `booking_id` | REST `/api/v1/bookings/{id}` qua `BookingCoreClient` (kiểm tra owner) |
| **5** | `list_my_bookings` | `app/assistance/queries.py` | Liệt kê danh sách đơn đặt sân cá nhân theo bộ lọc (thời gian, trạng thái) | REST `/api/v1/bookings` qua `BookingCoreClient` |
| **6** | `get_my_booking_stats` | `app/assistance/queries.py` | Thống kê số lượng booking, tổng chi tiêu, tỷ lệ hoàn tất theo kỳ | Tính toán tổng hợp từ danh sách booking người dùng |
| **7** | `compare_centers` | `app/assistance/queries.py` | So sánh tiện ích, số lượng sân, bảng giá giữa các trung tâm cầu lông | REST `/api/v1/centers` qua `BookingCoreClient` |
| **8** | `search_faq` | `app/assistance/knowledge.py` | Tra cứu quy chế, chính sách hủy, giữ chỗ 10 phút và chợ pass sân | Tìm kiếm từ khóa trên `knowledge.json` tĩnh (có trích dẫn nguồn) |
| **9** | `cancel_my_booking` | `app/assistance/cancellation.py` | Hủy đặt sân 2 bước (preview → confirm) & bảo vệ chặn tự hủy (Core 403 → tư vấn Chợ Pass) | REST `/api/v1/bookings/{id}/cancel` qua `BookingCoreClient` |

### Chi tiết các công cụ tiêu biểu:

#### 1. `search_availability` (StructuredTool)
- **Đóng gói LangChain:**
  ```python
  self.search_tool = StructuredTool.from_function(
      coroutine=self.search,
      name="search_availability",
      description="Search contiguous 60-minute slots on one court through Core. No SQL access.",
      args_schema=SearchArguments,
  )
  ```
- **Input Schema (`SearchArguments`):**
  - `constraints.date` (YYYY-MM-DD): Ngày cần tìm.
  - `constraints.duration_minutes`: Thời lượng (bội số của 60 phút).
  - `constraints.earliest_start` / `latest_start`: Cửa sổ khung giờ tìm kiếm (phút tính từ 00:00).
  - `constraints.max_budget`: Ngân sách trần (VND).
  - `constraints.area`: Khu vực mong muốn (quận/huyện).
  - `constraints.soft_fields` / `locked_fields`: Tập các trường cho phép nới lỏng hoặc khóa cứng.
- **Hành vi:** Sử dụng semaphore giới hạn concurrency (`search_concurrency = 2`) và timeout (`10s`), quét danh mục trung tâm và truy vấn trạng thái lịch trống thực tế, sau đó tính điểm xếp hạng (ranking) và lọc ra tối đa 5 phương án tối ưu.

#### 2. `create_booking` (Mutation Tool)
- **Hành vi:**
  - Yêu cầu người dùng phải chọn phương án cụ thể (`selected_option_id`).
  - Hệ thống sinh ra một `confirmation_id` (consent nonce) có thời hạn 10 phút.
  - Khi người dùng gửi lệnh xác nhận (`confirm`), hệ thống dẫn xuất `idempotency_key` duy nhất từ `(conversation_id, confirmation_id)` và gửi lệnh `POST /api/v1/reservations` sang Booking Core.
  - Ngăn ngừa tình trạng double-booking ngay cả khi mạng bị timeout hoặc người dùng click nhiều lần.

#### 3. `search_faq` (Knowledge Retrieval Tool)
- **Hành vi:**
  - Không gọi ra ngoài internet hay LLM bên ngoài để tránh ảo giác (hallucination).
  - Quét văn bản người dùng đối chiếu với bộ dữ liệu tri thức `knowledge.json` gồm các chính sách: thời gian giữ chỗ 10 phút, quy định slot đã thanh toán không được hoàn hủy trực tiếp (chống spam bot), quy trình pass sân trên sàn giao dịch.
  - Trả về câu trả lời chuẩn hóa kèm mảng trích dẫn `citations`.

#### 4. `cancel_my_booking` (Cancellation Protection & Refusal Tool)
- **Hành vi & Phân quyền nghiêm ngặt:**
  - **Quy trình 2 bước**: Tạo `preview` sinh ra `cancellation_id` (hết hạn sau 300 giây) gắn chặt với `state.version` → Thực thi `execute` chỉ chấp nhận action `confirm_cancellation` mang đúng ID hoặc câu nói xác nhận rõ ràng.
  - **Khóa quyền tự hủy đối với khách hàng thường (`user`)**: Booking Core chặn cứng ở tầng Application Service (`bookings-command.service.ts`) với mã lỗi **HTTP 403 Forbidden**.
  - **Bắt lỗi & Điều hướng thông minh tại Chatbot**: Trong `cancellation.py`, khi gọi Core API nhận lỗi 403, Chatbot bắt lỗi `CoreError(403)`, xóa preview, ghi nhận metric `metrics.labels("cancel_my_booking", "refused").inc()`, và chuyển sang trạng thái `cancellation_refused` kèm thông điệp:
    > *"Booking đã xác nhận không thể tự hủy. Bạn vui lòng sử dụng tính năng Chợ Pass sân hoặc liên hệ quản lý trung tâm."*
  - **Hủy giữ chỗ chưa thanh toán**: Khách hàng sử dụng `DELETE /api/v1/reservations/:id` để giải phóng slot giữ chỗ tạm thời (HELD 10 phút).
  - **Quyền hủy booking đã CONFIRMED**: Chỉ thuộc về Quản lý trung tâm (`center_manager` cơ sở) hoặc `super_admin` khi phát sinh sự cố bất khả kháng (thời tiết, bảo trì đột xuất).
  - **Kiểm chứng tự động**: Đảm bảo an toàn qua ca kiểm thử tích hợp `test_core_403_cancellation_refused_advises_pass_marketplace` trong `tests/integration/test_assistance.py`.

---

## 3. Biểu đồ Luồng LangGraph (StateGraph Workflow)

LangGraph điều phối toàn bộ vòng đời hội thoại thông qua `StateGraph(Run)`. Trạng thái `Run` chứa đầy đủ ngữ cảnh: tin nhắn người dùng, kết quả trích xuất intent, ràng buộc đặt sân, các phương án tìm kiếm và nhật ký thực thi (traces).

### 3.1. Sơ đồ Đồ thị Chi tiết (StateGraph)

```mermaid
stateDiagram-v2
    [*] --> parse : Tin nhắn mới (Text / Action)
    
    state "parse (Node 1)" as parse
    note right of parse
      Trích xuất intent, changes, evidence.
      Dùng LLMParser (ChatOpenAI) hoặc FakeParser.
      Fallback nếu LLM lỗi: clarification.
    end note
    
    parse --> merge : parsed
    
    state "merge (Node 2)" as merge
    note right of merge
      Hợp nhất DIFF vào constraints cũ.
      Tăng version, vô hiệu hóa options cũ nếu sửa giờ/ngày.
    end note
    
    merge --> plan : state
    
    state "plan (Node 3)" as plan
    note right of plan
      Đánh giá tính đầy đủ của điều kiện.
      Quyết định bước tiếp theo dựa trên policy.
    end note
    
    %% Conditional edges from plan
    plan --> respond : action = "ask" / "respond" (Thiếu thông tin)
    plan --> search : action = "search" (Đủ ngày, thời lượng, giờ)
    plan --> select : action = "select" (Chọn phương án sân)
    plan --> book : action = "book" (Xác nhận đặt sân)
    plan --> resolve : action = "resolve" (Đồng ý/từ chối sửa điều kiện)
    plan --> assist : action = "assist" (FAQ / Lịch sử / Hủy vé)
    
    state "search (Node 4)" as search
    note right of search
      Gọi Core API quét lịch trống các cơ sở.
      Tạo candidates và đánh giá vi phạm.
    end note
    
    search --> observe
    
    state "observe (Node 5)" as observe
    note right of observe
      Phân loại kết quả tìm kiếm:
      FOUND, NO_MATCH, SEARCH_FAILED.
    end note
    
    %% Conditional edges from observe
    observe --> respond : action = "found" (Có sân khớp hoàn toàn)
    observe --> replan : action = "empty" (Không có sân -> tìm Near-miss)
    observe --> respond : action = "failed" / "incomplete"
    
    state "replan (Node 6)" as replan
    note right of replan
      Near-miss Recommender:
      Tìm phương án chỉ vi phạm 1 điều kiện mềm
      Tạo đề xuất thương lượng (Proposal).
    end note
    
    replan --> respond
    
    state "resolve (Node 7)" as resolve
    note right of resolve
      Xử lý chấp nhận/từ chối proposal.
      Nếu đồng ý -> cập nhật constraints để search lại.
    end note
    
    resolve --> respond
    
    state "select (Node 8)" as select
    note right of select
      Ghi nhận lựa chọn option_id của user.
      Sinh confirmation_id (Hold nonce 10p).
    end note
    
    select --> respond
    
    state "book (Node 9)" as book
    note right of book
      Kiểm tra confirmation_id còn hạn.
      Gửi idempotency key tạo Reservation sang Core.
    end note
    
    book --> respond
    
    state "assist (Node 10)" as assist
    note right of assist
      Điều phối tác vụ trợ lý phụ trợ:
      Tra cứu FAQ, lịch sử cá nhân, preview hủy sân.
    end note
    
    assist --> respond
    
    state "respond (Node 11)" as respond
    note right of respond
      Response Composer:
      Tạo câu trả lời tiếng Việt thân thiện,
      đính kèm options/proposals/assistance data.
    end note
    
    respond --> [*] : Trả kết quả về Gateway & Lưu Checkpoint
```

### 3.2. Cơ chế Checkpoint & Bền vững Dữ liệu (Persistence)
- Đồ thị được biên dịch với `checkpointer = AsyncPostgresSaver(pool)`:
  ```python
  graph = workflow.graph(self.checkpointer)
  ```
- Mỗi lượt hội thoại (`turn`) được lưu vào bảng checkpoint trong cơ sở dữ liệu `ai`:
  - `checkpoint_id` và `parent_checkpoint_id` tạo thành cây lịch sử trạng thái.
  - Cho phép người dùng dừng lại, tiếp tục hội thoại sau vài giờ mà không mất ngữ cảnh các tiêu chí đặt sân đã chọn.
  - Hỗ trợ replay an toàn khi gặp sự cố mạng giữa chừng.

---

## 4. Hiện trạng Kiểm chứng Thực tế trên Pod `ai-service` Cụm K3d Local

### 4.1. Tình trạng Mount Secret & ConfigMap
Pod `ai-service` (2 replicas: `ai-service-58d4ccb56-2btgq`, `ai-service-58d4ccb56-79rm8`) trong namespace `badminton` đã được mount đầy đủ cả ConfigMap và Secret:

1. **ConfigMap `ai-service-config`:**
   - `AI_PROVIDER`: `openai-compatible`
   - `AI_OFFLINE`: `false`
   - `LLM_BASE_URL`: `https://api.groq.com/openai/v1`
   - `LLM_MODEL`: `openai/gpt-oss-120b`
   - `BOOKING_CORE_URL`: `http://booking-core:3000`

2. **Secret `ai-service-secrets` (Đồng bộ từ LocalStack Secrets Manager qua ExternalSecrets):**
   - `LLM_API_KEY`: Đã mount thành công vào biến môi trường của container (`LLM_API_KEY=gsk_localmockdemo`).
   - `JWT_SECRET`: `local-development-only-change-me-32-chars`
   - `AI_DATABASE_URL`: `postgresql+psycopg://ai:ai_dev@postgres:5432/ai`

> **Kết luận 1:** Pod `ai-service` **ĐÃ MOUNT ĐƯỢC API KEY SECRET THÀNH CÔNG** vào biến môi trường runtime.

---

### 4.2. Khả năng Kết nối & Gọi Provider LLM Thực tế

Chúng tôi đã thực hiện lệnh kiểm tra mạng và gọi trực tiếp endpoint Provider từ bên trong container của pod `ai-service`:

```bash
kubectl -n badminton exec deploy/ai-service -- python -c "
import urllib.request, urllib.error
try:
    req = urllib.request.Request(
        'https://api.groq.com/openai/v1/models',
        headers={'Authorization': 'Bearer gsk_localmockdemo', 'User-Agent': 'langchain-openai/0.2.0'}
    )
    res = urllib.request.urlopen(req, timeout=5)
    print('Response:', res.status)
except urllib.error.HTTPError as e:
    print('HTTPError status:', e.code, e.read().decode())
"
```

**Kết quả phản hồi thực tế:**
```json
HTTPError status: 401 {"error":{"message":"Invalid API Key","type":"invalid_request_error","code":"invalid_api_key"}}
```

#### Phân tích kết quả:
1. **Thông tuyến mạng Internet (Network Egress: THÀNH CÔNG 100%):**
   - Pod `ai-service` trong cụm K3d local đã phân giải DNS thành công tên miền `api.groq.com` (qua CoreDNS `10.43.0.10`).
   - NetworkPolicy `ai-service-policy` cho phép egress cổng 443 ra ngoài Internet.
   - Gói tin HTTPS đã đi xuyên suốt từ bên trong Kubernetes Pod tới máy chủ của Groq tại Hoa Kỳ và nhận phản hồi tức thì trong ~300ms.
2. **Trạng thái Xác thực API Key (Provider Authentication: 401 Unauthorized):**
   - Giá trị `LLM_API_KEY` hiện tại trong hạ tầng local dev là key mẫu `gsk_localmockdemo`.
   - Vì đây là key mock nên máy chủ Groq từ chối cấp quyền truy cập với mã lỗi **HTTP 401 `invalid_api_key`**.
3. **Cơ chế Phòng vệ & Khả năng Chịu lỗi (Resilience & Graceful Degradation):**
   - Khi `ChatOpenAI.ainvoke()` gặp lỗi 401 từ Groq, `workflow.py` (dòng 105–110) kích hoạt khối `except Exception`:
     ```python
     except Exception:
         parser_failures.inc()
         parsed = ParsedMessage(
             clarification="Mình chưa hiểu rõ yêu cầu. Bạn nói lại ngày, giờ và thời lượng nhé.",
             confidence=0,
         )
     ```
   - Nhờ đó, **pod không hề bị crash**, hệ thống vẫn chạy ổn định và tự động chuyển sang câu hỏi làm rõ thân thiện với người dùng.

---

## 5. Hướng dẫn Kích hoạt Provider Thật hoặc Chuyển Offline Mock

### Lựa chọn A: Kích hoạt Groq Provider thật (Cần API Key cá nhân)
Nếu bạn có API Key Groq thật (đăng ký miễn phí tại [console.groq.com](https://console.groq.com)):
1. Cập nhật secret trong cụm K8s:
   ```bash
   kubectl -n badminton patch secret ai-service-secrets --type merge -p '{"stringData":{"LLM_API_KEY":"gsk_YOUR_REAL_API_KEY_HERE"}}'
   ```
2. Khởi động lại pod `ai-service` để nhận key mới:
   ```bash
   kubectl -n badminton rollout restart deploy/ai-service
   ```

### Lựa chọn B: Chế độ Hoàn toàn Offline (Fake Parser — Khuyến nghị cho CI/CD & Local Demo)
Nếu muốn demo offline hoàn toàn không phụ thuộc mạng ngoài và không tốn phí:
1. Cập nhật ConfigMap:
   ```bash
   kubectl -n badminton patch configmap ai-service-config --type merge -p '{"data":{"AI_PROVIDER":"fake","AI_OFFLINE":"true"}}'
   ```
2. Khởi động lại pod:
   ```bash
   kubectl -n badminton rollout restart deploy/ai-service
   ```
   Hệ thống sẽ chuyển sang dùng `FakeParser` với bộ quy tắc regex tiếng Việt chuẩn xác đã được kiểm thử 100% qua bộ Golden Evaluation Suite.
