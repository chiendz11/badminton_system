import { Router, type Request } from "express";
import { z } from "zod";
import type { GatewayConfig } from "../configs/environment";
import { authorize } from "../middleware/authorize.middleware";
import { GatewayError } from "../middleware/http-errors";

const uuid = z.string().uuid();
const message = z
  .object({
    text: z.string().trim().min(1).max(2000),
    client_message_id: z
      .string()
      .min(8)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/),
    action: z.enum(["select", "confirm", "retry"]).optional(),
    option_id: uuid.optional(),
    confirmation_id: uuid.optional(),
  })
  .strict();
export function aiRoutes(
  config: GatewayConfig,
  transport: typeof fetch = fetch,
) {
  const router = Router(),
    all = authorize(["user", "center_manager", "super_admin"]);
  async function call(req: Request, path: string, body?: unknown) {
    let response: Response;
    try {
      response = await transport(
        (config.aiUrl || "http://localhost:8000") + path,
        {
          method: req.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.authorization!,
            "X-Request-Id": req.requestId,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(config.aiTimeout || 45000),
          redirect: "error",
        },
      );
    } catch (error) {
      throw new GatewayError(
        error instanceof Error &&
          ["TimeoutError", "AbortError"].includes(error.name)
          ? 504
          : 502,
        "AI service chưa sẵn sàng; retry với cùng client_message_id",
      );
    }
    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new GatewayError(502, "AI service trả dữ liệu không hợp lệ");
    }
    if (!response.ok)
      throw new GatewayError(
        response.status,
        typeof data.detail === "string"
          ? data.detail
          : "AI service từ chối yêu cầu",
      );
    return { status: response.status, data };
  }
  router.post("/conversations", all, async (req, res) => {
    z.object({})
      .strict()
      .parse(req.body || {});
    const r = await call(req, "/api/conversations", {});
    res.status(r.status).json(r.data);
  });
  router.get("/conversations/:id", all, async (req, res) => {
    const r = await call(
      req,
      "/api/conversations/" + uuid.parse(req.params.id),
    );
    res.json(r.data);
  });
  router.post("/conversations/:id/messages", all, async (req, res) => {
    const r = await call(
      req,
      "/api/conversations/" + uuid.parse(req.params.id) + "/messages",
      message.parse(req.body),
    );
    res.status(r.status).json(r.data);
  });
  router.get("/conversations/:id/trace", all, async (req, res) => {
    const r = await call(
      req,
      "/api/conversations/" + uuid.parse(req.params.id) + "/trace",
    );
    res.json(r.data);
  });
  router.get("/ai/bookings/:id", all, async (req, res) => {
    const r = await call(req, "/api/bookings/" + uuid.parse(req.params.id));
    res.json(r.data);
  });
  return router;
}
