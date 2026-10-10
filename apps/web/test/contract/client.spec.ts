import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import http from "../../src/shared/api/http.js";
import {
  confirmBookingToDB,
  getPendingMapping,
  cancelBooking,
} from "../../src/features/booking/api/booking_service/rest/booking.js";
import { getCenterInfoByIdGQL } from "../../src/features/centers/api/center_service/grahql/center.api.js";
import { getBookingHistory } from "../../src/features/booking/api/booking_service/rest/user.api.js";
const requests: any[] = [];
beforeEach(() => {
  requests.length = 0;
  http.defaults.adapter = async (config: any) => {
    requests.push(config);
    return {
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data:
        config.url === "/graphql"
          ? { data: { center: { centerId: "center-1", courts: [] } } }
          : {
              booking: { _id: "booking-1" },
              mapping: { "court-1": ["trống"] },
              bookingHistory: [],
            },
    };
  };
});
afterEach(() => {
  delete (window as any).__BADMINTON_SESSION__;
  vi.unstubAllEnvs();
});
describe("upstream customer API contracts", () => {
  it("preserves the legacy hold endpoint and hourly payload", async () => {
    const payload = {
      centerId: "center-1",
      bookDate: "2030-01-07",
      userName: "Khách",
      courtBookingDetails: [{ courtId: "court-1", timeslots: [17, 18] }],
    };
    expect(await confirmBookingToDB(payload)).toEqual(
      expect.objectContaining({ booking: { _id: "booking-1" } }),
    );
    expect(requests[0].url).toBe("/api/booking/pending/pendingBookingToDB");
    expect(JSON.parse(requests[0].data)).toEqual(payload);
  });
  it("preserves the mapping and user-history endpoints and response envelopes", async () => {
    expect(await getPendingMapping("center-1", "2030-01-07")).toEqual({
      "court-1": ["trống"],
    });
    await getBookingHistory("user-1", { page: 2, limit: 10 });
    expect(requests.map((r) => r.url)).toEqual([
      "/api/booking/pending/mapping",
      "/api/user/user-1/booking-history",
    ]);
    expect(requests[1].params).toEqual({ page: 2, limit: 10 });
  });
  it("keeps GraphQL centre detail queries and their variables", async () => {
    expect(await getCenterInfoByIdGQL("center-1")).toEqual({
      centerId: "center-1",
      courts: [],
    });
    expect(requests[0].url).toBe("/graphql");
    expect(JSON.parse(requests[0].data).variables).toEqual({
      centerId: "center-1",
    });
  });
  it("sends only the host-supplied bearer token and client ID, with no refresh or login request", async () => {
    (window as any).__BADMINTON_SESSION__ = { accessToken: "external-token" };
    vi.stubEnv("VITE_CLIENT_ID", "web-client");
    await cancelBooking("booking-1");
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("/api/booking/booking-1");
    expect(requests[0].headers.Authorization).toBe("Bearer external-token");
    expect(requests[0].headers["x-client-id"]).toBe("web-client");
  });
});
