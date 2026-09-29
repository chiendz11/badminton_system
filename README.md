# badminton_system — CI configuration

Nhánh `ci/bootstrap` chỉ chứa cấu hình GitHub Actions, script hỗ trợ CI và tài liệu. **Không chứa source ứng dụng, AI service, model hoặc test của repo gốc.**

Thiết kế dựa trên cấu trúc của [Badminton_manager_microservices](https://github.com/chiendz11/Badminton_manager_microservices) và code local `Badminton-manager-project-microservices`.

## Các tệp chính

- `.github/workflows/ci.yml`: phát hiện component thay đổi, tạo matrix và tổng hợp kết quả.
- `.github/workflows/reusable-backend-ci.yml`: dùng chung cho API gateway và các Node backend.
- `.github/workflows/reusable-web-ci.yml`: dùng chung cho `Frontend` và `Admin`.
- `.github/scripts/detect_changes.py`: tự nhận diện service, npm/pnpm và Dockerfile; luôn loại `BM/services/ai_service`.
- `.github/scripts/check_contract.mjs`: kiểm tra các lệnh bắt buộc trước khi cài dependency/chạy CI.
- [docs/CI.md](docs/CI.md): CI contract, phạm vi, điều kiện áp dụng và bước tiếp theo.

## Trạng thái

Đây là **bộ cấu hình để áp dụng vào repo ứng dụng**, không phải một bản sao ứng dụng chạy được. Workflow chỉ tự chạy khi push/PR vào `main` hoặc `master`; push nhánh `ci/bootstrap` không chạy test. Không checkout repo nguồn qua mạng và không dùng GitHub Secrets.

Sau khi đưa thư mục `.github` vào repo có source ứng dụng và chuẩn hóa CI contract, workflow sẽ chạy theo thay đổi. Chạy thủ công ngay trên repo chỉ có cấu hình sẽ báo rõ thiếu source, không báo thành công giả.

Không triển khai `integration.yml` xuyên service hoặc `release.yml` trong nhánh đầu tiên. Các bước AWS ECR, GitOps, ArgoCD và EKS thuộc giai đoạn sau.
