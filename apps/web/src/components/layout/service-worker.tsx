"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production builds. Failures are swallowed on purpose: a browser that
 * refuses service workers (e.g. Chrome on an untrusted self-signed certificate throws a
 * SecurityError) just runs the site without offline support, and the console stays clean.
 *
 * Updates: a new worker installs in the background and waits. On the next page load, a
 * waiting worker is told to take over, so the version changes between loads, never mid-game.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!window.isSecureContext || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          if (cancelled) return;
          reg.waiting?.postMessage({ type: "SKIP_WAITING" });
        })
        .catch(() => {});
    };

    // After load, so registration and precaching never compete with the page itself
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
