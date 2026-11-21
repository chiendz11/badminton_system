import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserManagement from "../../src/features/identity/pages/UserManagement.jsx";
import { SessionContext } from "../../src/shared/session/SessionContext.jsx";
import http from "../../src/shared/api/http.js";
vi.mock("../../src/shared/api/http.js", () => ({
  default: { get: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));
const manager = {
  userId: "ba0d0000-0000-4000-8000-000000000002",
  email: "manager@example.test",
  name: "Manager",
  role: "center_manager",
  isActive: true,
  version: 1,
};
function renderPage(role) {
  return render(
    <MemoryRouter>
      <SessionContext.Provider
        value={{ admin: { userId: "admin-1", role }, loading: false }}
      >
        <UserManagement />
      </SessionContext.Provider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  http.get.mockResolvedValue({ data: { users: [manager], total: 1 } });
  http.patch.mockResolvedValue({ data: { ...manager, isActive: false } });
  http.put.mockResolvedValue({ data: manager });
});
describe("account administration", () => {
  it("denies center managers without loading directory data", () => {
    renderPage("center_manager");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Chỉ quản trị viên hệ thống",
    );
    expect(http.get).not.toHaveBeenCalled();
  });
  it("requires a reason to lock an account and can assign a center manager", async () => {
    renderPage("super_admin");
    const reason = await screen.findByLabelText(
      "Lý do cho manager@example.test",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Tìm kiếm" })).toBeEnabled(),
    );
    expect(
      screen.getByRole("button", { name: "Khóa", exact: true }),
    ).toBeDisabled();
    fireEvent.change(reason, { target: { value: "Violation" } });
    fireEvent.click(screen.getByRole("button", { name: "Khóa", exact: true }));
    await waitFor(() =>
      expect(http.patch).toHaveBeenCalledWith(
        `/api/identity/users/${manager.userId}/status`,
        { isActive: false, reason: "Violation" },
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Lưu phân công" }),
      ).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText("Quản lý trung tâm"), {
      target: { value: manager.userId },
    });
    const centerId = "ba0d0000-0000-4000-8000-000000000003";
    fireEvent.change(screen.getByLabelText("ID trung tâm"), {
      target: { value: centerId },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu phân công" }));
    await waitFor(() =>
      expect(http.put).toHaveBeenCalledWith(
        "/api/identity/center-assignments",
        { userId: manager.userId, centerId, active: true },
      ),
    );
  });
});
