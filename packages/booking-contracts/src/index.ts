import { z } from "zod";
export const DAY_TYPES = ["WEEKDAY", "WEEKEND"] as const;
export type DayType = (typeof DAY_TYPES)[number];
export interface PricingBand {
  dayType: DayType;
  startMinute: number;
  endMinute: number;
  pricePerHour: number;
}
export interface Selection {
  courtId: string;
  slots: number[];
}
export const CourtSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  surface: z.string(),
  isActive: z.boolean(),
});
export const PricingSchema = z.object({
  dayType: z.enum(DAY_TYPES),
  startMinute: z.number().int(),
  endMinute: z.number().int(),
  pricePerHour: z.number().int().nonnegative(),
});
export const CenterSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  description: z.string(),
  managerId: z.string(),
  isActive: z.boolean(),
  openMinute: z.number().int(),
  closeMinute: z.number().int(),
  timezone: z.literal("Asia/Ho_Chi_Minh"),
  courts: z.array(CourtSchema),
  pricing: z.array(PricingSchema),
  facilities: z.array(z.string()),
});
export const SlotSchema = z.object({
  minute: z.number().int(),
  price: z.number().int().nonnegative(),
  available: z.boolean(),
  state: z.enum(["AVAILABLE", "HELD", "BOOKED", "PAST", "CLOSED"]),
});
export const AvailabilitySchema = z.object({
  centerId: z.string().uuid(),
  date: z.string(),
  courts: z.array(CourtSchema.extend({ slots: z.array(SlotSchema) })),
});
export const ReservationSchema = z.object({
  id: z.string().uuid(),
  centerId: z.string().uuid(),
  userId: z.string(),
  date: z.string(),
  status: z.enum(["HELD", "CONFIRMED", "EXPIRED", "CANCELLED"]),
  expiresAt: z.string().datetime(),
  totalPrice: z.number().int().nonnegative(),
  basePrice: z.number().int().nonnegative().optional(),
  discountAmount: z.number().int().nonnegative().optional(),
  discountPercent: z.number().int().min(0).max(15).optional(),
  selections: z.array(
    z.object({
      courtId: z.string().uuid(),
      courtName: z.string(),
      slots: z.array(z.number().int()),
      price: z.number().int().nonnegative(),
    }),
  ),
});
export const BookingSchema = z.object({
  id: z.string().uuid(),
  reservationId: z.string().uuid(),
  centerId: z.string().uuid(),
  centerName: z.string(),
  userId: z.string(),
  userName: z.string(),
  date: z.string(),
  status: z.enum(["CONFIRMED", "CANCELLED"]),
  type: z.enum(["DAILY", "FIXED"]),
  totalPrice: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  selections: ReservationSchema.shape.selections,
});
export type Center = z.infer<typeof CenterSchema>;
export type Court = z.infer<typeof CourtSchema>;
export type Availability = z.infer<typeof AvailabilitySchema>;
export type Reservation = z.infer<typeof ReservationSchema>;
export type Booking = z.infer<typeof BookingSchema>;
export function formatMinute(minute: number) {
  return `${Math.floor(minute / 60)
    .toString()
    .padStart(2, "0")}:${(minute % 60).toString().padStart(2, "0")}`;
}
export function localDate(date = new Date()) {
  return new Date(date.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

/** Pricing behavior retained from the legacy booking service. Points come from signed Identity claims. */
export function discountedQuote(
  basePrice: number,
  courtCount: number,
  loyaltyPoints = 0,
) {
  const discountPercent =
    (loyaltyPoints >= 4000 ? 10 : loyaltyPoints >= 2000 ? 5 : 0) +
    (courtCount >= 2 ? 5 : 0);
  const totalPrice = Math.round((basePrice * (100 - discountPercent)) / 100);
  return {
    basePrice,
    discountPercent,
    discountAmount: basePrice - totalPrice,
    totalPrice,
  };
}
