import { BadRequestException } from "@nestjs/common";
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
