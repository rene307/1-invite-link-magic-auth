import crypto from "crypto";

export function generateToken() {
  return crypto.randomBytes(32).toString("hex"); // 64 chars
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function nowMs() {
  return Date.now();
}

export function minutesToMs(min) {
  return min * 60 * 1000;
}