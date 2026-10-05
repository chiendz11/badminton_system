import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Telemetry } from "../observability/telemetry";
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly telemetry: Telemetry) {}
  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp(),
      req = context.getRequest<Request & { requestId: string }>(),
      res = context.getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const body =
      error instanceof HttpException
        ? error.getResponse()
        : { message: "Lỗi hệ thống, vui lòng thử lại" };
    if (status >= 500)
      this.telemetry.logger.error(
        { err: error, requestId: req.requestId },
        "request.failed",
      );
    res.status(status).json({
      statusCode: status,
      message:
        typeof body === "string"
          ? body
          : typeof body === "object" && body !== null && "message" in body
            ? body.message
            : "Yêu cầu không hợp lệ",
      requestId: req.requestId,
    });
  }
}
