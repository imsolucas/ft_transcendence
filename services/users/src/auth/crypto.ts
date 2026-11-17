import crypto from "node:crypto";

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

/** Constant-time string compare that is safe for different lengths. */
export function safeEqual(a: string, b: string): boolean {
  const ab = crypto.createHash("sha256").update(a).digest();
  const bb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ab, bb);
}
