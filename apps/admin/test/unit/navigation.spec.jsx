import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import Dashboard from "../../src/features/dashboard/pages/Dashboard.jsx";
import { SessionProvider } from "../../src/shared/session/SessionContext.jsx";
function dashboard(role) {
  render(
    <MemoryRouter>
      <SessionProvider
        session={
          role
            ? { profile: { userId: "manager", role, name: "Quản lý" } }
            : null
        }
      >
        <Dashboard />
      </SessionProvider>
    </MemoryRouter>,
  );
}
describe("upstream admin dashboard", () => {
  it("retains the original booking cards while excluding other service entry points", () => {
    dashboard("super_admin");
    for (const name of [
      "Xem trạng thái sân",
      "Quản lý Đơn hàng/Hóa đơn",
      "Tạo Lịch cố định",
      "Quản lý trung tâm",
    ])
      expect(screen.getByText(name)).toBeInTheDocument();
    for (const name of [
      "Quản lý kho",
      "Quản lý tin tức",
      "Quản lý đánh giá",
      "Quản lý Tài khoản",
      "Quản lý khách hàng",
      "Bán hàng",
      "Báo cáo doanh thu",
    ])
      expect(screen.queryByText(name)).not.toBeInTheDocument();
    expect(screen.queryByText(/Đăng xuất/i)).not.toBeInTheDocument();
  });
  it("retains role-based feature visibility for externally supplied centre managers", () => {
    dashboard("center_manager");
    expect(screen.getByText("Quản lý trung tâm")).toBeInTheDocument();
    expect(screen.getByText("Tạo Lịch cố định")).toBeInTheDocument();
    expect(screen.queryByText("Quản lý khách hàng")).not.toBeInTheDocument();
  });
  it("can display the original dashboard without a login redirect while waiting for Identity integration", () => {
    dashboard();
    expect(screen.getByText("Xem trạng thái sân")).toBeInTheDocument();
  });
});
