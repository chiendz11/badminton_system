# Kiến trúc & Phân tích Tổng thể — Badminton Manager V2 (Engineering Blueprint)

> Bộ tài liệu hợp nhất chuẩn hóa toàn bộ chuỗi lập luận **Từ Nghiệp vụ (BA) → Kỹ nghệ Yêu cầu & Bảo mật → Kiến trúc 10 Góc nhìn & ADRs → Hiện trạng Mã nguồn, Kiểm thử & Vận hành Demo**, áp dụng khung kỹ nghệ chuẩn lên mã nguồn và hạ tầng thực tế của **Badminton Manager V2** (cập nhật sau **PR #32**).

---

## Bản đồ Tài liệu (4 Phần Xuyên suốt)

| Phần | Tài liệu | Nội dung chính | Đối chiếu nguồn trong Repo |
| :---: | :--- | :--- | :--- |
| **01** | [**Phân tích Nghiệp vụ (BA)**](./01-business-analysis.md) | Bối cảnh B2B SaaS 3 Actor, 6 vấn đề `PB-01..PB-06`, Stakeholder, KPIs `OBJ-01..05`, Phạm vi MVP, Quy trình To-Be, 22 quy tắc `BR-01..22`, Rủi ro & `GAP` | [BRD v2.0](../week-4/BRD.md), [Tuần 7](../week-7/README.md) |
| **02** | [**Kỹ nghệ Yêu cầu, Tải & Bảo mật**](./02-requirements-and-traceability.md) | 8 Use Case & Tiêu chí nghiệm thu `Given/When/Then` (`AC-01..23`), NFR đo được, 9 yêu cầu bảo mật `SEC1..SEC9`, Phân tích tải, Ma trận `RBAC/ABAC`, Truy vết khép kín | [BRD](../week-4/BRD.md), [SYSTEM_CONTRACTS](../week-5/SYSTEM_CONTRACTS.md) |
| **03** | [**Kiến trúc 10 Góc nhìn & ADRs**](./03-architecture-views-and-adrs.md) | `ADR-001..009` + Quyết định TLS/Mailpit/Identity (`Post-PR32`), **10 Góc nhìn kiến trúc** kèm sơ đồ Mermaid & Bảng Parity `AWS EKS <-> k3d Local` | [ADRs](../week-5/adr/README.md), [SYSTEM_ARCHITECTURE](../week-5/architecture/SYSTEM_ARCHITECTURE.md), [DevOps Framework](../devops/LOCAL_K3D_ARGOCD_CICD_FRAMEWORK.md) |
| **04** | [**Hiện trạng Mã nguồn, Kiểm thử & Vận hành Demo**](./04-implementation-status-and-verification.md) | Tech Stack, Bản đồ `Implemented` vs `Skeleton` thực tế, 13 nhóm Contract OpenAPI/Schema, Bằng chứng CI `23/23` + ACID `19/19`, Hướng dẫn Demo HTTPS local | [contracts/](../../contracts/README.md), [monitoring/](../../monitoring/README.md), [reports/](../reports/WEEK_07.md) |

---

## Chuỗi Lập luận Tham chiếu Nhanh (3 Luồng Tiêu biểu)

| Mạch bài toán | Vấn đề (`PB`) | Yêu cầu & NFR | Quyết định Kiến trúc (`ADR`) | Công nghệ & Minh chứng |
| :--- | :--- | :--- | :--- | :--- |
| **Chống đặt trùng slot giờ vàng** | `PB-01`: Nhiều người tranh 1 sân lúc `19:00` hoặc retry khi rớt mạng | `AC-03`, `AC-05`, `BR-10..12`, `NFR-P2` | Service `booking-core` sở hữu trọn lịch/giá, TX local ACID + Idempotency (`ADR-002`) | **PostgreSQL 16 GiST** (`slot_no_overlap`) + `@@unique([userId, idempotencyKey])` (**19/19 concurrency tests PASS**) |
| **Xác thực Session & Bảo mật HTTPS** | `PB-05`, `GAP-01`: Đảm bảo session/cookie an toàn giống production | `AC-22`, `AC-23`, `SEC1..SEC7` | Tách `services/identity`, Edge TLS + `TRUST_PROXY=1` + `COOKIE_SECURE=true` (`ADR-006`, `Post-PR32`) | **TLS Ingress (`cert-manager` CA)** + **`Mailpit`** SMTP verify + Cookie `HttpOnly; Secure; SameSite=Lax` + **ESO / LocalStack** |
| **AI Đặt sân An toàn (No-Write-Without-Consent)** | `PB-04`: Khách hỏi tự nhiên tiếng Việt, không tự ý đặt hay làm tròn giờ | `AC-11..16`, `BR-01,02, 17..21`, `NFR-AI1,AI2` | Tách `ai-service` (Python/LangGraph) riêng DB `ai`, gọi Core qua Bearer Token user (`ADR-008`) | **FastAPI + LangGraph 11-node** + `AsyncPostgresSaver` + Golden Eval Gate (`schema=1.0`, `F1>=0.9`, `critical>=0.95`) |
