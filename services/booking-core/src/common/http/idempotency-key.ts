import { BadRequestException } from "@nestjs/common";
export function idempotencyKey(value?: string) {
  if (!value || !/^[A-Za-z0-9_-]{8,128}$/.test(value))
    throw new BadRequestException("Cần Idempotency-Key hợp lệ (8–128 ký tự)");
  return value;
}
