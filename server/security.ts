import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export const MAX_LOGIN_FAILURES = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === derived.length && timingSafeEqual(expectedBuffer, derived);
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function nextFailedLoginState(failures: number, now = new Date()) {
  const nextFailures = failures + 1;
  return nextFailures >= MAX_LOGIN_FAILURES
    ? { passwordFailures: 0, lockedUntil: new Date(now.getTime() + LOGIN_LOCK_MS) }
    : { passwordFailures: nextFailures, lockedUntil: null };
}
