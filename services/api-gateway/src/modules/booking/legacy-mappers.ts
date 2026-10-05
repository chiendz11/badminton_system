import { z } from "zod";
import { GatewayError, assert } from "../../middleware/http-errors";
export const uuid = z.string().uuid();
export function id(value: unknown) {
  return uuid.parse(value);
}
export function calendarDate(value: unknown): string {
  assert(typeof value === "string", "Ngày không hợp lệ");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    z.string().datetime({ offset: true }).parse(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : new Date(value).toLocaleDateString("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      });
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      Number.isFinite(Date.parse(date + "T00:00:00Z")) &&
      new Date(date + "T00:00:00Z").toISOString().slice(0, 10) === date,
    "Ngày không hợp lệ",
  );
  return date;
}
export function plusDays(date: string, days: number) {
  return new Date(Date.parse(date + "T12:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function hours(value: unknown) {
  return z
    .array(z.number().int().min(5).max(23))
    .min(1)
    .max(19)
    .refine((a) => new Set(a).size === a.length, "Giờ không được trùng")
    .parse(value)
    .sort((a, b) => a - b)
    .map((hour) => hour * 60);
}
export function time(value: string) {
  const match = /^(\d{2}):(00)$/.exec(value);
  assert(match && Number(match[1]) <= 24, "Giờ phải là HH:00");
  return Number(match[1]) * 60;
}
export function hhmm(minute: number) {
  return String(Math.floor(minute / 60)).padStart(2, "0") + ":00";
}
export function pricingBands(pricing: any) {
  return ["weekday", "weekend"].flatMap((day) =>
    (pricing[day] || []).map((band: any) => ({
      dayType: day === "weekday" ? "WEEKDAY" : "WEEKEND",
      startMinute: time(band.startTime),
      endMinute: time(band.endTime),
      pricePerHour: band.price ?? 0,
    })),
  );
}
export function centerView(center: any) {
  return {
    id: center.id,
    centerId: center.id,
    name: center.name,
    address: center.address,
    phone: center.phone,
    description: center.description,
    facilities: center.facilities,
    googleMapUrl: center.googleMapUrl,
    isActive: center.isActive,
    centerManagerId: center.managerId,
    totalCourts: center.courts.filter((court: any) => court.isActive).length,
    logoFileId: center.logoFileId,
    imageFileIds: center.imageFileIds || [],
    logoUrl: null,
    imageUrlList: [],
    avgRating: null,
    bookingCount: null,
    courts: center.courts
      .filter((court: any) => court.isActive)
      .map((court: any) => ({
        id: court.id,
        courtId: court.id,
        name: court.name,
        type: court.surface,
        isActive: court.isActive,
      })),
    pricing: {
      weekday: center.pricing
        .filter((band: any) => band.dayType === "WEEKDAY")
        .map((band: any) => ({
          startTime: hhmm(band.startMinute),
          endTime: hhmm(band.endMinute),
          price: band.pricePerHour,
        })),
      weekend: center.pricing
        .filter((band: any) => band.dayType === "WEEKEND")
        .map((band: any) => ({
          startTime: hhmm(band.startMinute),
          endTime: hhmm(band.endMinute),
          price: band.pricePerHour,
        })),
    },
  };
}
export function bookingView(booking: any) {
  return {
    _id: booking.id,
    bookingId: booking.id,
    orderId: booking.id.slice(-6).toUpperCase(),
    centerId: booking.centerId,
    center: booking.centerName,
    userId: booking.userId,
    userName: booking.userName,
    startsAt: new Date(
      Date.parse(booking.date + "T00:00:00+07:00") +
        Math.min(...booking.selections.flatMap((s: any) => s.slots)) * 60000,
    ).toISOString(),
    endsAt: new Date(
      Date.parse(booking.date + "T00:00:00+07:00") +
        (Math.max(...booking.selections.flatMap((s: any) => s.slots)) + 60) *
          60000,
    ).toISOString(),
    bookDate: booking.date,
    date: booking.date,
    bookingStatus: booking.status.toLowerCase(),
    status: booking.status.toLowerCase(),
    bookingType: booking.type === "FIXED" ? "monthly" : "daily",
    price: booking.totalPrice,
    createdAt: booking.createdAt,
    paymentMethod: "",
    courtBookingDetails: booking.selections.map((selection: any) => ({
      courtId: selection.courtId,
      courtName: selection.courtName,
      timeslots: selection.slots.map((minute: number) => minute / 60),
    })),
    court_time: booking.selections
      .map(
        (selection: any) =>
          selection.courtName +
          ": " +
          selection.slots
            .map((minute: number) => hhmm(minute) + "–" + hhmm(minute + 60))
            .join(", "),
      )
      .join("\n"),
  };
}
export function page(query: any) {
  return z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    })
    .parse(query);
}
export function listQuery(query: any) {
  const params = new URLSearchParams(page(query) as any);
  if (query.centerId) params.set("centerId", id(query.centerId));
  if (query.date) params.set("date", calendarDate(query.date));
  for (const key of ["dateFrom", "dateTo"])
    if (query[key]) params.set(key, calendarDate(query[key]));
  if (query.search)
    params.set("search", z.string().max(100).parse(query.search));
  if (query.type) {
    assert(
      ["daily", "monthly", "fixed"].includes(query.type),
      "Loại booking không hợp lệ",
    );
    params.set("type", query.type === "daily" ? "DAILY" : "FIXED");
  }
  if (query.status) {
    assert(
      ["paid", "confirmed", "cancelled", "pending", "failed"].includes(
        query.status,
      ),
      "Trạng thái không hợp lệ",
    );
    if (["pending", "failed"].includes(query.status)) return null;
    params.set(
      "status",
      query.status === "cancelled" ? "CANCELLED" : "CONFIRMED",
    );
  }
  return params.toString();
}
export function explicitFixed(body: any) {
  const parsed = z
    .object({
      centerId: uuid,
      userId: z.string().min(1).max(128),
      userName: z.string().min(1).max(150),
      bookings: z
        .array(
          z.object({ date: z.string(), courtId: uuid, timeslots: z.unknown() }),
        )
        .min(1)
        .max(480),
    })
    .parse(body);
  const byDate = new Map<string, Map<string, number[]>>();
  for (const booking of parsed.bookings) {
    const date = calendarDate(booking.date),
      courts = byDate.get(date) || new Map<string, number[]>();
    assert(!courts.has(booking.courtId), "Sân bị trùng trong cùng ngày");
    courts.set(booking.courtId, hours(booking.timeslots));
    byDate.set(date, courts);
  }
  const occurrences = [...byDate]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, courts]) => ({
      date,
      selections: [...courts]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([courtId, slots]) => ({ courtId, slots })),
    }));
  assert(occurrences.length <= 60, "Tối đa 60 ngày");
  return {
    centerId: parsed.centerId,
    userId: parsed.userId,
    userName: parsed.userName,
    startDate: occurrences[0].date,
    endDate: occurrences.at(-1)!.date,
    weekdays: [
      ...new Set(
        occurrences.map((item) =>
          new Date(item.date + "T12:00:00Z").getUTCDay(),
        ),
      ),
    ].sort(),
    selections: occurrences[0].selections,
    occurrences,
  };
}
export function graphqlError(error: unknown) {
  return error instanceof GatewayError
    ? error
    : new GatewayError(400, "Dữ liệu không hợp lệ");
}
