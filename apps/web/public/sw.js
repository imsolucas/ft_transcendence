/* VOLLEY.EXE service worker (registered in production builds only, see
 * src/components/layout/service-worker.tsx).
 *
 * What is cached is decided by URL allow-list, never by inspecting the response: browsers
 * strip Set-Cookie from responses a service worker can see, so a header check would prove
 * nothing.
 *   - /_next/static/* (content-hashed JS, CSS, fonts) and /icons/*: cache-first.
 *   - Navigations: network-first. The user's own HTML responses are NEVER stored (they can be
 *     signed-in pages). When the network fails, the worker answers with a page it fetched
 *     itself, anonymously (credentials: "omit", so no cookie is sent and none is stored):
 *       /{lang}/offline  precached on install (required)
 *       /{lang}/local    the client-side 2-player game, precached on install (best effort)
 *                        and refreshed after an online visit
 *   - RSC fetches: network only; an empty 204 when offline (see handleRsc).
 *   - Everything else (/api/*, /ws*, non-GET, other origins) is not touched.
 *
 * Bump VERSION when this file's caching logic changes: activate deletes every other ft-* cache.
 */
const VERSION = "v2";
const SHELL_CACHE = `ft-shell-${VERSION}`; // offline + local pages and the assets they need
const STATIC_CACHE = `ft-static-${VERSION}`; // runtime cache-first assets
const STATIC_MAX_ENTRIES = 250;
const SHELL_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const LOCALES = ["en", "es", "fr"];
const OFFLINE_PAGES = LOCALES.map((l) => `/${l}/offline`);
const LOCAL_PAGES = LOCALES.map((l) => `/${l}/local`);
const STATIC_FILES = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

const ASSET_RE = /\/_next\/static\/[^"'\s)\\?#]+/g;

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/favicon.ico";
}

/** Anonymous same-origin GET: no cookies sent, none stored, so the HTML is never personalised */
function anonymousFetch(path) {
  return fetch(path, { credentials: "omit", cache: "no-store", redirect: "error" });
}

/** /_next/static URLs referenced by a page (script/link tags and the inline flight data) */
function assetUrls(text) {
  return [...new Set(text.match(ASSET_RE) || [])];
}

/** Fonts and images a stylesheet references; Next writes them relative (url(../media/x.woff2)) */
function cssUrls(css, cssPath) {
  const out = new Set();
  for (const m of css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
    const ref = m[2];
    if (ref.startsWith("data:")) continue;
    const url = new URL(ref, self.location.origin + cssPath);
    if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) out.add(url.pathname);
  }
  return [...out];
}

/** Fetch an asset into the shell cache unless it is already cached; returns its body for CSS */
async function cacheAsset(cache, path) {
  const hit = await cache.match(path);
  if (hit && !path.endsWith(".css")) return null;
  const res = hit || (await fetch(path, { credentials: "same-origin" }));
  if (!res.ok || res.type !== "basic") return null;
  if (!hit) await cache.put(path, res.clone());
  return path.endsWith(".css") ? res.text() : null;
}

/** Store an anonymous copy of a page plus every static asset it needs (and fonts from its CSS) */
async function cachePage(path) {
  const cache = await caches.open(SHELL_CACHE);
  const res = await anonymousFetch(path);
  if (!res.ok || res.redirected || res.type !== "basic") throw new Error(`precache ${path}: ${res.status}`);
  const html = await res.clone().text();
  const assets = assetUrls(html);
  const css = await Promise.all(assets.map((u) => cacheAsset(cache, u)));
  const fonts = css.flatMap((text, i) => (text ? cssUrls(text, assets[i]) : []));
  await Promise.all(fonts.map((u) => cacheAsset(cache, u)));
  // Stamp when it was stored so online visits can refresh it later
  // (fresh headers: the body is already decoded, so content-encoding/length must not be copied)
  const headers = new Headers({
    "content-type": res.headers.get("content-type") || "text/html; charset=utf-8",
    "x-ft-cached-at": String(Date.now()),
  });
  await cache.put(path, new Response(html, { status: 200, headers }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(STATIC_FILES.map((p) => new Request(p, { credentials: "omit" })));
      await Promise.all(OFFLINE_PAGES.map(cachePage)); // required: install fails without them
      await Promise.allSettled(LOCAL_PAGES.map(cachePage)); // bonus: offline local play
    })(),
  );
  // No skipWaiting here: a new version waits and is applied on the next page load
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL_CACHE, STATIC_CACHE];
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("ft-") && !keep.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function localeOf(url) {
  const first = url.pathname.split("/")[1];
  if (LOCALES.includes(first)) return first;
  const nav = (self.navigator && self.navigator.language ? self.navigator.language : "en").slice(0, 2).toLowerCase();
  return LOCALES.includes(nav) ? nav : "en";
}

/** /{lang}/local (any query string, e.g. ?mode=ai) */
function localPage(url) {
  const m = url.pathname.match(/^\/(en|es|fr)\/local\/?$/);
  return m ? `/${m[1]}/local` : null;
}

async function refreshIfStale(path) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(path);
  const at = hit ? Number(hit.headers.get("x-ft-cached-at")) : 0;
  if (Date.now() - at > SHELL_MAX_AGE_MS) await cachePage(path).catch(() => {});
}

async function handleNavigation(event, url) {
  const local = localPage(url);
  try {
    const res = await fetch(event.request);
    // Keep the offline copies fresh after a deploy, without ever storing this response
    if (local) event.waitUntil(refreshIfStale(local));
    else event.waitUntil(refreshIfStale(`/${localeOf(url)}/offline`));
    return res;
  } catch (err) {
    const cache = await caches.open(SHELL_CACHE);
    if (local) {
      const shell = await cache.match(local);
      if (shell) return shell;
    }
    const offline = (await cache.match(`/${localeOf(url)}/offline`)) || (await cache.match("/en/offline"));
    if (offline) return offline;
    throw err;
  }
}

async function trim(cache) {
  const keys = await cache.keys();
  const extra = keys.length - STATIC_MAX_ENTRIES;
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
}

async function handleStatic(event, url) {
  // the favicon link carries a cache-busting query; the precached copy has none
  const hit = await caches.match(event.request, { ignoreSearch: url.pathname === "/favicon.ico" });
  if (hit) return hit;
  const res = await fetch(event.request);
  if (res.ok && res.type === "basic") {
    const copy = res.clone();
    event.waitUntil(
      caches.open(STATIC_CACHE).then(async (cache) => {
        await cache.put(event.request, copy);
        await trim(cache);
      }),
    );
  }
  return res;
}

/**
 * RSC payloads (client-side navigations and <Link> prefetches) are never cached. Without a
 * network they get an empty non-RSC response instead of a network error: Next.js drops a
 * prefetch whose content type isn't text/x-component silently, and turns such a navigation
 * into a full page load, which handleNavigation answers from the offline cache. No console
 * noise either way. (Not 204: Next re-wraps the response, and a null-body status throws.)
 */
async function handleRsc(event) {
  const empty = () => new Response("", { status: 200, headers: { "content-type": "text/plain", "x-ft-offline": "1" } });
  try {
    return await fetch(event.request);
  } catch {
    return empty();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/ws" || url.pathname.startsWith("/ws/")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event, url));
    return;
  }
  if (request.headers.has("RSC") || url.searchParams.has("_rsc")) {
    event.respondWith(handleRsc(event));
    return;
  }
  if (isStaticAsset(url)) event.respondWith(handleStatic(event, url));
  // Everything else (data fetches, the worker script itself): straight to the network
});
