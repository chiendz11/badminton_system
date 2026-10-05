// Route paths and role boundaries retained from BM/api_gateway/src/routes/booking.route.js; payment/pass routes removed.
import { Router } from "express";
import type { Request } from "express";
import { authorize } from "../middleware/authorize.middleware";
import { GatewayError } from "../middleware/http-errors";
import { BookingAdapter } from "../modules/booking/booking-adapter";
export function bookingRoutes(adapter: BookingAdapter) {
  const router = Router(),
    all = authorize(["user", "center_manager", "super_admin"]),
    manage = authorize(["center_manager", "super_admin"]);
  const json =
    (work: (req: Request) => Promise<unknown>) => async (req: any, res: any) =>
      res.json(await work(req));
  router.get(
    "/booking/pending/mapping",
    json((req) => adapter.mapping(req)),
  );
  router.get(
    "/booking/bookings",
    manage,
    json((req) => adapter.list(req, true)),
  );
  router.post(
    "/booking/check-available-courts",
    manage,
    json((req) => adapter.available(req)),
  );
  router.post(
    "/booking/create-fixed-bookings",
    manage,
    json((req) => adapter.fixed(req)),
  );
  router.post(
    "/booking/pending/pendingBookingToDB",
    all,
    json((req) => adapter.book(req)),
  );
  router.patch(
    "/booking/:bookingId",
    all,
    json((req) => adapter.cancel(req)),
  );
  router.delete(
    "/booking/:bookingId",
    all,
    json((req) => adapter.remove(req)),
  );
  router.get(
    "/booking/:id/status",
    all,
    json((req) => adapter.status(req)),
  );
  router.get(
    "/user/me/statistics",
    all,
    json((req) => adapter.stats(req)),
  );
  router.get(
    "/user/me/exists-pending-booking",
    all,
    json((req) => adapter.pending(req)),
  );
  router.get(
    "/user/:userId/booking-history",
    all,
    json((req) => {
      if (req.params.userId !== req.actor!.userId)
        throw new GatewayError(403, "Chỉ được xem lịch sử của mình");
      return adapter.list(req, false);
    }),
  );
  return router;
}
