# badminton_system — CI bootstrap

`main` là nhánh mặc định; `ci/bootstrap` là nhánh feature chứa cấu hình CI cho kiến trúc mới. Repo hiện chỉ chứa workflow, script và tài liệu CI. Codebase ứng dụng sẽ được tạo sau.

Thiết kế theo [thảo luận kiến trúc CI mới](https://chatgpt.com/share/6ac2943b-efb4-83ec-b181-e9161879f28d): một deployable/bounded context tương ứng một component, với change detection dựa trên dependency graph.

## Cấu hình chính

- `.github/ci/components.yml`: khai báo component, runtime, database, workspace, dependency và golden thresholds.
- `.github/workflows/ci.yml`: điều phối matrix `node`, `python`, `web`, `contract`, rồi tổng hợp vào `CI / required`.
- `reusable-node-ci.yml`: Node typecheck, unit/contract/integration, Prisma migration, Docker build và Trivy.
- `reusable-python-ci.yml`: AI FastAPI, uv lockfile, Ruff/typecheck, API/contract tests, golden evaluation và smoke test.
- `reusable-web-ci.yml`: React/Vite lint, typecheck, unit/consumer contracts và production build.
- `reusable-contract-ci.yml`: OpenAPI, AsyncAPI, event/AI-tool JSON Schemas và ví dụ hợp lệ/không hợp lệ.

AI là component Python chính thức. Các module trong `booking_core` được kiểm tra chung theo cùng transaction/deployment boundary.

## Trạng thái bootstrap

Manifest đang để `configuration_only: true`. Khi workflow được chạy, các bước chỉ kiểm tra cú pháp CI, manifest và dependency graph; các application job được bỏ qua và summary ghi rõ chưa chạy kiểm thử ứng dụng. Push nhánh `ci/bootstrap` không tự chạy pipeline.

Sau khi có codebase theo các path đã khai báo, bổ sung CI contract, lockfile, test thật và Dockerfile, rồi đặt `configuration_only: false`. Xem [docs/CI.md](docs/CI.md) để biết các điều kiện áp dụng.

Targeted integration xuyên service, nightly integration và ECR/GitOps release được triển khai ở giai đoạn tiếp theo. Bộ CI này không checkout repo ứng dụng cũ và không tạo codebase ứng dụng.
