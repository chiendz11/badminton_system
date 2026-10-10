import { describe, it, expect } from "vitest";
import { buildSchema, parse, validate } from "graphql";
import { readFileSync } from "node:fs";
import path from "node:path";
import { centerTypeDefs } from "../../src/modules/centers/center.schema";
import { bookingView } from "../../src/modules/booking/legacy-mappers";
describe("published legacy UI contracts", () => {
  it("accepts the actual web/admin GraphQL fragments, queries and mutations", () => {
    const schema = buildSchema(centerTypeDefs);
    for (const app of ["web", "admin"]) {
      const file = path.resolve(
        process.cwd(),
        `../../apps/${app}/src/features/centers/api/center_service/${app === "web" ? "grahql" : "graphql"}/center.api.js`,
      );
      const text = readFileSync(file, "utf8"),
        constants: Record<string, string> = {};
      for (const match of text.matchAll(/const ([A-Z_]+) = `([\s\S]*?)`;/g)) {
        constants[match[1]] = match[2].replace(
          /\$\{([A-Z_]+)\}/g,
          (_all, key) => constants[key],
        );
      }
      for (const [key, query] of Object.entries(constants))
        if (key.includes("QUERY") || key.includes("MUTATION"))
          expect(validate(schema, parse(query)), key).toEqual([]);
    }
  });
  it("returns the admin invoice and customer history fields using server prices", () => {
    const result = bookingView({
      id: "booking-id",
      centerId: "center",
      centerName: "Trung tâm",
      userId: "customer",
      userName: "Khách",
      date: "2030-01-07",
      status: "CONFIRMED",
      type: "FIXED",
      totalPrice: 80000,
      selections: [
        { courtId: "court", courtName: "Sân 1", slots: [1020], price: 80000 },
      ],
      createdAt: "2030-01-01",
    });
    expect(result).toMatchObject({
      _id: "booking-id",
      bookingStatus: "confirmed",
      bookingType: "monthly",
      price: 80000,
      courtBookingDetails: [
        { courtId: "court", courtName: "Sân 1", timeslots: [17] },
      ],
    });
    expect(result.court_time).toContain("17:00–18:00");
  });
});
