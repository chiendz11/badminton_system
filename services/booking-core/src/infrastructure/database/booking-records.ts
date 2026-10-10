import { Prisma } from "../../../generated/client";
export type Tx = Prisma.TransactionClient;
export type FullBooking = Prisma.BookingGetPayload<{
  include: { reservation: { include: { center: true } } };
}>;
export type { QuoteSelection } from "../../common/domain/booking.types";
