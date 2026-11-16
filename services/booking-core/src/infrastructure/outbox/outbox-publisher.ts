import { Inject, Injectable } from "@nestjs/common";
import amqplib, { ChannelModel, ConfirmChannel } from "amqplib";
import { Telemetry } from "../../common/observability/telemetry";
import { PublishedOutboxEnvelope } from "./outbox.service";

export const OUTBOX_PUBLISHER = Symbol("OUTBOX_PUBLISHER");

export interface OutboxPublisher {
  publish(envelope: PublishedOutboxEnvelope, amqpCorrelationId?: string): Promise<void>;
  close?(): Promise<void>;
}

@Injectable()
export class AmqpOutboxPublisher implements OutboxPublisher {
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private exchangeAsserted = false;
  private connectPromise?: Promise<ConfirmChannel>;

  constructor(@Inject(Telemetry) private readonly telemetry: Telemetry) {}

  private exchangeName(): string {
    return process.env.RABBITMQ_EXCHANGE || "badminton.events";
  }

  private async getChannel(): Promise<ConfirmChannel> {
    if (this.channel) return this.channel;
    if (this.connectPromise) return this.connectPromise;

    const url = process.env.RABBITMQ_URL;
    if (!url) throw new Error("RABBITMQ_URL is not configured");

    this.connectPromise = (async () => {
      const connection = await amqplib.connect(url, { timeout: 5000 });
      connection.on("error", (err) => {
        this.telemetry.logger.warn({ err }, "outbox.rabbitmq.connection_error");
        this.resetConnection();
      });
      connection.on("close", () => {
        this.resetConnection();
      });

      const channel = await connection.createConfirmChannel();
      channel.on("error", (err) => {
        this.telemetry.logger.warn({ err }, "outbox.rabbitmq.channel_error");
        this.channel = undefined;
        this.exchangeAsserted = false;
      });
      channel.on("close", () => {
        this.channel = undefined;
        this.exchangeAsserted = false;
      });

      await channel.assertExchange(this.exchangeName(), "topic", { durable: true });
      this.connection = connection;
      this.channel = channel;
      this.exchangeAsserted = true;
      return channel;
    })().finally(() => {
      this.connectPromise = undefined;
    });

    return this.connectPromise;
  }

  private resetConnection() {
    this.channel = undefined;
    this.connection = undefined;
    this.exchangeAsserted = false;
  }

  async publish(envelope: PublishedOutboxEnvelope, amqpCorrelationId?: string): Promise<void> {
    const channel = await this.getChannel();
    if (!this.exchangeAsserted) {
      await channel.assertExchange(this.exchangeName(), "topic", { durable: true });
      this.exchangeAsserted = true;
    }

    const body = Buffer.from(JSON.stringify(envelope), "utf8");
    const published = channel.publish(this.exchangeName(), envelope.type, body, {
      persistent: true,
      contentType: "application/json",
      messageId: envelope.id,
      correlationId: envelope.correlationId ?? amqpCorrelationId ?? envelope.id,
      type: envelope.type,
      timestamp: Math.floor(Date.now() / 1000),
    });
    if (!published) {
      this.telemetry.logger.warn(
        { eventId: envelope.id, type: envelope.type },
        "outbox.rabbitmq.backpressure",
      );
    }
    await channel.waitForConfirms();
  }

  async close(): Promise<void> {
    const channel = this.channel;
    const connection = this.connection;
    this.resetConnection();
    if (channel) await channel.close().catch(() => {});
    if (connection) await connection.close().catch(() => {});
  }
}
