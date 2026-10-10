import { FullBooking } from "../../infrastructure/database/booking-records";
export function bookingView(booking: FullBooking) {
  const res = booking.reservation;
  return {
    id: booking.id,
    reservationId: res.id,
    centerId: res.centerId,
    centerName: res.center.name,
    userId: res.userId,
    userName: res.userName,
    date: res.date,
    status: booking.status,
    type: booking.type,
    totalPrice: res.totalPrice,
    basePrice: res.basePrice,
    discountAmount: res.discountAmount,
    discountPercent: res.discountPercent,
    createdAt: booking.createdAt,
    selections: res.selections,
  };
}
