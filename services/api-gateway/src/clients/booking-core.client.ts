import type { Request } from "express";
import type { GatewayConfig } from "../configs/environment";
import { GatewayError } from "../middleware/http-errors";
export class BookingCoreClient {
  constructor(
    private readonly config: GatewayConfig,
    private readonly transport: typeof fetch = fetch,
  ) {}
  async call(
    req: Pick<Request, "headers" | "requestId">,
    path: string,
    method = "GET",
    body?: unknown,
    key?: string,
  ): Promise<any> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Request-Id": req.requestId,
    };
    if (req.headers.authorization)
      headers.Authorization = req.headers.authorization;
    if (key) headers["Idempotency-Key"] = key;
    let response: Response;
    try {
      response = await this.transport(this.config.coreUrl + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout),
        redirect: "error",
      });
    } catch (error) {
      throw new GatewayError(
        error instanceof Error &&
          ["TimeoutError", "AbortError"].includes(error.name)
          ? 504
          : 502,
        "Booking Core không sẵn sàng",
      );
    }
    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new GatewayError(502, "Booking Core trả dữ liệu không hợp lệ");
    }
    if (!response.ok)
      throw new GatewayError(
        response.status,
        Array.isArray(data.message)
          ? data.message.join("; ")
          : data.message || "Booking Core từ chối yêu cầu",
      );
    return data;
  }
}
