import crypto from "node:crypto";
import { log } from "../log.ts";

/**
 * Have I Been Pwned "range" check (k-anonymity): only the first 5 hex characters of the
 * password's SHA-1 leave the server. Fails open: if the service is slow or down, the password
 * is accepted (logged) rather than blocking sign-up, password change and reset.
 */
/** Breached? for an uppercase SHA-1 hex digest; null when the service couldn't be asked. */
export async function isBreachedHash(sha1: string): Promise<boolean | null> {
  const hash = sha1.toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "volley-exe-password-check" },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [s, count] = line.trim().split(":");
      return s === suffix && Number(count) > 0;
    });
  } catch (err) {
    log.error({ err: (err as Error).message }, "breached-password check unavailable (password accepted)");
    return null;
  }
}

/** Fails open: if the service is slow or down, the password is accepted. */
export async function isBreachedPassword(password: string): Promise<boolean> {
  const hash = crypto.createHash("sha1").update(password, "utf8").digest("hex");
  return (await isBreachedHash(hash)) === true;
}
