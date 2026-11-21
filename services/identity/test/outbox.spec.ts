import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/client";
import { startOutbox } from "../src/outbox";

afterEach(() => vi.useRealTimers());
describe("durable identity event relay", () => {
  it("keeps the event pending on failure and retries the same event ID before marking it published", async () => {
    vi.useFakeTimers();
    const event = {
      id: "event-1",
      type: "identity.user-updated.v1",
      correlationId: "trace-1",
    };
    let pending = true;
    const update = vi.fn(async () => {
      pending = false;
    });
    const tx = {
      $queryRaw: vi.fn(async () => (pending ? [{ id: event.id, event }] : [])),
      identityOutbox: { update },
    };
    const prisma = {
      $transaction: vi.fn(async (run) => run(tx)),
    } as unknown as PrismaClient;
    const publisher = {
      publish: vi
        .fn()
        .mockRejectedValueOnce(Error("broker unavailable"))
        .mockResolvedValue(undefined),
      close: vi.fn(async () => {}),
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const stop = startOutbox(prisma, publisher);
    try {
      await vi.advanceTimersByTimeAsync(0);
      expect(publisher.publish).toHaveBeenCalledExactlyOnceWith(event);
      expect(update).not.toHaveBeenCalled();
      expect(pending).toBe(true);
      await vi.advanceTimersByTimeAsync(2000);
      expect(publisher.publish).toHaveBeenNthCalledWith(2, event);
      expect(update).toHaveBeenCalledWith({
        where: { id: event.id },
        data: { publishedAt: expect.any(Date) },
      });
      expect(pending).toBe(false);
    } finally {
      await stop();
      warn.mockRestore();
    }
    expect(publisher.close).toHaveBeenCalledOnce();
  });
});
