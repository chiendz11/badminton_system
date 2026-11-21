ALTER TABLE "OutboxEvent" ADD COLUMN "correlationId" TEXT;

CREATE TABLE "BookingReminder" (
  "bookingId" UUID NOT NULL,
  "reminderWindow" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingReminder_pkey" PRIMARY KEY ("bookingId", "reminderWindow"),
  CONSTRAINT "BookingReminder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
