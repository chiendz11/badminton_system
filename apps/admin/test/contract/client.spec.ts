import { describe, it, expect, beforeEach } from "vitest";
import http from "../../src/shared/api/http.js";
import {
  getAllBookingsForAdmin,
  createFixedBookings,
  getAvailableCourts,
} from "../../src/features/booking/api/booking_service/rest/booking.api.js";
import {
  getAllCentersGQL,
  updateCenterGQL,
} from "../../src/features/centers/api/center_service/graphql/center.api.js";
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
          ? { data: { centers: [] } }
          : { success: true, data: [], totalPages: 1 },
    };
  };
});
describe("upstream admin API contracts", () => {
  it("keeps admin booking filters and their original response envelope", async () => {
    const filters = { centerId: "center-1", type: "monthly", page: 2 };
    expect(await getAllBookingsForAdmin(filters)).toEqual({
      success: true,
      data: [],
      totalPages: 1,
    });
    expect(requests[0].url).toBe("/api/booking/bookings");
    expect(requests[0].params).toEqual(filters);
  });
  it("preserves fixed-booking and availability payloads in hours", async () => {
    const payload = {
      userId: "user-1",
      centerId: "center-1",
      type: "fixed",
      bookings: [
        { date: "2030-01-07", courtId: "court-1", timeslots: [17, 18] },
      ],
    };
    await createFixedBookings(payload);
    await getAvailableCourts({
      centerId: "center-1",
      startDate: "2030-01-07",
      daysOfWeek: [1, 3],
      timeslots: ["17:00", "18:00"],
    });
    expect(requests.map((r) => r.url)).toEqual([
      "/api/booking/create-fixed-bookings",
      "/api/booking/check-available-courts",
    ]);
    expect(JSON.parse(requests[0].data)).toEqual(payload);
    expect(JSON.parse(requests[1].data).timeslots).toEqual(["17:00", "18:00"]);
  });
  it("keeps the original centre GraphQL query through the gateway", async () => {
    await getAllCentersGQL();
    expect(requests[0].url).toBe("/graphql");
    expect(requests).toHaveLength(1);
  });
  it("updates centre data without sending absent media fields that would clear stored metadata", async () => {
    await updateCenterGQL("center-1", { name: "Tên mới", totalCourts: 4 });
    expect(requests[0].url).toBe("/graphql");
    const payload = JSON.parse(requests[0].data);
    expect(payload.variables).toMatchObject({
      centerId: "center-1",
      data: { name: "Tên mới", totalCourts: 4 },
    });
    expect(payload.variables.data).not.toHaveProperty("logoFileId");
    expect(payload.variables.data).not.toHaveProperty("imageFileIds");
  });
});
