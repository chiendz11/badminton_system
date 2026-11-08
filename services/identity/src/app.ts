import express, { type ErrorRequestHandler, type Router } from "express";
import helmet from "helmet";

export function createApp(checkDatabase: () => Promise<void>, auth?: Router) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "16kb" }));
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "identity" });
  });
  app.get("/health/ready", async (_req, res) => {
    try {
      await checkDatabase();
      res.json({ status: "ready", service: "identity", database: "connected" });
    } catch {
      // Never return DB URLs, passwords or driver details to the caller.
      res
        .status(503)
        .json({
          status: "not_ready",
          service: "identity",
          database: "unavailable",
        });
    }
  });
  if (auth) app.use("/api/auth", auth);
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error.type === "entity.parse.failed" ? 400 : error.type === "entity.too.large" ? 413 : 500;
    res.status(status).json({ message: status === 500 ? "Lỗi hệ thống" : "Dữ liệu yêu cầu không hợp lệ" });
  };
  app.use(handleError);
  app.use((_req, res) => {
    res.status(404).json({ message: "Endpoint not found" });
  });
  return app;
}
