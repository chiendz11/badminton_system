import { render, screen } from "@testing-library/react";
import { beforeEach, it, expect, vi } from "vitest";
import App from "../../src/App";
beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ items: [], total: 0, page: 1, limit: 100 }),
          { status: 200 },
        ),
    ),
  );
});
it("requires a session for management controls", () => {
  render(<App />);
  expect(
    screen.getByText("Đăng nhập để quản lý trung tâm, sân và lịch đặt."),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Tạo trung tâm" }),
  ).not.toBeInTheDocument();
});
it("shows management workspace for a manager", async () => {
  sessionStorage.setItem(
    "badminton.session",
    JSON.stringify({
      token: "test",
      actor: { userId: "manager", name: "Manager", role: "center_manager" },
    }),
  );
  render(<App />);
  expect(
    await screen.findByRole("button", { name: "Lịch đặt sân" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Tạo trung tâm" }),
  ).not.toBeInTheDocument();
});
