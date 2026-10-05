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
  it("retains the original inventory, news, ratings and booking entry points for super admin", () => {
    dashboard("super_admin");
    for (const name of [
      "Quản lý kho",
      "Quản lý tin tức",
      "Quản lý đánh giá",
      "Tạo Lịch cố định",
      "Quản lý trung tâm",
    ])
      expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.queryByText(/Đăng xuất/i)).not.toBeInTheDocument();
  });
  it("retains role-based feature visibility for externally supplied centre managers", () => {
    dashboard("center_manager");
    expect(screen.getByText("Quản lý trung tâm")).toBeInTheDocument();
    expect(screen.queryByText("Quản lý khách hàng")).not.toBeInTheDocument();
  });
  it("can display the original dashboard without a login redirect while waiting for Identity integration", () => {
    dashboard();
    expect(screen.getByText("Quản lý kho")).toBeInTheDocument();
  });
});
