export class GatewayError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
export function assert(value: unknown, message: string): asserts value {
  if (!value) throw new GatewayError(400, message);
}
