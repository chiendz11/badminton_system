import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { BookingCoreClient } from "../../clients/booking-core.client";
import { assert } from "../../middleware/http-errors";
import {
  bookingView,
  calendarDate,
  explicitFixed,
  hours,
  id,
  listQuery,
  page,
  plusDays,
} from "./legacy-mappers";
export class BookingAdapter {
  constructor(private readonly core: BookingCoreClient) {}
  async mapping(req: Request) {
    const centerId = id(req.query.centerId),
      date = calendarDate(req.query.date);
    const data = await this.core.call(
      req,
      `/api/v1/centers/${centerId}/availability?date=${date}`,
    );
    return {
      mapping: Object.fromEntries(
        data.courts.map((court: any) => {
          const slots = Array(19).fill("locked");
          for (const slot of court.slots) {
            const index = slot.minute / 60 - 5;
            if (index >= 0 && index < 19)
              slots[index] =
                slot.state === "AVAILABLE"
                  ? "trống"
                  : ["CLOSED", "PAST"].includes(slot.state)
                    ? "locked"
                    : {
                        status: slot.state === "BOOKED" ? "đã đặt" : "pending",
                      };
          }
          return [court.id, slots];
        }),
      ),
    };
  }
  async book(req: Request) {
    const body = z
      .object({
        centerId: z.string().uuid(),
        bookDate: z.string(),
        courtBookingDetails: z
          .array(
            z.object({ courtId: z.string().uuid(), timeslots: z.unknown() }),
          )
          .min(1)
          .max(8),
      })
      .parse(req.body);
    const key = req.get("idempotency-key") || randomUUID();
    const reservation = await this.core.call(
      req,
      "/api/v1/reservations",
      "POST",
      {
        centerId: body.centerId,
        date: calendarDate(body.bookDate),
        selections: body.courtBookingDetails.map((item) => ({
          courtId: item.courtId,
          slots: hours(item.timeslots),
        })),
      },
      key,
    );
    const booking = await this.core.call(
      req,
      `/api/v1/reservations/${reservation.id}/confirm`,
      "POST",
    );
    return { message: "Đặt sân thành công", booking: bookingView(booking) };
  }
  async list(req: Request, admin: boolean) {
    const filters = listQuery(req.query),
      paging = page(req.query);
    if (filters === null)
      return admin
        ? { data: [], total: 0, totalPages: 0, ...paging }
        : { bookingHistory: [], total: 0, totalPages: 0, ...paging };
    const response = await this.core.call(
      req,
      (admin ? "/api/v1/bookings" : "/api/v1/bookings/me") + "?" + filters,
    );
    return {
      ...paging,
      total: response.total,
      totalPages: Math.ceil(response.total / response.limit),
      ...(admin
        ? { data: response.items.map(bookingView) }
        : { bookingHistory: response.items.map(bookingView) }),
    };
  }
  async cancel(req: Request) {
    assert(req.body?.status === "cancelled", "Chỉ hỗ trợ hủy booking");
    return bookingView(
      await this.core.call(
        req,
        "/api/v1/bookings/" + id(req.params.bookingId) + "/cancel",
        "POST",
      ),
    );
  }
  async remove(req: Request) {
    return bookingView(
      await this.core.call(
        req,
        "/api/v1/bookings/" + id(req.params.bookingId),
        "DELETE",
      ),
    );
  }
  async status(req: Request) {
    const booking = bookingView(
      await this.core.call(req, "/api/v1/bookings/" + id(req.params.id)),
    );
    return {
      bookingId: booking.bookingId,
      status: booking.status,
      bookingStatus: booking.status,
    };
  }
  async pending(req: Request) {
    const data = await this.core.call(
      req,
      "/api/v1/reservations?centerId=" + id(req.query.centerId),
    );
    return { exists: data.items.length > 0 };
  }
  async stats(req: Request) {
    const period = z
      .enum(["week", "month", "year"])
      .default("month")
      .parse(req.query.period);
    return this.core.call(req, "/api/v1/bookings/me/stats?period=" + period);
  }
  async fixed(req: Request) {
    const data = explicitFixed(req.body);
    const result = await this.core.call(
      req,
      "/api/v1/bookings/fixed",
      "POST",
      data,
      req.get("idempotency-key") || randomUUID(),
    );
    return result.items.map(bookingView);
  }
  async available(req: Request) {
    const data = z
      .object({
        centerId: z.string().uuid(),
        startDate: z.string(),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
        timeslots: z.array(z.string()).min(1).max(19),
      })
      .parse(req.body);
    const startDate = calendarDate(data.startDate),
      endDate = plusDays(startDate, 30),
      minutes = hours(
        data.timeslots.map((value) => {
          assert(/^\d{1,2}:00$/.test(value), "Giờ không hợp lệ");
          return Number(value.split(":")[0]);
        }),
      );
    const result: Record<number, any[]> = Object.create(null);
    for (const day of data.daysOfWeek) {
      const calendar = await this.core.call(
        req,
        "/api/v1/availability/fixed",
        "POST",
        { centerId: data.centerId, startDate, endDate, weekdays: [day] },
      );
      result[day] = calendar.courts
        .filter((court: any) =>
          minutes.every((minute) =>
            court.slots.some(
              (slot: any) => slot.minute === minute && slot.available,
            ),
          ),
        )
        .map((court: any) => ({
          courtId: court.id,
          _id: court.id,
          name: court.name,
          type: court.surface,
        }));
    }
    return result;
  }
}
