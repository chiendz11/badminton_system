import { Router, type Request, type Response } from "express";
import type { GatewayConfig } from "../configs/environment";
import { GatewayError } from "../middleware/http-errors";

const refreshCookiePrefix = "refresh_token=";

function forwardRefreshCookie(res: Response, headers: Headers) {
  const cookie = headers.getSetCookie().find((value) => value.startsWith(refreshCookiePrefix));
  if (cookie) res.append("Set-Cookie", cookie);
}

export function identityRoutes(
  config: GatewayConfig,
  transport: typeof fetch = fetch,
) {
  const router = Router();

  async function forward(
    req: Request,
    res: Response,
    path: string,
    timeoutMs = config.timeout,
  ) {
    res.set("Cache-Control", "no-store");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    
    if (path === "/api/auth/refresh" || path === "/api/auth/logout") {
      // Preserve duplicates so Identity can reject ambiguous refresh cookies.
      const cookie = req.get("cookie")?.split(";")
        .map((value) => value.trim())
        .filter((value) => value.startsWith(refreshCookiePrefix))
        .join("; ");
      if (cookie) headers.Cookie = cookie;
    } else {
      const authorization = req.get("authorization");
      if (authorization) headers.Authorization = authorization;
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
          signal: AbortSignal.timeout(timeoutMs),
          redirect: "error",
        },
      );

      if (response.status === 204) {
        if (path === "/api/auth/logout") forwardRefreshCookie(res, response.headers);
        res.status(204).end();
        return;
      }

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

      if (response.status === 200 && (path === "/api/auth/login" || path === "/api/auth/refresh")) {
        forwardRefreshCookie(res, response.headers);
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

  router.post("/refresh", (req, res) =>
    forward(req, res, "/api/auth/refresh"),
  );

  router.post("/logout", (req, res) =>
    forward(req, res, "/api/auth/logout"),
  );

  // Identity may wait up to five seconds for email delivery after creating the user.
  router.post("/register", (req, res) =>
    forward(req, res, "/api/auth/register", Math.max(config.timeout, 10_000)),
  );

  router.post("/verify-email", (req, res) =>
    forward(req, res, "/api/auth/verify-email"),
  );

  router.post("/resend-verification", (req, res) =>
    forward(req, res, "/api/auth/resend-verification"),
  );

  router.get("/me", (req, res) =>
    forward(req, res, "/api/auth/me"),
  );

  return router;
}