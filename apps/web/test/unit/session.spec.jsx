import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Header from "../../src/shared/ui/Header.jsx";
import { SessionProvider } from "../../src/shared/session/SessionContext.jsx";
import { ChatProvider } from "../../src/shared/chat/ChatContext.jsx";
import http from "../../src/shared/api/http.js";

function renderHeader(session) {
  return render(
    <MemoryRouter>
      <SessionProvider session={session}>
        <ChatProvider>
          <Header />
        </ChatProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe("web session refresh and logout", () => {
  let requests;

  beforeEach(() => {
    requests = [];
    localStorage.clear();
    delete window.__BADMINTON_SESSION__;
  });

  afterEach(() => {
    localStorage.clear();
    delete window.__BADMINTON_SESSION__;
  });

  it("restores the customer session on load via /api/auth/refresh and revokes on logout", async () => {
    http.defaults.adapter = async (config) => {
      requests.push(config);
      if (config.url === "/api/auth/refresh") {
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          data: {
            accessToken: "fresh-web-token",
            tokenType: "Bearer",
            expiresIn: 900,
            profile: { userId: "u-1", email: "user@example.test", role: "user", name: "Khách Test" },
          },
        };
      }
      return { status: 204, statusText: "No Content", headers: {}, config, data: "" };
    };

    renderHeader(undefined);
    expect(await screen.findByText("Khách Test")).toBeInTheDocument();
    expect(window.__BADMINTON_SESSION__?.accessToken).toBe("fresh-web-token");
    expect(requests.map((r) => r.url)).toEqual(["/api/auth/refresh"]);

    fireEvent.click(screen.getByText("Khách Test"));
    fireEvent.click(screen.getByRole("button", { name: /Đăng xuất/i }));

    await waitFor(() => {
      expect(requests.some((r) => r.url === "/api/auth/logout")).toBe(true);
    });
    expect(window.__BADMINTON_SESSION__).toBeNull();
    expect(localStorage.getItem("badminton_user")).toBeNull();
  });

  it("clears stale localStorage user when mount refresh returns 401", async () => {
    localStorage.setItem(
      "badminton_user",
      JSON.stringify({ userId: "stale-1", name: "Khách Cũ" }),
    );
    http.defaults.adapter = async (config) => {
      requests.push(config);
      throw { response: { status: 401 }, config };
    };

    renderHeader(undefined);
    expect(await screen.findByRole("button", { name: /Đăng nhập/i })).toBeInTheDocument();
    expect(localStorage.getItem("badminton_user")).toBeNull();
    expect(window.__BADMINTON_SESSION__).toBeNull();
  });

  it("deduplicates concurrent 401 refreshes and retries protected requests once", async () => {
    let refreshCount = 0;
    http.defaults.adapter = async (config) => {
      requests.push(config);
      if (config.url === "/api/auth/refresh") {
        refreshCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          data: {
            accessToken: "rotated-web-token",
            tokenType: "Bearer",
            expiresIn: 900,
            profile: { userId: "u-1", email: "user@example.test", role: "user", name: "Khách Test" },
          },
        };
      }
      if (config.headers.Authorization === "Bearer initial-web-token") {
        throw { response: { status: 401 }, config };
      }
      return { status: 200, statusText: "OK", headers: {}, config, data: { ok: true } };
    };

    renderHeader({
      accessToken: "initial-web-token",
      expiresIn: 900,
      profile: { userId: "u-1", email: "user@example.test", role: "user", name: "Khách Test" },
    });
    window.__BADMINTON_SESSION__ = {
      accessToken: "initial-web-token",
      expiresIn: 900,
      profile: { userId: "u-1", email: "user@example.test", role: "user", name: "Khách Test" },
    };

    const [one, two] = await Promise.all([
      http.get("/api/booking/first"),
      http.get("/api/booking/second"),
    ]);
    expect(one.data).toEqual({ ok: true });
    expect(two.data).toEqual({ ok: true });
    expect(refreshCount).toBe(1);
    expect(
      requests.filter((r) => r.url.startsWith("/api/booking/") && r.headers.Authorization === "Bearer rotated-web-token"),
    ).toHaveLength(2);
  });
});
