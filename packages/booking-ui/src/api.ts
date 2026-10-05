import { z } from "zod";
import {
  AvailabilitySchema,
  BookingSchema,
  CenterSchema,
  ReservationSchema,
} from "@badminton/booking-contracts";
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
  }
}
export function requestKey() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `request-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
export function apiClient(base: string, getToken: () => string | undefined) {
  async function call<T>(
    path: string,
    init: RequestInit = {},
    schema?: z.ZodType<T>,
  ): Promise<T> {
    const token = getToken();
    let response: Response;
    try {
      response = await fetch(base + path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": requestKey(),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
      });
    } catch {
      throw new ApiError("Không kết nối được hệ thống. Vui lòng thử lại.", 0);
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = Array.isArray(body.message)
        ? body.message.join("; ")
        : body.message || "Yêu cầu không thành công";
      const requestId = response.headers.get("x-request-id") || body.requestId;
      console.warn({
        event: "booking.api.error",
        status: response.status,
        requestId,
      });
      throw new ApiError(message, response.status, requestId);
    }
    if (schema) {
      const parsed = schema.safeParse(body);
      if (!parsed.success)
        throw new ApiError(
          "Dữ liệu trả về chưa đúng định dạng, vui lòng thử lại.",
          502,
          response.headers.get("x-request-id") || undefined,
        );
      return parsed.data;
    }
    return body as T;
  }
  return {
    call,
    centers: (managed = false) =>
      call(
        "/api/v1/centers?limit=100" + (managed ? "&managed=true" : ""),
        {},
        z.object({
          items: z.array(CenterSchema),
          total: z.number(),
          page: z.number(),
          limit: z.number(),
        }),
      ),
    availability: (id: string, date: string) =>
      call(
        `/api/v1/centers/${id}/availability?date=${date}`,
        {},
        AvailabilitySchema,
      ),
    fixedAvailability: (data: unknown) =>
      call(
        "/api/v1/availability/fixed",
        { method: "POST", body: JSON.stringify(data) },
        AvailabilitySchema.extend({ dates: z.array(z.string()) }),
      ),
    reserve: (data: unknown, key: string) =>
      call(
        "/api/v1/reservations",
        {
          method: "POST",
          headers: { "Idempotency-Key": key },
          body: JSON.stringify(data),
        },
        ReservationSchema,
      ),
    confirm: (id: string) =>
      call(
        `/api/v1/reservations/${id}/confirm`,
        { method: "POST" },
        BookingSchema,
      ),
    release: (id: string) =>
      call(
        `/api/v1/reservations/${id}`,
        { method: "DELETE" },
        ReservationSchema,
      ),
    cancel: (id: string) =>
      call(`/api/v1/bookings/${id}/cancel`, { method: "POST" }, BookingSchema),
    bookings: (path = "/api/v1/bookings/me") =>
      call(
        path,
        {},
        z.object({
          items: z.array(BookingSchema),
          total: z.number(),
          page: z.number(),
          limit: z.number(),
        }),
      ),
  };
}
