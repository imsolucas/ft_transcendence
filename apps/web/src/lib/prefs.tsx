"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

/** Per-browser preferences (Settings → Preferences). Applied at once, saved automatically. */
export const COURT_THEMES = ["neon", "phosphor", "amber", "classic"] as const;
export type CourtTheme = (typeof COURT_THEMES)[number];

export interface Prefs {
  courtTheme: CourtTheme;
  crt: boolean;
  /** arcade display: pixel fonts, pixel shapes, CRT monitor, low-res game screen */
  arcade: boolean;
  reducedMotion: boolean;
  sound: boolean;
  seenControls: boolean;
}

const DEFAULTS: Prefs = { courtTheme: "neon", crt: true, arcade: true, reducedMotion: false, sound: true, seenControls: false };
const KEY = "ft_prefs";

// A tiny external store over localStorage, so server render and hydration use the defaults
// and the stored values apply right after (no setState-in-effect).
let cache: Prefs | null = null;
const subscribers = new Set<() => void>();

function readStored(): Prefs {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    if (!COURT_THEMES.includes(cache!.courtTheme)) cache = { ...cache!, courtTheme: DEFAULTS.courtTheme };
  } catch {
    cache = DEFAULTS;
  }
  return cache!;
}

function write(next: Prefs) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage blocked: the preference still applies for this visit
  }
  subscribers.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  subscribers.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    subscribers.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

type Ctx = { prefs: Prefs; setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void };
const PrefsContext = createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const prefs = useSyncExternalStore(subscribe, readStored, () => DEFAULTS);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("crt-off", !prefs.crt);
    root.classList.toggle("reduce-motion", prefs.reducedMotion);
    root.classList.toggle("arcade", prefs.arcade);
  }, [prefs.crt, prefs.reducedMotion, prefs.arcade]);

  const setPref = useCallback<Ctx["setPref"]>((key, value) => {
    write({ ...readStored(), [key]: value });
  }, []);

  return <PrefsContext value={{ prefs, setPref }}>{children}</PrefsContext>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside PrefsProvider");
  return ctx;
}

function subscribeMotion(fn: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
}

/** True when the OS or the in-app setting asks for reduced motion. */
export function useReducedMotion() {
  const { prefs } = usePrefs();
  const os = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
  return os || prefs.reducedMotion;
}
