"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/** Per-browser preferences (Settings → Preferences). Applied at once, saved automatically. */
export interface Prefs {
  crt: boolean;
  reducedMotion: boolean;
  sound: boolean;
  seenControls: boolean;
}

const DEFAULTS: Prefs = { crt: true, reducedMotion: false, sound: true, seenControls: false };
const KEY = "ft_prefs";

type Ctx = { prefs: Prefs; setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void };
const PrefsContext = createContext<Ctx | null>(null);

function read(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  // Read stored prefs after hydration so server and client render the same markup
  useEffect(() => {
    setPrefs(read());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("crt-off", !prefs.crt);
    root.classList.toggle("reduce-motion", prefs.reducedMotion);
  }, [prefs.crt, prefs.reducedMotion]);

  const setPref = useCallback<Ctx["setPref"]>((key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // storage blocked: the preference still applies for this visit
      }
      return next;
    });
  }, []);

  return <PrefsContext value={{ prefs, setPref }}>{children}</PrefsContext>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside PrefsProvider");
  return ctx;
}

/** True when the OS or the in-app setting asks for reduced motion. */
export function useReducedMotion() {
  const { prefs } = usePrefs();
  const [os, setOs] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setOs(mq.matches);
    const onChange = () => setOs(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return os || prefs.reducedMotion;
}
