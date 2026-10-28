# Tuần 4 — Hiểu đầy đủ bài toán và xác định phạm vi MVP

Kế hoạch Excel, tên thư mục và báo cáo môn học đều dùng **tuần 4** cho giai đoạn phân tích nghiệp vụ. Tham chiếu [báo cáo tuần 4](../reports/WEEK_04.md) và [kế hoạch tuần 4–13](../reports/README.md).

Nguồn phân công: workbook “Badminton_Manager_TechCorp_10_Week_Plan.xlsx”, sheet **Kế hoạch 10 tuần**, các dòng 2–6. Phạm vi tuần này là phân tích nghiệp vụ và xây dựng bộ tài liệu đầu vào cho thiết kế. Giờ trong bảng là ước lượng kế hoạch.

## Artifact của từng thành viên

| ID | DRI / ownership | Peer reviewer task | Artifact | Ước lượng kế hoạch |
| --- | --- | --- | --- | --- |
| W04-N1 | Người 1 — Tech Lead · Booking Core | Người 2 | [BRD outline + domain glossary + context nghiệp vụ](W04-N1_business-discovery.md) | 8h |
| W04-N2 | Người 2 — Pass Marketplace · Frontend | Người 1 | [User stories + pass wireflow + acceptance criteria](W04-N2_pass-ux.md) | 8h |
| W04-N3 | Người 3 — Social Realtime · Notification | Người 4 | [Chat business rules + message/notification scenarios](W04-N3_social-notification.md) | 8h |
| W04-N4 | Người 4 — Identity · Commerce · Content | Người 3 | [RBAC draft + POS rules + admin use cases](W04-N4_identity-commerce-content.md) | 8h |
| W04-N5 | Người 5 — AI Service · MLOps · Platform | Người 1 | [AI use cases + quality metrics + system NFR](W04-N5_ai-nfr.md) | 8h |

Tổng khối lượng dự kiến: **40 giờ cho cả nhóm**. [BRD toàn hệ thống](BRD_SYSTEM_V2.md) tổng hợp yêu cầu và quy tắc từ 5 artifact.

## Đối chiếu đầu ra với kế hoạch

| Người | Đầu ra theo Excel | Nội dung có trong bộ tài liệu |
| --- | --- | --- |
| Người 1 | BRD outline + glossary + business context | Bối cảnh, actor, thuật ngữ, hành trình liên miền, transaction boundary và ưu tiên MVP. |
| Người 2 | User stories + wireflow + acceptance criteria | 8 user stories, luồng nhượng sân, bảng VALID/INVALID, trạng thái UI và tiêu chí Given/When/Then. |
| Người 3 | Chat rules + notification scenarios | Loại hội thoại, membership, 8 kịch bản chat, unread, delivery, deduplication và notification mapping. |
| Người 4 | RBAC draft + POS rules + admin use cases | Role/action matrix, Identity rules, 7 POS rules, 6 Admin use cases và quy tắc Content. |
| Người 5 | AI use cases + quality metrics + NFR | 6 AI use cases, phạm vi read-only trong thiết kế, metric chất lượng và cách kiểm chứng NFR. |

Bộ tài liệu đã có đủ **5 đầu ra cá nhân** và một BRD tổng hợp. Đây là đối chiếu đầu ra phân tích; kết quả review được ghi trong hồ sơ review của nhóm.

## Tiêu chí nghiệm thu theo kế hoạch — G01

Actor, business state và happy/error paths được cả nhóm rà soát; luồng booking → payment → pass → chat và phạm vi AI được mô tả nhất quán. BRD, glossary, use cases và acceptance criteria là căn cứ cho bước review này.

## Bàn giao sang tuần 5

- Dùng BRD và glossary để xác định boundary, quyền sở hữu dữ liệu và transaction.
- Chuyển use cases/acceptance criteria thành wireframe, API/event/socket contract và schema.
- Chuyển NFR thành lựa chọn công nghệ, tiêu chí đo và kế hoạch triển khai môi trường.

Xem [artifact tuần 5](../week-5/README.md). Runtime, migration, Compose, health và kiểm thử chạy được triển khai theo các tuần kỹ thuật bắt đầu từ tuần 6 trong Excel; chúng không phải đầu ra của tuần phân tích này.
