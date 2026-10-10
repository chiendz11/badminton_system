import type { PricingBand } from "@badminton/booking-contracts";
import { BadRequestException } from "@nestjs/common";
import { isWeekend } from "./calendar";
export function validateBands(
  bands: PricingBand[],
  open: number,
  close: number,
) {
  if (open < 0 || close > 1440 || open >= close || open % 60 || close % 60)
    throw new BadRequestException(
      "Giờ mở cửa phải theo giờ tròn trong cùng một ngày",
    );
  for (const dayType of ["WEEKDAY", "WEEKEND"]) {
    const rows = bands
      .filter((b) => b.dayType === dayType)
      .sort((a, b) => a.startMinute - b.startMinute);
    let cursor = open;
    for (const band of rows) {
      if (
        band.startMinute !== cursor ||
        band.endMinute <= band.startMinute ||
        band.endMinute > close ||
        band.endMinute % 60 ||
        !Number.isInteger(band.pricePerHour) ||
        band.pricePerHour < 0 ||
        band.pricePerHour > 2_000_000
      )
        throw new BadRequestException(
          "Bảng giá phải phủ đầy đủ giờ mở cửa, không chồng lấn hoặc bỏ trống",
        );
      cursor = band.endMinute;
    }
    if (cursor !== close)
      throw new BadRequestException(
        "Thiếu bảng giá cho ngày thường hoặc cuối tuần",
      );
  }
}
export function slotPrice(bands: PricingBand[], date: string, minute: number) {
  const dayType = isWeekend(date) ? "WEEKEND" : "WEEKDAY";
  const band = bands.find(
    (b) =>
      b.dayType === dayType &&
      minute >= b.startMinute &&
      minute + 60 <= b.endMinute,
  );
  if (!band) throw new BadRequestException("Khung giờ chưa có giá");
  return band.pricePerHour;
}
