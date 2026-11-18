"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/components/layout/shell";
import { Bit } from "./bit";

/**
 * Power-on boot, once per browser session: a CRT line, then VOLLEY.EXE + INSERT COIN.
 * Rendered on the server and animated by CSS (styles/arcade.css), so there is no flash;
 * an inline script in the root layout marks <html data-booted> when this session already saw
 * it (before first paint). Any key or tap skips it. Reduced motion: never shown.
 */
export const BOOT_KEY = "vx-booted";
/** runs in <head> before paint (CSP allows inline scripts) */
export const BOOT_SCRIPT =
  // the session already saw the boot; and the in-app motion/CRT preferences, applied before
  // first paint (lib/prefs.tsx sets the same classes after hydration)
  `try{var h=document.documentElement;if(sessionStorage.getItem("${BOOT_KEY}"))h.setAttribute("data-booted","");` +
  `var p=JSON.parse(localStorage.getItem("ft_prefs")||"{}");if(p.reducedMotion)h.classList.add("reduce-motion");if(p.crt===false)h.classList.add("crt-off");if(p.arcade===false)h.classList.remove("arcade")}catch(e){}`;

export function BootScreen({ insertCoin }: { insertCoin: string }) {
  const [skipped, setSkipped] = useState(false);
  useEffect(() => {
    // already booted this session (or motion off): nothing to show, nothing to animate
    const h = document.documentElement;
    if (h.hasAttribute("data-booted") || h.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setSkipped(true));
      return () => cancelAnimationFrame(id);
    }
    try {
      sessionStorage.setItem(BOOT_KEY, "1");
    } catch {
      /* storage blocked: it just shows again next load */
    }
    const skip = () => setSkipped(true);
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    // the CSS animation hides it at 1.3 s; unmount just after
    const done = setTimeout(skip, 1400);
    return () => {
      clearTimeout(done);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, []);
  // gone for good once skipped or played: BIT stops animating
  if (skipped) return null;
  return (
    <div className="boot" aria-hidden>
      <div className="boot-line" />
      <div className="boot-inner">
        <Bit mood="wave" size={96} />
        <span className="pix text-[22px]">
          <BrandMark />
        </span>
        <span className="pix pix-sm c-amber">{insertCoin}</span>
      </div>
    </div>
  );
}
