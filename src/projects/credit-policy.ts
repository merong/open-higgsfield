/** Shared account defaults and video eligibility; actual costs are quoted separately. */
export const DEFAULT_CREDITS = 50;
export const VIDEO_CREDIT_FLOOR = 50;
export const VIDEO_CREDIT_MESSAGE = `동영상 생성은 잔액이 ${VIDEO_CREDIT_FLOOR} 크레딧을 초과해야 이용할 수 있습니다. 생성 비용도 충당할 수 있어야 합니다.`;
export function videoCreditBlocked(surface: string, balance: number) {
  return surface === "video" && balance <= VIDEO_CREDIT_FLOOR;
}
