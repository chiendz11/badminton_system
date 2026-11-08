import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Login from "../../src/features/identity/pages/Login.jsx";
import AdminLayout from "../../src/shared/ui/AdminLayout.jsx";
import { SessionProvider } from "../../src/shared/session/SessionContext.jsx";
import http from "../../src/shared/api/http.js";

const adminSession = (role = "super_admin") => ({
  accessToken: "test-access-token",
  expiresIn: 900,
  profile: { userId: "admin-1", role, name: "Quản trị viên" },
});
let calls;
let response;
let fail;
function Location() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}
function setup(path = "/center-status", session = null) {
  return render(
    <SessionProvider session={session}>
      <MemoryRouter initialEntries={[path]}>
        <Location />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<h1>Trang quản trị</h1>} />
            <Route path="/center-status" element={<h1>Trạng thái sân</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  );
}
async function submit() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "ADMIN@Example.com" },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "example-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
}
beforeEach(() => {
  calls = [];
  response = adminSession();
  fail = null;
  window.__BADMINTON_SESSION__ = null;
  http.defaults.adapter = async (config) => {
    calls.push(config);
    if (fail) throw { response: { status: fail }, config };
    return {
      data: response,
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
});
afterEach(() => {
  window.__BADMINTON_SESSION__ = null;
  vi.useRealTimers();
});
describe("admin identity integration", () => {
  it("redirects a deep link before rendering protected content or calling APIs", async () => {
    setup();
    expect(
      await screen.findByRole("heading", { name: "Đăng nhập quản trị" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Trạng thái sân" }),
    ).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
  it.each(["super_admin", "center_manager"])(
    "logs in %s, restores the deep link, attaches JWT and fully logs out",
    async (role) => {
      response = adminSession(role);
      setup();
      await submit();
      expect(
        await screen.findByRole("heading", { name: "Trạng thái sân" }),
      ).toBeInTheDocument();
      expect(calls[0].url).toBe("/api/auth/login");
      expect(JSON.parse(calls[0].data)).toEqual({
        email: "admin@example.com",
        password: "example-password",
      });
      expect(calls[0].headers.Authorization).toBeUndefined();
      await http.get("/api/booking/bookings");
      expect(calls[1].headers.Authorization).toBe("Bearer test-access-token");
      fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
      expect(
        await screen.findByRole("heading", { name: "Đăng nhập quản trị" }),
      ).toBeInTheDocument();
      expect(window.__BADMINTON_SESSION__).toBeNull();
      await http.get("/api/booking/bookings");
      expect(calls[2].headers.Authorization).toBeUndefined();
    },
  );
  it.each(["user", "unknown"])(
    "rejects a %s account without saving its token",
    async (role) => {
      response = adminSession(role);
      setup();
      await submit();
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "không có quyền quản trị",
      );
      expect(window.__BADMINTON_SESSION__).toBeNull();
      expect(screen.getByTestId("path")).toHaveTextContent("/login");
    },
  );
  it.each([401, 429, 502])(
    "keeps the login form usable after HTTP %s",
    async (status) => {
      fail = status;
      setup("/login");
      await submit();
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeEnabled(),
      );
      expect(window.__BADMINTON_SESSION__).toBeNull();
    },
  );
  it("does not restore a profile without a token", () => {
    setup("/center-status", { profile: adminSession().profile });
    expect(
      screen.getByRole("heading", { name: "Đăng nhập quản trị" }),
    ).toBeInTheDocument();
  });
  it("validates an injected token using me and trusts the current server role", async () => {
    const token = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 900 }))}.signature`;
    response = { profile: adminSession("user").profile };
    setup("/center-status", { ...adminSession(), accessToken: token });
    expect(
      await screen.findByRole("heading", { name: "Đăng nhập quản trị" }),
    ).toBeInTheDocument();
    expect(calls[0].url).toBe("/api/auth/me");
    expect(calls[0].headers.Authorization).toBe(`Bearer ${token}`);
    expect(window.__BADMINTON_SESSION__).toBeNull();
  });
  it("returns to login when a protected API rejects the current token", async () => {
    setup();
    await submit();
    await screen.findByRole("heading", { name: "Trạng thái sân" });
    fail = 401;
    await act(async () => {
      await http.get("/api/booking/bookings").catch(() => {});
    });
    expect(
      await screen.findByRole("heading", { name: "Đăng nhập quản trị" }),
    ).toBeInTheDocument();
    expect(window.__BADMINTON_SESSION__).toBeNull();
  });
  it("clears an expired session even while idle", async () => {
    response = { ...adminSession(), expiresIn: 2 };
    setup();
    await submit();
    await screen.findByRole("heading", { name: "Trạng thái sân" });
    vi.useFakeTimers();
    // Re-login to create the expiry timer under the fake clock.
    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    await act(async () => {
      await submit();
    });
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(
      screen.getByRole("heading", { name: "Đăng nhập quản trị" }),
    ).toBeInTheDocument();
    expect(window.__BADMINTON_SESSION__).toBeNull();
  });
});
