import type { PricingBand } from "@badminton/booking-contracts";
import { discountedQuote } from "@badminton/booking-contracts";
import {
  calendarDate,
  fixedDates,
  isWeekend,
  slotTime,
  vietnamDate,
} from "../../src/common/domain/calendar";
import { slotPrice, validateBands } from "../../src/common/domain/pricing";
import {
  canonicalSelections,
  fingerprint,
} from "../../src/common/domain/selections";
const bands: PricingBand[] = [
  {
    dayType: "WEEKDAY",
    startMinute: 300,
    endMinute: 1020,
    pricePerHour: 80000,
  },
  {
    dayType: "WEEKDAY",
    startMinute: 1020,
    endMinute: 1440,
    pricePerHour: 120000,
  },
  {
    dayType: "WEEKEND",
    startMinute: 300,
    endMinute: 1440,
    pricePerHour: 130000,
  },
];
describe("Legacy pricing refactored to Vietnam-local slots", () => {
  test("uses half-open peak-time boundaries", () => {
    expect(slotPrice(bands, "2030-01-08", 960)).toBe(80000);
    expect(slotPrice(bands, "2030-01-08", 1020)).toBe(120000);
  });
  test("uses weekend pricing", () => {
    expect(isWeekend("2030-01-12")).toBe(true);
    expect(slotPrice(bands, "2030-01-12", 600)).toBe(130000);
  });
  test("converts local midnight across UTC date boundary", () => {
    expect(slotTime("2030-01-08", 0).toISOString()).toBe(
      "2030-01-07T17:00:00.000Z",
    );
    expect(slotTime("2030-01-08", 1440).toISOString()).toBe(
      "2030-01-08T17:00:00.000Z",
    );
    expect(vietnamDate(new Date("2030-01-07T18:00:00Z"))).toBe("2030-01-08");
  });
  test.each(["2030-02-30", "2030-13-01", "01-01-2030", ""])(
    "rejects invalid calendar date %s",
    (value) => expect(() => calendarDate(value)).toThrow(),
  );
  test("accepts leap date", () =>
    expect(calendarDate("2032-02-29")).toBe("2032-02-29"));
  test("rejects missing, overlapping or gapped pricing", () => {
    expect(() => validateBands(bands, 300, 1440)).not.toThrow();
    expect(() => validateBands(bands.slice(0, 2), 300, 1440)).toThrow();
    expect(() =>
      validateBands(
        [{ ...bands[0], endMinute: 1080 }, bands[1], bands[2]],
        300,
        1440,
      ),
    ).toThrow();
  });
  test("normalizes selections for request idempotency", () => {
    const left = canonicalSelections([
      { courtId: "b", slots: [660, 600] },
      { courtId: "a", slots: [600] },
    ]);
    const right = canonicalSelections([
      { courtId: "a", slots: [600] },
      { courtId: "b", slots: [600, 660] },
    ]);
    expect(fingerprint(left)).toBe(fingerprint(right));
  });
  test("rejects duplicate courts, duplicate slots, fractional slots", () => {
    expect(() =>
      canonicalSelections([{ courtId: "a", slots: [600, 600] }]),
    ).toThrow();
    expect(() =>
      canonicalSelections([{ courtId: "a", slots: [601] }]),
    ).toThrow();
    expect(() =>
      canonicalSelections([
        { courtId: "a", slots: [600] },
        { courtId: "a", slots: [660] },
      ]),
    ).toThrow();
  });
  test("expands fixed bookings only on requested weekdays", () => {
    expect(
      fixedDates(
        "2030-01-08",
        "2030-01-14",
        [2, 4],
        new Date("2030-01-07T00:00:00Z"),
      ),
    ).toEqual(["2030-01-08", "2030-01-10"]);
  });
});

test("preserves legacy loyalty and multi-court discounts without trusting request prices", () => {
  expect(discountedQuote(160000, 2, 4000)).toEqual({
    basePrice: 160000,
    totalPrice: 136000,
    discountAmount: 24000,
    discountPercent: 15,
  });
  expect(discountedQuote(80000, 1, 2000).totalPrice).toBe(76000);
  expect(discountedQuote(80000, 1, 0).totalPrice).toBe(80000);
});
