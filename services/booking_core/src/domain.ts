import { BadRequestException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { PricingBand, Selection } from "@badminton/booking-contracts";
export function calendarDate(value: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value + "T00:00:00Z")) ||
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value
  )
    throw new BadRequestException(
      "Ngày phải có định dạng YYYY-MM-DD và tồn tại",
    );
  return value;
}
export function vietnamDate(now: Date) {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}
export function slotTime(date: string, minute: number) {
  return new Date(
    new Date(calendarDate(date) + "T00:00:00+07:00").getTime() +
      minute * 60_000,
  );
}
export function isWeekend(date: string) {
  return [0, 6].includes(
    new Date(calendarDate(date) + "T12:00:00Z").getUTCDay(),
  );
}
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
export function futureDate(date: string, now: Date) {
  calendarDate(date);
  const today = vietnamDate(now),
    limit = vietnamDate(new Date(now.getTime() + 90 * 86400_000));
  if (date < today || date > limit)
    throw new BadRequestException("Chỉ đặt sân từ hôm nay đến 90 ngày tới");
}
export function fixedDates(
  start: string,
  end: string,
  weekdays: number[],
  now: Date,
) {
  futureDate(start, now);
  futureDate(end, now);
  if (
    end < start ||
    !weekdays.length ||
    new Set(weekdays).size !== weekdays.length ||
    weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  )
    throw new BadRequestException(
      "Khoảng ngày hoặc thứ trong tuần không hợp lệ",
    );
  const result: string[] = [];
  for (
    let day = new Date(start + "T12:00:00Z");
    day.toISOString().slice(0, 10) <= end;
    day = new Date(day.getTime() + 86400_000)
  )
    if (weekdays.includes(day.getUTCDay()))
      result.push(day.toISOString().slice(0, 10));
  if (!result.length || result.length > 60)
    throw new BadRequestException("Lịch cố định phải có từ 1 đến 60 ngày");
  return result;
}
