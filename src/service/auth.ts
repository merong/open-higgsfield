import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { DEFAULT_CREDITS } from "../projects/credit-policy";
import { ledger } from "./credits";
import { database } from "./db";
import { ServiceError, text } from "./errors";
import { assertAdminIp } from "./admin-access";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "ohf_session";
export const SESSION_AGE = 60 * 60 * 24 * 14;
export interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  admin: boolean;
  username?: string;
}
interface UserRow {
  id: string;
  email: string;
  name: string;
  credits: number;
  password_hash: string;
  is_admin: boolean;
  username?: string;
}
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const publicUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  credits: row.credits,
  admin: row.is_admin === true,
  username: row.username,
});

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected || expected.length !== 128) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}
export async function throttle(key: string, max = 10, windowMs = 15 * 60_000) {
  const db = await database();
  const now = Date.now();
  const [row] = await db.query<{ count: number }>(
    `INSERT INTO auth_attempts (key,count,expires_at) VALUES ($1,1,$2) ON CONFLICT (key) DO UPDATE SET count=CASE WHEN auth_attempts.expires_at < $3 THEN 1 ELSE auth_attempts.count+1 END, expires_at=CASE WHEN auth_attempts.expires_at < $3 THEN $2 ELSE auth_attempts.expires_at END RETURNING count`,
    [hash(key), now + windowMs, now],
  );
  if (row.count > max)
    throw new ServiceError(429, "요청이 많습니다. 잠시 후 다시 시도해 주세요.");
}
export async function authenticate(
  data: Record<string, unknown>,
  register: boolean,
  peer?: string | null,
) {
  const email = text(data.email, register ? "이메일" : "아이디 또는 이메일", 254, 3).toLowerCase();
  if (register && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ServiceError(400, "이메일 형식을 확인해 주세요.");
  const password = data.password;
  if (
    typeof password !== "string" ||
    password.length < (register ? 10 : 1) ||
    password.length > 128
  )
    throw new ServiceError(400, "비밀번호 길이를 확인해 주세요.");
  await throttle(`login:${email}`);
  const db = await database();
  let [row] = await db.query<UserRow>("SELECT * FROM users WHERE email=$1 OR username=$1", [
    email,
  ]);
  if (register) {
    if (row)
      throw new ServiceError(
        409,
        "이 이메일로 가입할 수 없습니다. 로그인해 주세요.",
      );
    const name = text(data.name, "이름", 50, 1);
    const passwordHash = await hashPassword(password);
    try {
      row = await db.transaction(async (tx) => {
        const [created] = await tx.query<UserRow>(
          "INSERT INTO users (id,email,name,password_hash,credits,created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
          [randomUUID(), email, name, passwordHash, DEFAULT_CREDITS, Date.now()],
        );
        await ledger(tx, created.id, DEFAULT_CREDITS, "signup", "가입 기본 크레딧 지급");
        return created;
      });
    } catch {
      throw new ServiceError(
        409,
        "가입을 완료하지 못했습니다. 로그인 또는 재시도해 주세요.",
      );
    }
  } else {
    /* A missing account still does one expensive password derivation. */
    const valid = await verifyPassword(
      password,
      row?.password_hash || `${"0".repeat(32)}:${"0".repeat(128)}`,
    );
    if (!row || !valid)
      throw new ServiceError(401, "이메일 또는 비밀번호가 일치하지 않습니다.");
  }
  if (row.is_admin) assertAdminIp(peer);
  const token = randomBytes(32).toString("base64url");
  await db.query("DELETE FROM sessions WHERE expires_at < $1", [Date.now()]);
  await db.query(
    "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,$3)",
    [hash(token), row.id, Date.now() + SESSION_AGE * 1000],
  );
  return { user: publicUser(row), token };
}
export async function userForSession(token?: string): Promise<User | null> {
  if (!token || token.length > 128) return null;
  const [row] = await (
    await database()
  ).query<UserRow>(
    "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>$2",
    [hash(token), Date.now()],
  );
  return row ? publicUser(row) : null;
}
export async function revokeSession(token?: string) {
  if (token)
    await (
      await database()
    ).query("DELETE FROM sessions WHERE token_hash=$1", [hash(token)]);
}
