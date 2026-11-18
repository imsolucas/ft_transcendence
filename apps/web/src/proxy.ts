import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/config";

/**
 * 1. Locale: paths without /en|/es|/fr are redirected using the ft_lang cookie, then
 *    Accept-Language, then English.
 * 2. Optimistic auth redirect: app pages without a session cookie go to /login, and
 *    login/signup with one go to the lobby. This is only UX; the API checks every request.
 */
const SESSION_COOKIES = ["__Secure-ft.session_token", "ft.session_token"];
const PROTECTED = ["/lobby", "/play", "/party", "/profile", "/friends", "/chat", "/settings", "/tournament", "/leaderboard", "/watch", "/coach"];
const GUEST_ONLY = ["/login", "/signup"];

function preferredLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  const header = req.headers.get("accept-language") ?? "";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return (ranked.find((r) => isLocale(r.lang))?.lang as Locale) ?? DEFAULT_LOCALE;
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const first = pathname.split("/")[1];

  if (!isLocale(first)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${preferredLocale(req)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const rest = pathname.slice(first.length + 1) || "/";
  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));

  if (!hasSession && PROTECTED.some((p) => rest === p || rest.startsWith(`${p}/`))) {
    const url = req.nextUrl.clone();
    url.pathname = `/${first}/login`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (hasSession && GUEST_ONLY.includes(rest)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${first}/lobby`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  // Remember the language the user is browsing in
  if (req.cookies.get(LOCALE_COOKIE)?.value !== first) {
    res.cookies.set(LOCALE_COOKIE, first, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}

export const config = {
  // Everything except Next internals, our backends, the PWA files (service worker, manifest,
  // icons: never locale- or auth-redirected) and any other file with an extension
  matcher: ["/((?!_next|api|ws|favicon.ico|sw\\.js|manifest\\.webmanifest|icons/|.*\\..*).*)"],
};

