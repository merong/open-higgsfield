export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function text(
  value: unknown,
  label: string,
  max: number,
  min = 0,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max
  )
    throw new ServiceError(400, `${label} 입력을 확인해 주세요.`);
  return value.trim();
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ServiceError(400, "입력 형식이 올바르지 않습니다.");
  return value as Record<string, unknown>;
}
