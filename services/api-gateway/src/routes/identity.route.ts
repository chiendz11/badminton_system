import { Router, type Request, type Response } from "express";
import type { GatewayConfig } from "../configs/environment";
import { GatewayError } from "../middleware/http-errors";

export function identityRoutes(
  config: GatewayConfig,
  transport: typeof fetch = fetch,
) {
  const router = Router();

  async function forward(
    req: Request,
    res: Response,
    path: string,
  ) {
    res.set("Cache-Control", "no-store");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    
    if (req.get("authorization")) {
      headers.Authorization = req.get("authorization")!;
    }

    if (req.requestId) {
      headers["X-Request-Id"] = req.requestId;
    }

    try {
      const response = await transport(
        `${config.identityUrl || "http://localhost:8084"}${path}`,
        {
          method: req.method,
          headers,
          body:
            req.method === "POST"
              ? JSON.stringify(req.body ?? {})
              : undefined,
          signal: AbortSignal.timeout(config.timeout),
          redirect: "error",
        },
      );

      let data: unknown;

      try {
        data = await response.json();
      } catch (error) {
        if (
          error instanceof Error &&
          ["TimeoutError", "AbortError"].includes(error.name)
        ) {
          throw error;
        }

        throw new GatewayError(
          502,
          "Identity trả dữ liệu không hợp lệ",
        );
      }

      const retryAfter = response.headers.get("retry-after");

      if (retryAfter) {
        res.set("Retry-After", retryAfter);
      }

      res.status(response.status).json(data);
    } catch (error) {
      if (error instanceof GatewayError) {
        throw error;
      }

      const timedOut =
        error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name);

      throw new GatewayError(
        timedOut ? 504 : 502,
        timedOut
          ? "Identity phản hồi quá thời gian cho phép"
          : "Không kết nối được Identity",
      );
    }
  }

  router.post("/login", (req, res) =>
    forward(req, res, "/api/auth/login"),
  );

  router.get("/me", (req, res) =>
    forward(req, res, "/api/auth/me"),
  );

  return router;
}