import type { Selection } from "@badminton/booking-contracts";
import { BadRequestException } from "@nestjs/common";
import { createHash } from "node:crypto";
export function canonicalSelections(details: Selection[]) {
  if (
    !details.length ||
    details.length > 8 ||
    new Set(details.map((d) => d.courtId)).size !== details.length
  )
    throw new BadRequestException("Chọn từ 1 đến 8 sân khác nhau");
  return details
    .map((d) => {
      if (
        !d.slots.length ||
        d.slots.length > 24 ||
        new Set(d.slots).size !== d.slots.length ||
        d.slots.some(
          (s) => !Number.isInteger(s) || s < 0 || s >= 1440 || s % 60,
        )
      )
        throw new BadRequestException(
          "Khung giờ phải là giờ tròn, không được trùng",
        );
      return {
        courtId: d.courtId.toLowerCase(),
        slots: [...d.slots].sort((a, b) => a - b),
      };
    })
    .sort((a, b) => a.courtId.localeCompare(b.courtId));
}
export function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
