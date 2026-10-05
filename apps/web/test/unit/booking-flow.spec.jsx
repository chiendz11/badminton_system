import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import Booking from "../../src/features/booking/pages/Booking.jsx";
import { SessionProvider } from "../../src/shared/session/SessionContext.jsx";
import { getCenterInfoByIdGQL } from "../../src/features/centers/api/center_service/grahql/center.api.js";
import {
  getPendingMapping,
  confirmBookingToDB,
} from "../../src/features/booking/api/booking_service/rest/booking.js";
vi.mock(
  "../../src/features/centers/api/center_service/grahql/center.api.js",
  () => ({ getCenterInfoByIdGQL: vi.fn() }),
);
vi.mock(
  "../../src/features/booking/api/booking_service/rest/booking.js",
  () => ({ getPendingMapping: vi.fn(), confirmBookingToDB: vi.fn() }),
);
const center = {
  centerId: "center-1",
  name: "Sân gốc",
  courts: [{ courtId: "court-1", name: "Sân 1" }],
  pricing: {
    weekday: [{ startTime: "05:00", endTime: "24:00", price: 50000 }],
    weekend: [{ startTime: "05:00", endTime: "24:00", price: 50000 }],
  },
};
beforeEach(() => {
  localStorage.clear();
  vi.setSystemTime(new Date("2030-01-07T00:00:00+07:00"));
  vi.spyOn(window, "alert").mockImplementation(() => {});
  getCenterInfoByIdGQL.mockResolvedValue(center);
  getPendingMapping.mockResolvedValue({});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
async function select() {
  render(
    <MemoryRouter initialEntries={["/booking?centerId=center-1"]}>
      <SessionProvider
        session={{ profile: { userId: "customer-1", name: "Khách" } }}
      >
        <Booking />
      </SessionProvider>
    </MemoryRouter>,
  );
  await screen.findByText("Sân gốc");
  await waitFor(() => expect(getPendingMapping).toHaveBeenCalled());
  fireEvent.click(screen.getAllByTitle("trống")[0].parentElement);
  fireEvent.click(screen.getByTestId("confirm-booking-button"));
  fireEvent.click(
    screen.getByRole("button", { name: "Xác nhận", exact: true }),
  );
}
describe("upstream booking flow", () => {
  it("confirms hourly slots using the original payload and stays on the original grid", async () => {
    confirmBookingToDB.mockResolvedValue({
      booking: { _id: "booking-1", bookingStatus: "confirmed" },
    });
    await select();
    await waitFor(() =>
      expect(confirmBookingToDB).toHaveBeenCalledWith(
        {
          centerId: "center-1",
          bookDate: "2030-01-07",
          userName: "Khách",
          courtBookingDetails: [{ courtId: "court-1", timeslots: [5] }],
        },
        expect.any(String),
      ),
    );
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        "Đặt sân thành công! Mã đơn: booking-1",
      ),
    );
    expect(screen.getByTestId("booking-page")).toBeInTheDocument();
    expect(localStorage.getItem("bookingId")).toBeNull();
  });
  it("reports a competing hold and clears the conflicting slot rather than showing a successful booking", async () => {
    confirmBookingToDB.mockRejectedValue({
      response: {
        status: 409,
        data: {
          message: "Khung giờ đã được giữ chỗ",
          conflictedSlots: [{ courtId: "court-1", timeslot: 5 }],
        },
      },
    });
    await select();
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith("Khung giờ đã được giữ chỗ"),
    );
    expect(
      screen.queryByTestId("confirm-booking-button"),
    ).not.toBeInTheDocument();
  });
});
