import amqp, { type ChannelModel, type ConfirmChannel } from "amqplib";
import type { PrismaClient } from "../generated/client";

export interface EventPublisher {
  publish(event: {
    id: string;
    type: string;
    correlationId: string;
  }): Promise<void>;
  close(): Promise<void>;
}

export function rabbitPublisher(
  url: string,
  exchange = "badminton.events",
): EventPublisher {
  let connection: ChannelModel | undefined;
  let channel: ConfirmChannel | undefined;
  async function close() {
    const previousConnection = connection;
    connection = undefined;
    channel = undefined;
    await previousConnection?.close().catch(() => {});
  }
  return {
    async publish(event) {
      try {
        if (!channel) {
          connection = await amqp.connect(url, { timeout: 5000 });
          connection.on("error", () => {
            channel = undefined;
          });
          connection.on("close", () => {
            channel = undefined;
          });
          channel = await connection.createConfirmChannel();
          channel.on("error", () => {
            channel = undefined;
          });
          channel.on("close", () => {
            channel = undefined;
          });
          await channel.assertExchange(exchange, "topic", { durable: true });
        }
        const current = channel;
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(Error("RabbitMQ confirm timeout")),
            5000,
          );
          current.publish(
            exchange,
            event.type,
            Buffer.from(JSON.stringify(event)),
            {
              persistent: true,
              contentType: "application/json",
              messageId: event.id,
              correlationId: event.correlationId,
              type: event.type,
            },
            (error) => {
              clearTimeout(timeout);
              if (error) reject(error);
              else resolve();
            },
          );
        });
      } catch (error) {
        await close();
        throw error;
      }
    },
    close,
  };
}

export function startOutbox(prisma: PrismaClient, publisher: EventPublisher) {
  let stopping = false;
  let running: Promise<void> | undefined;
  async function drain() {
    // Holding this row lock through publisher confirmation prevents two replicas
    // from publishing simultaneously. A crash after confirm can redeliver the same ID.
    for (let index = 0; index < 50 && !stopping; index++) {
      const published = await prisma.$transaction(
        async (tx) => {
          const [row] = await tx.$queryRaw<{ id: string; event: unknown }[]>`
          SELECT o.id, o.event FROM "IdentityOutbox" o
          WHERE o."publishedAt" IS NULL AND NOT EXISTS (
            SELECT 1 FROM "IdentityOutbox" prior
            WHERE prior."userId" = o."userId" AND prior.version < o.version AND prior."publishedAt" IS NULL
          ) ORDER BY o."createdAt", o.id FOR UPDATE OF o SKIP LOCKED LIMIT 1
        `;
          if (!row) return false;
          await publisher.publish(
            row.event as { id: string; type: string; correlationId: string },
          );
          await tx.identityOutbox.update({
            where: { id: row.id },
            data: { publishedAt: new Date() },
          });
          return true;
        },
        { timeout: 20000 },
      );
      if (!published) break;
    }
  }
  function tick() {
    if (running || stopping) return;
    running = drain()
      .catch(() => {
        console.warn(JSON.stringify({ event: "identity_outbox_retry" }));
      })
      .finally(() => {
        running = undefined;
      });
  }
  const timer = setInterval(tick, 2000);
  timer.unref();
  tick();
  return async () => {
    stopping = true;
    clearInterval(timer);
    await running;
    await publisher.close();
  };
}
