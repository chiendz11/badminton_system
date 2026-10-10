import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import MyBookings from "../../src/features/booking/pages/MyBookings.jsx";
import { SessionProvider } from "../../src/shared/session/SessionContext.jsx";
import http from "../../src/shared/api/http.js";
const requests = [];
beforeEach(() => {
  localStorage.clear();
  requests.length = 0;
  http.defaults.adapter = async (config) => {
    requests.push(config);
    return {
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data:
        config.url === "/graphql"
          ? { data: { centers: [] } }
          : config.url.includes("statistics")
            ? {}
            : { bookingHistory: [], total: 0, totalPages: 1 },
    };
  };
});
describe("booking history extracted from the original profile UI", () => {
  it("loads history/statistics from Core without profile, social or notification requests", async () => {
    render(
      <MemoryRouter>
        <SessionProvider
          session={{ profile: { userId: "customer", name: "Khách" } }}
        >
          <MyBookings />
        </SessionProvider>
      </MemoryRouter>,
    );
    await screen.findByRole("button", { name: "Lịch sử" }, { timeout: 3000 });
    await waitFor(() =>
      expect(
        requests.some((r) => r.url === "/api/user/customer/booking-history"),
      ).toBe(true),
    );
    for (const name of [
      "Thông tin",
      "Hồ sơ mở rộng",
      "Bạn bè",
      "Tin nhắn",
      "Tìm bạn",
    ])
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Đã xác nhận" }));
    await waitFor(() => expect(requests.some((r) => r.url.includes("booking-history") && r.params?.status === "confirmed")).toBe(true));
    expect(screen.queryByRole("columnheader", { name: "Phương thức" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thống kê" }));
    await waitFor(() =>
      expect(requests.some((r) => r.url === "/api/user/me/statistics")).toBe(
        true,
      ),
    );
    expect(
      requests.every(
        (r) => r.url === "/graphql" || r.url.startsWith("/api/user/"),
      ),
    ).toBe(true);
    expect(
      requests.some((r) =>
        /^\/api\/(users|social|notification|ratings)/.test(r.url),
      ),
    ).toBe(false);
  });
});
