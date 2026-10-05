import { describe, it, expect } from "vitest";
import { BookingSchema, ReservationSchema } from "@badminton/booking-contracts";
import booking from "../../../contracts/booking/booking-response.schema.examples.json";
import reservation from "../../../contracts/booking/reservation-response.schema.examples.json";
describe("booking API consumer contracts", () => {
  it("accepts published examples", () => {
    expect(BookingSchema.parse(booking.valid[0]).status).toBe("CONFIRMED");
    expect(ReservationSchema.parse(reservation.valid[0]).status).toBe("HELD");
  });
  it("rejects missing or incompatible fields", () => {
    expect(() =>
      BookingSchema.parse({ ...booking.valid[0], status: "PAID" }),
    ).toThrow();
    expect(() =>
      ReservationSchema.parse({
        ...reservation.valid[0],
        totalPrice: "100000",
      }),
    ).toThrow();
  });
});
