import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, userForSession } from "./auth";
import { ServiceError } from "./errors";
import { assertAdminIp, verifiedPeer } from "./admin-access";
export async function currentUser() {
  const user = await userForSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (user?.admin) {
    try { assertAdminIp(verifiedPeer(await headers())); } catch { return null; }
  }
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (!user.admin) throw new ServiceError(403,"관리자만 이용할 수 있습니다.");
  return user;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new ServiceError(401, "로그인 후 이용해 주세요.");
  return user;
}
