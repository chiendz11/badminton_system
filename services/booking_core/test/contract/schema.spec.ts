import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import formats from "ajv-formats";
import { BookingSchema, ReservationSchema } from "@badminton/booking-contracts";
const ajv = new Ajv({ allErrors: true });
formats(ajv);
for (const [folder, name] of [
  ["booking", "reservation-request"],
  ["booking", "reservation-response"],
  ["booking", "booking-response"],
  ["events", "booking-event"],
]) {
  test(`${name}: validates positive examples and rejects negative examples`, () => {
    const base = path.resolve("../../contracts", folder);
    const schema = JSON.parse(
      readFileSync(path.join(base, name + ".schema.json"), "utf8"),
    );
    const examples = JSON.parse(
      readFileSync(path.join(base, name + ".schema.examples.json"), "utf8"),
    );
    const validate = ajv.compile(schema);
    for (const sample of examples.valid) expect(validate(sample)).toBe(true);
    for (const sample of examples.invalid) expect(validate(sample)).toBe(false);
  });
}
test("TypeScript consumers agree with published booking/reservation examples", () => {
  const reservation = JSON.parse(
    readFileSync(
      "../../contracts/booking/reservation-response.schema.examples.json",
      "utf8",
    ),
  ).valid[0];
  const booking = JSON.parse(
    readFileSync(
      "../../contracts/booking/booking-response.schema.examples.json",
      "utf8",
    ),
  ).valid[0];
  expect(() => ReservationSchema.parse(reservation)).not.toThrow();
  expect(() => BookingSchema.parse(booking)).not.toThrow();
  expect(() => BookingSchema.parse({ ...booking, status: "PAID" })).toThrow();
});
