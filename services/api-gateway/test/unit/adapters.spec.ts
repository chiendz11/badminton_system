import { describe, it, expect } from "vitest";
import {
  calendarDate,
  explicitFixed,
  hours,
  pricingBands,
  listQuery,
} from "../../src/modules/booking/legacy-mappers";
const court = "22222222-2222-4222-8222-222222222221",
  center = "11111111-1111-4111-8111-111111111111";
describe("legacy adapters", () => {
  it("converts legacy hour slots and validates duplicates/bounds", () => {
    expect(hours([18, 17])).toEqual([1020, 1080]);
    expect(() => hours([17, 17])).toThrow();
    expect(() => hours([24])).toThrow();
  });
  it("keeps Vietnam dates when legacy clients send ISO timestamps", () => {
    expect(calendarDate("2030-01-06T17:00:00Z")).toBe("2030-01-07");
    expect(() => calendarDate("2030-02-30")).toThrow();
    expect(() => calendarDate("January 7 2030")).toThrow();
  });
  it("keeps distinct court/hour selections per fixed occurrence", () => {
    const data = explicitFixed({
      centerId: center,
      userId: "customer",
      userName: "Khách",
      bookings: [
        { date: "2030-01-08", courtId: court, timeslots: [18] },
        { date: "2030-01-07", courtId: court, timeslots: [17] },
      ],
    });
    expect(data.occurrences.map((x) => x.selections[0].slots)).toEqual([
      [1020],
      [1080],
    ]);
    expect(data.weekdays).toEqual([1, 2]);
  });
  it("rejects duplicate court rows instead of silently dropping an occurrence", () => {
    const row = { date: "2030-01-07", courtId: court, timeslots: [17] };
    expect(() =>
      explicitFixed({
        centerId: center,
        userId: "c",
        userName: "C",
        bookings: [row, row],
      }),
    ).toThrow();
  });
  it("maps pricing bands and legacy admin filters", () => {
    expect(
      pricingBands({
        weekday: [{ startTime: "05:00", endTime: "24:00", price: 0 }],
      }),
    ).toEqual([
      {
        dayType: "WEEKDAY",
        startMinute: 300,
        endMinute: 1440,
        pricePerHour: 0,
      },
    ]);
    expect(listQuery({ status: "paid", type: "monthly" })).toContain(
      "type=FIXED",
    );
    expect(listQuery({ status: "pending" })).toBeNull();
  });
});
