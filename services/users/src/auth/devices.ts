import crypto from "node:crypto";
import { prisma } from "../db/client.ts";
import { config } from "../config.ts";
import { mail } from "../email/mailer.ts";
import { log } from "../log.ts";

type Locale = "en" | "es" | "fr";

const NEW_ACCOUNT_MS = 24 * 60 * 60 * 1000;

/** "Firefox on Windows" from a User-Agent (coarse on purpose: versions change all the time). */
export function deviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\/|CriOS\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "a browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "an unknown system";
  return `${browser} on ${os}`;
}

/**
 * Called after every new session. A browser + OS this account hasn't used before triggers a
 * "new sign-in" email (not for a new account's first device). Fire-and-forget: never throws.
 */
export async function noteSignIn(userId: number, userAgent: string | null | undefined, locale: Locale): Promise<void> {
  try {
    const label = deviceLabel(userAgent);
    const hash = crypto.createHash("sha256").update(`${userId}:${label}`).digest("hex");
    const known = await prisma.knownDevice.findUnique({ where: { userId_hash: { userId, hash } }, select: { id: true } });
    if (known) {
      await prisma.knownDevice.update({ where: { id: known.id }, data: { lastSeen: new Date() } });
      return;
    }
    const others = await prisma.knownDevice.count({ where: { userId } });
    // upsert: two sign-ins at once from the same new device must not fail or email twice
    const created = await prisma.knownDevice.createMany({ data: [{ userId, hash, label }], skipDuplicates: true });
    if (created.count === 0) return;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, displayUsername: true, username: true, created_at: true } });
    if (!user) return;
    // a brand-new account's first device is not news; an older account with no device on
    // record yet (created before this feature) still gets the alert
    if (others === 0 && Date.now() - user.created_at.getTime() < NEW_ACCOUNT_MS) return;
    await mail.newSignIn(user.email, user.displayUsername || user.username, label, `${config.publicOrigin}/${locale}/settings#security`, locale, log);
  } catch (err) {
    log.error({ err: (err as Error).message, userId }, "new sign-in check failed");
  }
}
