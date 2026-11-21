import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ProfilePage from "../../src/features/identity/pages/ProfilePage.jsx";
import { SessionContext } from "../../src/shared/session/SessionContext.jsx";
import http from "../../src/shared/api/http.js";
vi.mock("../../src/shared/api/http.js", () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

describe("personal profile", () => {
  it("loads the profile and saves only name and phone", async () => {
    const profile = {
      userId: "user-1",
      name: "Customer",
      email: "customer@example.test",
      phone: null,
      role: "user",
    };
    http.get.mockResolvedValueOnce({ data: { profile } });
    http.patch.mockResolvedValueOnce({
      data: { profile: { ...profile, name: "Updated", phone: "+84912345678" } },
    });
    const setUser = vi.fn();
    render(
      <MemoryRouter>
        <SessionContext.Provider
          value={{ user: profile, loading: false, setUser }}
        >
          <ProfilePage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    const name = await screen.findByLabelText("Họ và tên");
    fireEvent.change(name, { target: { value: "Updated" } });
    fireEvent.change(screen.getByLabelText("Số điện thoại"), {
      target: { value: "+84912345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await screen.findByText("Đã lưu hồ sơ.");
    expect(http.get).toHaveBeenCalledWith("/api/identity/me");
    expect(http.patch).toHaveBeenCalledWith("/api/identity/me", {
      name: "Updated",
      phone: "+84912345678",
    });
    await waitFor(() =>
      expect(setUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Updated" }),
      ),
    );
  });
  it("asks anonymous visitors to sign in", () => {
    render(
      <MemoryRouter>
        <SessionContext.Provider value={{ user: null, loading: false }}>
          <ProfilePage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.getByText("Vui lòng đăng nhập để xem hồ sơ.")).toBeVisible();
  });
});
