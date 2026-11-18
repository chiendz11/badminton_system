import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020";
import formats from "ajv-formats";
import { readFileSync } from "node:fs";
import path from "node:path";
import { InternalTokenGuard } from "../../src/common/auth/internal-token.guard";
import { Telemetry } from "../../src/common/observability/telemetry";
import { OutboxRelayWorker } from "../../src/infrastructure/outbox/outbox-relay.worker";
import { buildOutboxEnvelope } from "../../src/infrastructure/outbox/outbox.service";
import { IdentityClientService } from "../../src/modules/internal/identity-client.service";

const domainEventSchema = JSON.parse(
  readFileSync(
    path.resolve("../../contracts/events/domain-event.schema.json"),
    "utf8",
  ),
);
const bookingEventSchema = JSON.parse(
  readFileSync(
    path.resolve("../../contracts/events/booking-event.schema.json"),
    "utf8",
  ),
);

const ajv = new Ajv({ allErrors: true });
formats(ajv);
const ajv2020 = new Ajv2020({ allErrors: true });
formats(ajv2020);
const validateDomainEvent = ajv2020.compile(domainEventSchema);
const validateBookingEvent = ajv.compile(bookingEventSchema);

describe("Outbox envelope formatting", () => {
  test("formats baseline booking.confirmed.v1 event for booking-event schema", () => {
    const envelope = buildOutboxEnvelope({
      id: "11111111-1111-4111-8111-111111111111",
      type: "booking.confirmed.v1",
      aggregateId: "22222222-2222-4222-8222-222222222222",
      createdAt: new Date("2030-01-01T00:00:00.000Z"),
      correlationId: "req-123",
      payload: {
        bookingId: "22222222-2222-4222-8222-222222222222",
        reservationId: "33333333-3333-4333-8333-333333333333",
        centerId: "44444444-4444-4444-8444-444444444444",
        userId: "user-1",
        date: "2030-01-02",
        totalPrice: 100000,
        selections: [
          {
            courtId: "55555555-5555-4555-8555-555555555555",
            courtName: "Sân 1",
            slots: [600],
            price: 100000,
          },
        ],
      },
    });
    expect(validateBookingEvent(envelope)).toBe(true);
  });

  test("formats v1 domain events to strictly match domain-event.schema.json", () => {
    const samples = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        type: "booking.center-assigned.v1",
        aggregateId: "44444444-4444-4444-8444-444444444444",
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
        correlationId: "req-center",
        payload: {
          centerId: "44444444-4444-4444-8444-444444444444",
          centerName: "Sân Cầu Lông A",
          managerId: "manager-1",
          isActive: false,
        },
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        type: "booking.series-confirmed.v1",
        aggregateId: "55555555-5555-4555-8555-555555555555",
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
        correlationId: null,
        payload: {
          seriesId: "55555555-5555-4555-8555-555555555555",
          centerId: "44444444-4444-4444-8444-444444444444",
          recipientUserId: "user-1",
          totalOccurrences: 4,
          startDate: "2030-01-08",
          endDate: "2030-01-15",
        },
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        type: "booking.reminder.v1",
        aggregateId: "66666666-6666-4666-8666-666666666666",
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
        correlationId: "req-rem",
        payload: {
          bookingId: "66666666-6666-4666-8666-666666666666",
          centerId: "44444444-4444-4444-8444-444444444444",
          userId: "user-1",
          date: "2030-01-08",
          startMinute: 600,
          reminderWindow: "T-24h",
        },
      },
    ];

    for (const row of samples) {
      const envelope = buildOutboxEnvelope(row);
      expect(validateDomainEvent(envelope)).toBe(true);
    }
  });
});

describe("OutboxRelayWorker", () => {
  test("marks published rows and increments attempts on failure without stopping batch", async () => {
    const rows = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        type: "booking.center-assigned.v1",
        aggregateId: "44444444-4444-4444-8444-444444444444",
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
        correlationId: "corr-1",
        attempts: 0,
        publishedAt: null,
        payload: {
          centerId: "44444444-4444-4444-8444-444444444444",
          centerName: "Sân A",
          managerId: "m1",
          isActive: false,
        },
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        type: "booking.reminder.v1",
        aggregateId: "66666666-6666-4666-8666-666666666666",
        createdAt: new Date("2030-01-01T00:01:00.000Z"),
        correlationId: "corr-2",
        attempts: 0,
        publishedAt: null,
        payload: {
          bookingId: "66666666-6666-4666-8666-666666666666",
          centerId: "44444444-4444-4444-8444-444444444444",
          userId: "u1",
          date: "2030-01-02",
          startMinute: 600,
          reminderWindow: "T-2h",
        },
      },
    ];
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      outboxEvent: {
        findMany: jest.fn().mockResolvedValue(rows),
        updateMany,
        update,
      },
    } as any;

    const publish = jest
      .fn()
      .mockRejectedValueOnce(new Error("broker down"))
      .mockResolvedValueOnce(undefined);
    const telemetry = new Telemetry();
    telemetry.logger.level = "silent";

    const fixedNow = new Date("2030-01-01T00:02:00.000Z");
    const worker = new OutboxRelayWorker(
      prisma,
      { publish },
      { now: () => fixedNow },
      telemetry,
    );

    const published = await worker.flushPending();
    expect(published).toBe(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: rows[0].id },
      data: { attempts: { increment: 1 } },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: rows[1].id, publishedAt: null },
      data: { publishedAt: fixedNow },
    });
  });
});

describe("InternalTokenGuard & IdentityClientService", () => {
  const prevToken = process.env.INTERNAL_SERVICE_TOKEN;
  const prevIdentityUrl = process.env.IDENTITY_INTERNAL_URL;
  const prevFetch = global.fetch;

  afterEach(() => {
    if (prevToken === undefined) delete process.env.INTERNAL_SERVICE_TOKEN;
    else process.env.INTERNAL_SERVICE_TOKEN = prevToken;
    if (prevIdentityUrl === undefined) delete process.env.IDENTITY_INTERNAL_URL;
    else process.env.IDENTITY_INTERNAL_URL = prevIdentityUrl;
    global.fetch = prevFetch;
  });

  function mockContext(headers: Record<string, string>) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) => headers[name.toLowerCase()],
        }),
      }),
    } as any;
  }

  test("rejects requests when INTERNAL_SERVICE_TOKEN is unset or mismatched", () => {
    const guard = new InternalTokenGuard();
    delete process.env.INTERNAL_SERVICE_TOKEN;
    expect(() =>
      guard.canActivate(mockContext({ "x-internal-token": "abc" })),
    ).toThrow(UnauthorizedException);

    process.env.INTERNAL_SERVICE_TOKEN = "super-secret-internal-token";
    expect(() =>
      guard.canActivate(mockContext({ "x-internal-token": "wrong" })),
    ).toThrow(UnauthorizedException);
    expect(
      guard.canActivate(
        mockContext({ "x-internal-token": "super-secret-internal-token" }),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        mockContext({ authorization: "Bearer super-secret-internal-token" }),
      ),
    ).toBe(true);
  });

  test("IdentityClientService verifies manager role when IDENTITY_INTERNAL_URL is set", async () => {
    const telemetry = new Telemetry();
    telemetry.logger.level = "silent";
    const client = new IdentityClientService(telemetry);

    delete process.env.IDENTITY_INTERNAL_URL;
    await expect(client.assertManageableUser("m1")).resolves.toBeUndefined();

    process.env.IDENTITY_INTERNAL_URL = "http://identity:8084";
    process.env.INTERNAL_SERVICE_TOKEN = "internal-tok";

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ role: "center_manager", isActive: true }),
    }) as any;
    await expect(client.assertManageableUser("m1")).resolves.toBeUndefined();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ role: "user", isActive: true }),
    }) as any;
    await expect(client.assertManageableUser("u1")).rejects.toThrow(
      BadRequestException,
    );

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as any;
    await expect(client.assertManageableUser("missing")).rejects.toThrow(
      BadRequestException,
    );

    global.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED")) as any;
    await expect(client.assertManageableUser("m1")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
