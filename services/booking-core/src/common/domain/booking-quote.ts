import type { PricingBand, Selection } from "@badminton/booking-contracts";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { QuoteSelection } from "./booking.types";
import { futureDate, slotTime } from "./calendar";
import { slotPrice } from "./pricing";
import { canonicalSelections } from "./selections";
interface QuoteCenter {
  isActive: boolean;
  openMinute: number;
  closeMinute: number;
  courts: { id: string; name: string; isActive: boolean }[];
  pricing: PricingBand[];
}
export function quoteSlots(
  center: QuoteCenter,
  now: Date,
  date: string,
  details: Selection[],
): QuoteSelection[] {
  futureDate(date, now);
  if (!center.isActive) throw new ConflictException("Trung tâm đang tạm dừng");
  return canonicalSelections(details).map((detail) => {
    const court = center.courts.find(
      (c) => c.id === detail.courtId && c.isActive,
    );
    if (!court)
      throw new BadRequestException("Sân không thuộc trung tâm hoặc đã đóng");
    for (const slot of detail.slots)
      if (
        slot < center.openMinute ||
        slot + 60 > center.closeMinute ||
        slotTime(date, slot) <= now
      )
        throw new BadRequestException("Khung giờ đã qua hoặc ngoài giờ mở cửa");
    return {
      ...detail,
      courtName: court.name,
      price: detail.slots.reduce(
        (sum, slot) => sum + slotPrice(center.pricing, date, slot),
        0,
      ),
    };
  });
}
