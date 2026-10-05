import { ReservationExpiryWorker } from "../../src/modules/reservations/reservation-expiry.worker";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import jwt from "jsonwebtoken";
import { execFileSync } from "node:child_process";
import "reflect-metadata";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { configureHttp } from "../../src/bootstrap/http";
import { Clock, Telemetry } from "../../src/common/observability/telemetry";
import { PrismaService } from "../../src/infrastructure/database/prisma.service";
const centerId = "11111111-1111-4111-8111-111111111111",
  courtId = "22222222-2222-4222-8222-222222222221";
const secret = "integration-test-secret-at-least-32-characters";
let app: INestApplication,
  db: PrismaService,
  container: StartedPostgreSqlContainer | undefined;
let now = new Date("2030-01-07T10:00:00Z");
function token(userId = "customer", role = "user") {
  return jwt.sign({ role, name: userId }, secret, {
    subject: userId,
    issuer: "badminton-identity",
    audience: "badminton-system",
    expiresIn: "1h",
  });
}
function hold(
  key = "request-key-0001",
  user = "customer",
  date = "2030-01-08",
  slots = [600],
) {
  return request(app.getHttpServer())
    .post("/api/v1/reservations")
    .set("Authorization", `Bearer ${token(user)}`)
    .set("Idempotency-Key", key)
    .send({ centerId, date, selections: [{ courtId, slots }] });
}
async function confirm(id: string, user = "customer") {
  return request(app.getHttpServer())
    .post(`/api/v1/reservations/${id}/confirm`)
    .set("Authorization", `Bearer ${token(user)}`);
}
beforeAll(async () => {
  process.env.JWT_SECRET = secret;
  process.env.RESERVATION_TTL_SECONDS = "60";
  process.env.METRICS_TOKEN = "integration-metrics";
  if (process.env.DATABASE_URL) {
    const database = new URL(process.env.DATABASE_URL).pathname.slice(1);
    if (database !== "ci" && !database.endsWith("_test"))
      throw new Error(
        "Refusing destructive integration tests against a non-test database",
      );
  } else {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("booking_test")
      .start();
    process.env.DATABASE_URL = container.getConnectionUri();
  }
  execFileSync(
    process.execPath,
    [require.resolve("prisma/build/index.js"), "migrate", "deploy"],
    { env: process.env, stdio: "pipe" },
  );
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue({ now: () => now })
    .compile();
  app = module.createNestApplication({ logger: false });
  app.get(Telemetry).logger.level = "silent";
  configureHttp(app);
  await app.init();
  db = app.get(PrismaService);
});
afterAll(async () => {
  if (app) await app.close();
  if (container) await container.stop();
  delete process.env.DATABASE_URL;
});
beforeEach(async () => {
  now = new Date("2030-01-07T10:00:00Z");
  await db.$transaction([
    db.outboxEvent.deleteMany(),
    db.booking.deleteMany(),
    db.slotAllocation.deleteMany(),
    db.reservation.deleteMany(),
    db.bookingSeries.deleteMany(),
    db.pricingBand.deleteMany(),
    db.court.deleteMany(),
    db.center.deleteMany(),
  ]);
  await db.center.create({
    data: {
      id: centerId,
      name: "Test Center",
      address: "18 Duy Tan",
      phone: "0901234567",
      managerId: "manager",
      facilities: ["Parking"],
      pricing: {
        create: [
          {
            dayType: "WEEKDAY",
            startMinute: 300,
            endMinute: 1440,
            pricePerHour: 80000,
          },
          {
            dayType: "WEEKEND",
            startMinute: 300,
            endMinute: 1440,
            pricePerHour: 130000,
          },
        ],
      },
      courts: { create: { id: courtId, name: "Court 1" } },
    },
  });
});
test("holds, confirms without payment, returns history, cancels and releases the slot", async () => {
  const held = await hold().expect(201);
  expect(held.body.totalPrice).toBe(80000);
  const booking = await confirm(held.body.id);
  expect(booking.status).toBe(200);
  expect(booking.body.status).toBe("CONFIRMED");
  const history = await request(app.getHttpServer())
    .get("/api/v1/bookings/me")
    .set("Authorization", `Bearer ${token()}`)
    .expect(200);
  expect(history.body.total).toBe(1);
  expect(
    await db.outboxEvent.count({ where: { type: "booking.confirmed.v1" } }),
  ).toBe(1);
  await request(app.getHttpServer())
    .post(`/api/v1/bookings/${booking.body.id}/cancel`)
    .set("Authorization", `Bearer ${token()}`)
    .expect(200);
  expect(await db.slotAllocation.count()).toBe(0);
  expect(
    await db.outboxEvent.count({ where: { type: "booking.cancelled.v1" } }),
  ).toBe(1);
  await hold("request-key-new1", "other").expect(201);
});
test("concurrent requests cannot double-book a court", async () => {
  const outcomes = await Promise.all([
    hold("request-race-one", "customer"),
    hold("request-race-two", "other"),
  ]);
  expect(outcomes.map((r) => r.status).sort()).toEqual([201, 409]);
  expect(await db.reservation.count()).toBe(1);
  expect(await db.slotAllocation.count()).toBe(1);
});
test("idempotency replays the same hold/confirmation and rejects changed content", async () => {
  const first = await hold().expect(201),
    second = await hold().expect(201);
  expect(second.body.id).toBe(first.body.id);
  await hold("request-key-0001", "customer", "2030-01-08", [660]).expect(409);
  const one = await confirm(first.body.id),
    two = await confirm(first.body.id);
  expect(two.body.id).toBe(one.body.id);
  expect(await db.booking.count()).toBe(1);
  expect(await db.outboxEvent.count()).toBe(1);
});
test("expired confirmation commits cleanup instead of rolling it back", async () => {
  const held = await hold().expect(201);
  now = new Date(now.getTime() + 61000);
  await request(app.getHttpServer())
    .post(`/api/v1/reservations/${held.body.id}/confirm`)
    .set("Authorization", `Bearer ${token()}`)
    .expect(410);
  expect(
    (await db.reservation.findUniqueOrThrow({ where: { id: held.body.id } }))
      .status,
  ).toBe("EXPIRED");
  expect(await db.slotAllocation.count()).toBe(0);
  await hold("request-after-exp", "other").expect(201);
});
test("the quote is a price snapshot even if manager updates pricing", async () => {
  const held = await hold().expect(201);
  await request(app.getHttpServer())
    .put(`/api/v1/centers/${centerId}/pricing`)
    .set("Authorization", `Bearer ${token("manager", "center_manager")}`)
    .send({
      bands: [
        {
          dayType: "WEEKDAY",
          startMinute: 300,
          endMinute: 1440,
          pricePerHour: 150000,
        },
        {
          dayType: "WEEKEND",
          startMinute: 300,
          endMinute: 1440,
          pricePerHour: 180000,
        },
      ],
    })
    .expect(200);
  const booking = await confirm(held.body.id);
  expect(booking.body.totalPrice).toBe(80000);
});
test("rejects forged identity, malformed input, foreign courts and unauthorized management", async () => {
  await request(app.getHttpServer())
    .post("/api/v1/reservations")
    .set("x-user-id", "customer")
    .send({})
    .expect(401);
  await request(app.getHttpServer())
    .post("/api/v1/reservations")
    .set("Authorization", `Bearer ${token()}`)
    .set("Idempotency-Key", "request-bad-input")
    .send({
      centerId,
      date: "2030-02-30",
      selections: [{ courtId, slots: [600] }],
      totalPrice: 1,
    })
    .expect(400);
  await hold("request-bad-date", "customer", "2030-02-30").expect(400);
  await request(app.getHttpServer())
    .patch(`/api/v1/centers/${centerId}`)
    .set(
      "Authorization",
      `Bearer ${token("foreign-manager", "center_manager")}`,
    )
    .send({ name: "Hijacked Center" })
    .expect(403);
  const held = await hold().expect(201);
  await request(app.getHttpServer())
    .post(`/api/v1/reservations/${held.body.id}/confirm`)
    .set("Authorization", `Bearer ${token("other")}`)
    .expect(404);
  await request(app.getHttpServer())
    .get("/api/v1/centers?managed=true")
    .set("Authorization", `Bearer ${token()}`)
    .expect(403);
});
test("manager fixed bookings roll back the whole batch when any date conflicts", async () => {
  const held = await hold("request-existing-day", "other", "2030-01-10").expect(
    201,
  );
  await confirm(held.body.id, "other");
  await request(app.getHttpServer())
    .post("/api/v1/bookings/fixed")
    .set("Authorization", `Bearer ${token("manager", "center_manager")}`)
    .set("Idempotency-Key", "request-fixed-batch")
    .send({
      centerId,
      userId: "fixed-customer",
      userName: "Customer",
      startDate: "2030-01-08",
      endDate: "2030-01-10",
      weekdays: [2, 3, 4],
      selections: [{ courtId, slots: [600] }],
    })
    .expect(409);
  expect(await db.booking.count()).toBe(1);
  expect(await db.bookingSeries.count()).toBe(0);
  expect(await db.outboxEvent.count()).toBe(1);
});
test("fixed booking creation is idempotent and authorization stays scoped to the center", async () => {
  const payload = {
    centerId,
    userId: "fixed-customer",
    userName: "Customer",
    startDate: "2030-01-08",
    endDate: "2030-01-10",
    weekdays: [2, 4],
    selections: [{ courtId, slots: [660] }],
  };
  const send = () =>
    request(app.getHttpServer())
      .post("/api/v1/bookings/fixed")
      .set("Authorization", `Bearer ${token("manager", "center_manager")}`)
      .set("Idempotency-Key", "request-fixed-valid")
      .send(payload);
  const one = await send().expect(201),
    two = await send().expect(201);
  expect(one.body.total).toBe(2);
  expect(two.body.items.map((b: any) => b.id)).toEqual(
    one.body.items.map((b: any) => b.id),
  );
  expect(await db.outboxEvent.count()).toBe(2);
});
test("disabling an occupied court is rejected; cancellation is idempotent", async () => {
  const held = await hold().expect(201),
    booking = await confirm(held.body.id);
  await request(app.getHttpServer())
    .patch(`/api/v1/centers/${centerId}/courts/${courtId}`)
    .set("Authorization", `Bearer ${token("manager", "center_manager")}`)
    .send({ isActive: false })
    .expect(409);
  for (let i = 0; i < 2; i++)
    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.body.id}/cancel`)
      .set("Authorization", `Bearer ${token()}`)
      .expect(200);
  expect(
    await db.outboxEvent.count({ where: { type: "booking.cancelled.v1" } }),
  ).toBe(1);
});
test("PostgreSQL constraint rejects overlapping allocations independently of application checks", async () => {
  const held = await hold().expect(201);
  const allocation = await db.slotAllocation.findFirstOrThrow();
  await expect(
    db.slotAllocation.create({
      data: {
        courtId,
        reservationId: held.body.id,
        startsAt: new Date(allocation.startsAt.getTime() + 1800000),
        endsAt: new Date(allocation.endsAt.getTime() + 1800000),
      },
    }),
  ).rejects.toThrow();
});
test("readiness and protected Prometheus metrics expose bounded route labels and request IDs", async () => {
  await request(app.getHttpServer()).get("/health/live").expect(200);
  await request(app.getHttpServer()).get("/health/ready").expect(200);
  const response = await request(app.getHttpServer())
    .get(`/api/v1/centers/${centerId}`)
    .set("X-Request-Id", "trace-test-123")
    .expect(200);
  expect(response.headers["x-request-id"]).toBe("trace-test-123");
  await request(app.getHttpServer()).get("/metrics").expect(401);
  const metrics = await request(app.getHttpServer())
    .get("/metrics")
    .set("Authorization", "Bearer integration-metrics")
    .expect(200);
  expect(metrics.text).toContain("booking_core_http_duration_seconds");
  expect(metrics.text).toContain("/api/v1/centers/:id");
  expect(metrics.text).not.toContain(centerId);
});
test("per-user hold limit prevents hoarding and releasing a hold restores capacity", async () => {
  for (let n = 0; n < 5; n++)
    await hold("hold-cap-key-" + n, "customer", "2030-01-08", [
      600 + n * 60,
    ]).expect(201);
  await hold("hold-cap-sixth", "customer", "2030-01-08", [960]).expect(409);
  const first = await db.reservation.findFirstOrThrow({
    where: { userId: "customer", status: "HELD" },
  });
  await request(app.getHttpServer())
    .delete(`/api/v1/reservations/${first.id}`)
    .set("Authorization", `Bearer ${token()}`)
    .expect(200);
  await hold("hold-cap-after-release", "customer", "2030-01-08", [960]).expect(
    201,
  );
});
test("catalog CRUD validates prices and scopes every court mutation to its center", async () => {
  const admin = `Bearer ${token("admin", "super_admin")}`,
    manager = `Bearer ${token("manager", "center_manager")}`;
  const created = await request(app.getHttpServer())
    .post("/api/v1/centers")
    .set("Authorization", admin)
    .send({
      name: "New Center",
      address: "20 Duy Tan",
      phone: "0901234567",
      managerId: "manager",
      pricePerHour: 90000,
    })
    .expect(201);
  const court = await request(app.getHttpServer())
    .post(`/api/v1/centers/${created.body.id}/courts`)
    .set("Authorization", manager)
    .send({ name: "Court New", surface: "gỗ" })
    .expect(201);
  await request(app.getHttpServer())
    .post("/api/v1/reservations")
    .set("Authorization", `Bearer ${token()}`)
    .set("Idempotency-Key", "foreign-court-request")
    .send({
      centerId,
      date: "2030-01-08",
      selections: [{ courtId: court.body.id, slots: [600] }],
    })
    .expect(400);
  await request(app.getHttpServer())
    .patch(`/api/v1/centers/${centerId}/courts/${court.body.id}`)
    .set("Authorization", manager)
    .send({ name: "Wrong center" })
    .expect(404);
  await request(app.getHttpServer())
    .put(`/api/v1/centers/${created.body.id}/pricing`)
    .set("Authorization", manager)
    .send({
      bands: [
        {
          dayType: "WEEKDAY",
          startMinute: 300,
          endMinute: 600,
          pricePerHour: 90000,
        },
        {
          dayType: "WEEKEND",
          startMinute: 300,
          endMinute: 1440,
          pricePerHour: 90000,
        },
      ],
    })
    .expect(400);
});
test("HTTP responses match published consumer schemas and booking events retain correlation", async () => {
  const { default: Ajv } = await import("ajv");
  const { default: formats } = await import("ajv-formats");
  const { readFileSync } = await import("node:fs");
  const ajv = new Ajv();
  formats(ajv);
  const held = await hold("schema-request-key").expect(201),
    booking = await confirm(held.body.id);
  for (const [name, body] of [
    ["reservation-response", held.body],
    ["booking-response", booking.body],
  ] as const) {
    const validate = ajv.compile(
      JSON.parse(
        readFileSync(`../../contracts/booking/${name}.schema.json`, "utf8"),
      ),
    );
    expect(validate(body)).toBe(true);
  }
  const event = await db.outboxEvent.findFirstOrThrow();
  const validate = ajv.compile(
    JSON.parse(
      readFileSync("../../contracts/events/booking-event.schema.json", "utf8"),
    ),
  );
  expect(validate(JSON.parse(JSON.stringify(event)))).toBe(true);
});
test("fixed availability includes later collisions instead of only looking at the first date", async () => {
  const existing = await hold("preview-existing", "other", "2030-01-10").expect(
    201,
  );
  await confirm(existing.body.id, "other");
  const preview = await request(app.getHttpServer())
    .post("/api/v1/availability/fixed")
    .set("Authorization", `Bearer ${token("manager", "center_manager")}`)
    .send({
      centerId,
      startDate: "2030-01-08",
      endDate: "2030-01-10",
      weekdays: [2, 4],
    })
    .expect(200);
  expect(preview.body.dates).toEqual(["2030-01-08", "2030-01-10"]);
  expect(
    preview.body.courts[0].slots.find((slot: any) => slot.minute === 600)
      .available,
  ).toBe(false);
  expect(
    preview.body.courts[0].slots.find((slot: any) => slot.minute === 660).price,
  ).toBe(160000);
});
test("holding a slot close to its start cannot extend beyond that start time", async () => {
  now = new Date("2030-01-07T09:59:30Z");
  const held = await hold(
    "near-start-request",
    "customer",
    "2030-01-07",
    [1020],
  ).expect(201);
  expect(held.body.expiresAt).toBe("2030-01-07T10:00:00.000Z");
  now = new Date("2030-01-07T10:00:01Z");
  await request(app.getHttpServer())
    .post(`/api/v1/reservations/${held.body.id}/confirm`)
    .set("Authorization", `Bearer ${token()}`)
    .expect(410);
  expect(await db.slotAllocation.count()).toBe(0);
});
test("loyalty discounts come from signed claims and combined court reservations keep a consistent snapshot", async () => {
  const second = await db.court.create({ data: { centerId, name: "Court 2" } });
  const signed = jwt.sign(
    { role: "user", name: "Loyal customer", loyaltyPoints: 4000 },
    secret,
    {
      subject: "loyal",
      issuer: "badminton-identity",
      audience: "badminton-system",
    },
  );
  const response = await request(app.getHttpServer())
    .post("/api/v1/reservations")
    .set("Authorization", `Bearer ${signed}`)
    .set("Idempotency-Key", "loyalty-snapshot-key")
    .send({
      centerId,
      date: "2030-01-08",
      selections: [
        { courtId, slots: [600] },
        { courtId: second.id, slots: [600] },
      ],
    })
    .expect(201);
  expect(response.body.basePrice).toBe(160000);
  expect(response.body.totalPrice).toBe(136000);
  expect(response.body.discountAmount).toBe(24000);
});
test("pass and payment endpoints are outside this service", async () => {
  await request(app.getHttpServer()).post("/api/v1/payments").expect(404);
  await request(app.getHttpServer()).get("/api/v1/passes").expect(404);
  await request(app.getHttpServer())
    .post("/api/v1/dev/session")
    .send({ profile: "admin" })
    .expect(404);
});

test("the extracted expiry worker releases leases once when two workers race", async () => {
  const held = await hold("worker-expiry-key").expect(201);
  const worker = app.get(ReservationExpiryWorker),
    metrics = app.get(Telemetry).metrics;
  const expiredCount = async () =>
    (await metrics.transitions.get()).values
      .filter((value) => value.labels.action === "expired")
      .reduce((sum, value) => sum + value.value, 0);
  const before = await expiredCount();
  now = new Date(now.getTime() + 61000);
  await Promise.all([worker.expire(), worker.expire()]);
  expect(
    (await db.reservation.findUniqueOrThrow({ where: { id: held.body.id } }))
      .status,
  ).toBe("EXPIRED");
  expect(await db.slotAllocation.count()).toBe(0);
  expect(await expiredCount()).toBe(before + 1);
  await hold("after-worker-expiry", "another-customer").expect(201);
});
