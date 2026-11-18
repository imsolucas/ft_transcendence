"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production builds. Failures are swallowed on purpose: a browser that
 * refuses service workers (e.g. Chrome on an untrusted self-signed certificate throws a
 * SecurityError) just runs the site without offline support, and the console stays clean.
 *
 * On localhost (Caddy's own CA) registration is opt-in: Chromium logs an uncatchable
 * "SSL certificate error … fetching the script" when the local CA isn't trusted, and the
 * project rule is a clean console. Trust the CA, then open any page once with ?pwa=1
 * (?pwa=0 turns it off). Real domains (publicly trusted certificates) always register.
 *
 * Updates: a new worker installs in the background and waits. On the next page load, a
 * waiting worker is told to take over, so the version changes between loads, never mid-game.
 */
function localOptIn(): boolean {
  const { hostname, search } = window.location;
  if (hostname !== "localhost" && hostname !== "127.0.0.1") return true;
  try {
    const flag = new URLSearchParams(search).get("pwa");
    if (flag === "1") localStorage.setItem("ft_pwa", "1");
    if (flag === "0") localStorage.removeItem("ft_pwa");
    return localStorage.getItem("ft_pwa") === "1";
  } catch {
    return false; // storage blocked: stay off locally
  }
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!window.isSecureContext || !("serviceWorker" in navigator)) return;
    if (!localOptIn()) return;

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
