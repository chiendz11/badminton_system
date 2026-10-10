import "reflect-metadata";
import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../../src/app";
const coreDir = path.resolve(process.cwd(), "../booking-core"),
  coreRequire = createRequire(coreDir + "/package.json");
const secret = "gateway-integration-private-key-at-least-32",
  centerId = "11111111-1111-4111-8111-111111111111",
  courtId = "22222222-2222-4222-8222-222222222221",
  otherCourt = "22222222-2222-4222-8222-222222222222";
let container: any, api: any, db: any, gateway: any, coreUrl: string;
const clock = new Date("2030-01-07T00:00:00Z");
const token = (subject = "customer", role = "user") =>
  jwt.sign({ role, name: subject }, secret, {
    subject,
    issuer: "badminton-identity",
    audience: "badminton-system",
    expiresIn: "1h",
  });
const auth = (subject = "customer", role = "user") => ({
  Authorization: "Bearer " + token(subject, role),
});
const book = (key = "gateway-request-1", subject = "customer") =>
  request(gateway)
    .post("/api/booking/pending/pendingBookingToDB")
    .set(auth(subject))
    .set("Idempotency-Key", key)
    .send({
      centerId,
      bookDate: "2030-01-08",
      userId: "victim",
      userName: "spoofed-name",
      price: 1,
      courtBookingDetails: [{ courtId, timeslots: [17] }],
    });
beforeAll(async () => {
  const oldDatabase = process.env.DATABASE_URL;
  if (
    oldDatabase &&
    !/^(ci|.+_test)$/.test(new URL(oldDatabase).pathname.slice(1))
  )
    throw Error("Refusing a non-test database");
  if (!oldDatabase) {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("gateway_test")
      .start();
    process.env.DATABASE_URL = container.getConnectionUri();
  }
  process.env.JWT_SECRET = secret;
  process.env.METRICS_TOKEN = "integration-monitor";
  process.env.ENABLE_DEMO_AUTH = "false";
  execFileSync(
    process.execPath,
    [coreRequire.resolve("prisma/build/index.js"), "migrate", "deploy"],
    { cwd: coreDir, env: process.env, stdio: "pipe" },
  );
  const { AppModule } = coreRequire(coreDir + "/dist/app.module.js"),
    { Clock, Telemetry } = coreRequire(
      coreDir + "/dist/common/observability/telemetry.js",
    ),
    { PrismaService } = coreRequire(
      coreDir + "/dist/infrastructure/database/prisma.service.js",
    ),
    { configureHttp } = coreRequire(coreDir + "/dist/bootstrap/http.js");
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue({ now: () => clock })
    .compile();
  api = module.createNestApplication({ logger: false });
  api.get(Telemetry).logger.level = "silent";
  configureHttp(api);
  await api.listen(0, "127.0.0.1");
  db = api.get(PrismaService);
  coreUrl = await api.getUrl();
  gateway = createApp({
    coreUrl,
    jwtSecret: secret,
    issuer: "badminton-identity",
    audience: "badminton-system",
    metricsToken: "gateway-monitor",
    origins: [],
    timeout: 5000,
  });
}, 60000);
afterAll(async () => {
  if (api) await api.close();
  if (container) {
    await container.stop();
    delete process.env.DATABASE_URL;
  }
});
beforeEach(async () => {
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
      name: "Trung tâm gốc",
      address: "18 Duy Tan",
      phone: "0901234567",
      managerId: "manager",
      facilities: [],
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
            pricePerHour: 100000,
          },
        ],
      },
      courts: {
        create: [
          { id: courtId, name: "Sân 1" },
          { id: otherCourt, name: "Sân 2" },
        ],
      },
    },
  });
});
describe("legacy gateway to real Booking Core / Postgres", () => {
  it("serves the original GraphQL catalogue and hourly availability without exposing unrelated APIs", async () => {
    const response = await request(gateway)
      .post("/graphql")
      .send({
        query:
          "{ centers { centerId name totalCourts pricing { weekday {startTime endTime price} } courts {courtId name} } }",
      })
      .expect(200);
    expect(response.body.data.centers[0]).toMatchObject({
      centerId,
      totalCourts: 2,
      pricing: {
        weekday: [{ startTime: "05:00", endTime: "24:00", price: 80000 }],
      },
    });
    const mapping = await request(gateway)
      .get(`/api/booking/pending/mapping?centerId=${centerId}&date=2030-01-08`)
      .expect(200);
    expect(mapping.body.mapping[courtId]).toHaveLength(19);
    expect(mapping.body.mapping[courtId][12]).toBe("trống");
  });
  it("confirms a daily booking, forwards the signed identity and quote, and replays without duplicates", async () => {
    const response = await book()
      .set("X-Request-Id", "gateway-core-correlation")
      .expect(200);
    expect(response.headers["x-request-id"]).toBe("gateway-core-correlation");
    expect(
      (
        await db.outboxEvent.findFirst({
          where: { type: "booking.confirmed.v1" },
        })
      ).payload.correlationId,
    ).toBe("gateway-core-correlation");
    const booking = response.body.booking;
    expect(booking).toMatchObject({
      bookingStatus: "confirmed",
      price: 80000,
      userId: "customer",
      userName: "customer",
    });
    const replay = await book().expect(200);
    expect(replay.body.booking._id).toBe(booking._id);
    expect(await db.booking.count()).toBe(1);
    expect(
      await db.outboxEvent.count({ where: { type: "booking.confirmed.v1" } }),
    ).toBe(1);
    await book("gateway-request-2", "other").expect(409);
    const mapping = await request(gateway).get(
      `/api/booking/pending/mapping?centerId=${centerId}&date=2030-01-08`,
    );
    expect(mapping.body.mapping[courtId][12].status).toBe("đã đặt");
  });
  it("serializes competing daily bookings and concurrent retries across reserve/confirm", async () => {
    const rivals = await Promise.all([
      book("gateway-race-a", "a"),
      book("gateway-race-b", "b"),
    ]);
    expect(rivals.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await db.booking.count()).toBe(1);
    const winner =
      rivals[0].status === 200
        ? ["gateway-race-a", "a"]
        : ["gateway-race-b", "b"];
    const retries = await Promise.all([
      book(winner[0], winner[1]),
      book(winner[0], winner[1]),
    ]);
    expect(retries.map((r) => r.status)).toEqual([200, 200]);
    expect(retries[0].body.booking._id).toBe(retries[1].body.booking._id);
    expect(
      await db.outboxEvent.count({ where: { type: "booking.confirmed.v1" } }),
    ).toBe(1);
  });
  it("creates centres with courts/pricing atomically and rejects nullable non-nullable Core fields", async () => {
    const response = await request(gateway)
      .post("/graphql")
      .set(auth("admin", "super_admin"))
      .send({
        query:
          'mutation { createCenter(name:"Trung tâm mới",address:"20 Duy Tan",phone:"0901234567",totalCourts:2,centerManagerId:"manager",pricing:{weekday:[{startTime:"05:00",endTime:"24:00",price:90000}],weekend:[{startTime:"05:00",endTime:"24:00",price:100000}]}){centerId totalCourts pricing{weekday{price}}} }',
      })
      .expect(200);
    expect(response.body.errors).toBeUndefined();
    const id = response.body.data.createCenter.centerId;
    expect(await db.court.count({ where: { centerId: id } })).toBe(2);
    expect(await db.pricingBand.count({ where: { centerId: id } })).toBe(2);
    const invalid = await fetch(coreUrl + "/api/v1/centers/" + id, {
      method: "PATCH",
      headers: {
        ...auth("admin", "super_admin"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ totalCourts: null, managerId: null }),
    });
    expect(invalid.status).toBe(400);
    expect(
      await db.court.count({ where: { centerId: id, isActive: true } }),
    ).toBe(2);
  });
  it("keeps history ownership, cancellation and audit-preserving deletion", async () => {
    const created = await book(),
      id = created.body.booking._id;
    await request(gateway)
      .get("/api/user/customer/booking-history")
      .set(auth("other"))
      .expect(403);
    const history = await request(gateway)
      .get("/api/user/customer/booking-history")
      .set(auth())
      .expect(200);
    expect(history.body.bookingHistory[0].court_time).toContain("17:00");
    await request(gateway)
      .delete("/api/booking/" + id)
      .set(auth())
      .expect(409);
    await request(gateway)
      .patch("/api/booking/" + id)
      .set(auth("other"))
      .send({ status: "cancelled" })
      .expect(403);
    await request(gateway)
      .patch("/api/booking/" + id)
      .set(auth())
      .send({ status: "cancelled" })
      .expect(200);
    await request(gateway)
      .delete("/api/booking/" + id)
      .set(auth())
      .expect(200);
    expect(
      (
        await request(gateway)
          .get("/api/user/customer/booking-history")
          .set(auth())
      ).body.total,
    ).toBe(0);
    expect(await db.booking.count()).toBe(1);
    const rows = await request(gateway)
      .get("/api/booking/bookings")
      .set(auth("manager", "center_manager"));
    expect(rows.body.data[0].bookingStatus).toBe("cancelled");
  });
  it("applies centre, court count and pricing updates atomically with manager boundaries", async () => {
    const query =
      "mutation($id:String!,$data:UpdateCenterInput!){ updateCenter(centerId:$id,data:$data){name totalCourts pricing{weekday{price}}} }";
    let response = await request(gateway)
      .post("/graphql")
      .set(auth("manager", "center_manager"))
      .send({
        query,
        variables: {
          id: centerId,
          data: { name: "Tên mới", centerManagerId: "intruder" },
        },
      });
    expect(response.body.errors[0].extensions.code).toBe(403);
    expect((await db.center.findUnique({ where: { id: centerId } })).name).toBe(
      "Trung tâm gốc",
    );
    response = await request(gateway)
      .post("/graphql")
      .set(auth("admin", "super_admin"))
      .send({
        query,
        variables: {
          id: centerId,
          data: {
            name: "Tên mới",
            totalCourts: 3,
            pricing: {
              weekday: [{ startTime: "05:00", endTime: "24:00", price: 90000 }],
              weekend: [
                { startTime: "05:00", endTime: "24:00", price: 110000 },
              ],
            },
          },
        },
      });
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.updateCenter).toMatchObject({
      name: "Tên mới",
      totalCourts: 3,
    });
    await book();
    response = await request(gateway)
      .post("/graphql")
      .set(auth("manager", "center_manager"))
      .send({
        query,
        variables: { id: centerId, data: { totalCourts: 0, name: "Sai" } },
      });
    expect(response.body.errors[0].extensions.code).toBe(409);
    expect((await db.center.findUnique({ where: { id: centerId } })).name).toBe(
      "Tên mới",
    );
  });
  it("creates different fixed selections per date in one atomic batch and rejects changed replay", async () => {
    const payload = {
      centerId,
      userId: "customer",
      userName: "Khách",
      bookings: [
        { date: "2030-01-08", courtId, timeslots: [17] },
        { date: "2030-01-09", courtId: otherCourt, timeslots: [18] },
      ],
    };
    const create = () =>
      request(gateway)
        .post("/api/booking/create-fixed-bookings")
        .set(auth("manager", "center_manager"))
        .set("Idempotency-Key", "fixed-request-1");
    const response = await create().send(payload).expect(200);
    expect(response.body).toHaveLength(2);
    expect(
      response.body.map((b: any) => b.courtBookingDetails[0].timeslots),
    ).toEqual([[17], [18]]);
    await create().send(payload).expect(200);
    expect(await db.booking.count()).toBe(2);
    await create()
      .send({
        ...payload,
        bookings: [
          payload.bookings[0],
          { ...payload.bookings[1], timeslots: [19] },
        ],
      })
      .expect(409);
  });
  it("rolls back a fixed batch conflict and checks availability over every occurrence", async () => {
    await book();
    const payload = {
      centerId,
      userId: "customer",
      userName: "Khách",
      bookings: [
        { date: "2030-01-08", courtId, timeslots: [17] },
        { date: "2030-01-09", courtId: otherCourt, timeslots: [18] },
      ],
    };
    await request(gateway)
      .post("/api/booking/create-fixed-bookings")
      .set(auth("manager", "center_manager"))
      .send(payload)
      .expect(409);
    expect(await db.booking.count()).toBe(1);
    expect(await db.bookingSeries.count()).toBe(0);
    const preview = await request(gateway)
      .post("/api/booking/check-available-courts")
      .set(auth("manager", "center_manager"))
      .send({
        centerId,
        startDate: "2030-01-08",
        daysOfWeek: [2],
        timeslots: ["17:00"],
      })
      .expect(200);
    expect(preview.body[2].map((c: any) => c.courtId)).toEqual([otherCourt]);
  });
  it("forbids cross-centre manager access and keeps customer statistics on the Core read model", async () => {
    await book();
    await request(gateway)
      .get("/api/booking/bookings?centerId=" + centerId)
      .set(auth("stranger", "center_manager"))
      .expect(403);
    await request(gateway).get("/api/booking/bookings").set(auth()).expect(403);
    const stats = await request(gateway)
      .get("/api/user/me/statistics?period=month")
      .set(auth())
      .expect(200);
    expect(stats.body.confirmed).toBe(1);
    expect(stats.body.overview).toHaveProperty("completedBookings");
  });
});
