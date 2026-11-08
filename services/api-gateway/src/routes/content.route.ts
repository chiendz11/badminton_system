
import { Router } from "express";
import type { GatewayConfig } from "../configs/environment";

export function contentRoutes(
    config: GatewayConfig,
    transport: typeof fetch = fetch,
) {
    const router = Router();

    router.use("/content", async (req, res, next) => {
        // Chỉ cho phép các endpoint Rating và News
        const validPath =
            /^\/(ratings|news)(\/[a-fA-F0-9]{24})?\/?$/.test(
                req.path,
            );

        const allowedMethods = [
            "GET",
            "POST",
            "PATCH",
            "DELETE",
        ];

        if (!validPath || !allowedMethods.includes(req.method)) {
            return next();
        }

        const baseUrl =
            config.contentUrl || "http://localhost:3001";

        // Express đã bỏ prefix /api/content khi vào router này.
        // req.url vẫn chứa query string nếu có.
        const target = new URL(
            "/content" + req.url,
            baseUrl,
        );

        const headers: Record<string, string> = {
            Accept: "application/json",
        };

        // Chuyển tiếp JWT tới Content Service
        const authorization = req.get("authorization");

        if (authorization) {
            headers.Authorization = authorization;
        }

        const requestId = req.get("x-request-id");

        if (requestId) {
            headers["X-Request-Id"] = requestId;
        }

        const hasBody = ["POST", "PATCH"].includes(req.method);

        if (hasBody) {
            headers["Content-Type"] = "application/json";
        }

        try {
            const upstream = await transport(target, {
                method: req.method,
                headers,
                body: hasBody
                    ? JSON.stringify(req.body ?? {})
                    : undefined,
                signal: AbortSignal.timeout(
                    config.contentTimeout || 5000,
                ),
                redirect: "manual",
            });

            // Không cho Gateway tự chuyển hướng sang URL lạ
            if (
                upstream.status >= 300 &&
                upstream.status < 400
            ) {
                return res.status(502).json({
                    message: "Content Service trả về redirect",
                });
            }

            const responseBody = await upstream.text();

            if (upstream.status === 204) {
                return res.status(204).end();
            }

            const contentType =
                upstream.headers.get("content-type") ||
                "application/json";

            return res
                .status(upstream.status)
                .type(contentType)
                .send(responseBody);
        } catch (error) {
            const isTimeout =
                error instanceof Error &&
                (error.name === "TimeoutError" ||
                    error.name === "AbortError");

            return res.status(isTimeout ? 504 : 502).json({
                message: isTimeout
                    ? "Content Service phản hồi quá thời gian"
                    : "Content Service không sẵn sàng",
            });
        }
    });

    return router;
}
