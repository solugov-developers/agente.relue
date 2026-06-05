import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const dk = scryptSync(pw, salt, 64);
  return salt.toString("hex") + ":" + dk.toString("hex");
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [s, h] = (stored || "").split(":");
  if (!s || !h) return false;
  const dk = scryptSync(pw, Buffer.from(s, "hex"), 64);
  const hb = Buffer.from(h, "hex");
  return dk.length === hb.length && timingSafeEqual(dk, hb);
}
