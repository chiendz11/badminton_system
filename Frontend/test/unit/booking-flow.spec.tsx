import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, it, expect, vi } from "vitest";
import App from "../../src/App";
import sample from "../../../contracts/booking/booking-response.schema.examples.json";
const centerId = "11111111-1111-4111-8111-111111111111",
  courtId = "22222222-2222-4222-8222-222222222221";
const center = {
  id: centerId,
  name: "Sân Test",
  address: "18 Duy Tân",
  phone: "0901234567",
  description: "Sân thảm trong nhà",
  managerId: "manager",
  isActive: true,
  openMinute: 300,
  closeMinute: 1440,
  timezone: "Asia/Ho_Chi_Minh",
  facilities: [],
  courts: [{ id: courtId, name: "Sân 1", surface: "thảm", isActive: true }],
  pricing: [
    {
      dayType: "WEEKDAY",
      startMinute: 300,
      endMinute: 1440,
      pricePerHour: 80000,
    },
    {
      dayType: "WEEKEND",
      startMinute: 300,
      endMinute: 1440,
      pricePerHour: 80000,
    },
  ],
};
let calls: { path: string; body: any }[] = [];
beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(
    "badminton.session",
    JSON.stringify({
      token: "test-token",
      actor: { userId: "user", role: "user", name: "Test User" },
    }),
  );
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ path: input, body });
      let value: any = {};
      if (input.startsWith("/api/v1/centers?"))
        value = { items: [center], total: 1, page: 1, limit: 100 };
      else if (input.includes("/availability"))
        value = {
          centerId,
          date: "2030-01-08",
          courts: [
            {
              ...center.courts[0],
              slots: [
                {
                  minute: 600,
                  price: 80000,
                  available: true,
                  state: "AVAILABLE",
                },
              ],
            },
          ],
        };
      else if (input === "/api/v1/reservations")
        value = {
          id: "33333333-3333-4333-8333-333333333333",
          centerId,
          userId: "user",
          date: "2030-01-08",
          status: "HELD",
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          totalPrice: 80000,
          selections: [
            { courtId, courtName: "Sân 1", slots: [600], price: 80000 },
          ],
        };
      else if (input.endsWith("/confirm")) value = sample.valid[0];
      else if (input.startsWith("/api/v1/bookings/me"))
        value = { items: [], total: 0, page: 1, limit: 10 };
      return new Response(JSON.stringify(value), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
});
it("completes hold and direct booking confirmation without a payment step", async () => {
  render(<App />);
  const slot = await screen.findByRole("button", { name: "Sân 1 10:00" });
  fireEvent.click(slot);
  fireEvent.click(screen.getByRole("button", { name: "Giữ chỗ đã chọn" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Xác nhận đặt sân" }),
  );
  await screen.findByRole("status");
  expect(calls.some((c) => c.path.endsWith("/confirm"))).toBe(true);
  expect(
    calls.some((c) => c.path.includes("payment") || c.path.includes("pass")),
  ).toBe(false);
  const hold = calls.find((c) => c.path === "/api/v1/reservations");
  expect(hold?.body.selections).toEqual([{ courtId, slots: [600] }]);
});
it("shows booking conflicts and refreshes availability", async () => {
  const original = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) =>
      input === "/api/v1/reservations"
        ? new Response(
            JSON.stringify({ message: "Khung giờ vừa được người khác giữ" }),
            { status: 409 },
          )
        : original(input, init),
    ),
  );
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "Sân 1 10:00" }));
  fireEvent.click(screen.getByRole("button", { name: "Giữ chỗ đã chọn" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Khung giờ vừa được người khác giữ",
  );
  await waitFor(() =>
    expect(
      calls.filter((c) => c.path.includes("/availability")).length,
    ).toBeGreaterThan(1),
  );
});
