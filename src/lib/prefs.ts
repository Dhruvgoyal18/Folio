"use client";

import { useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark";
export type MotionPref = "full" | "reduced";

type Prefs = {
  theme: ThemePref;
  motion: MotionPref;
  sound: boolean;
};

const KEY = "dg01.prefs";

function safeRead(): Partial<Prefs> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
  } catch {
    return {};
  }
}
/**
 * Where the theme is remembered. Platform pages share one theme (null); a published site keeps its
 * own per-site theme (a storage key) so visiting a dark site never flips the studio to dark; the
 * studio's live preview remembers nothing (false).
 */
let themeScope: string | null | false = null;
export function setThemeScope(scope: string | null | false) {
  themeScope = scope;
}
function safeWrite(p: Prefs) {
  try {
    if (themeScope === null) localStorage.setItem(KEY, JSON.stringify(p));
    else {
      const prev = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<Prefs>;
      const { theme: _siteTheme, ...rest } = p; // a site's theme never becomes the platform's
      localStorage.setItem(KEY, JSON.stringify(prev.theme ? { ...rest, theme: prev.theme } : rest));
      if (themeScope) localStorage.setItem(themeScope, p.theme);
    }
  } catch {
    /* storage unavailable — prefs stay in memory */
  }
}

const SERVER: Prefs = { theme: "light", motion: "full", sound: false };
let state: Prefs = SERVER;
let initialised = false;
const listeners = new Set<() => void>();

function init() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  const stored = safeRead();
  const osReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Theme: the inline boot script already resolved it onto <html data-theme>.
  const theme = (document.documentElement.dataset.theme as ThemePref) || stored.theme || "light";
  state = {
    theme,
    motion: stored.motion ?? (osReduced ? "reduced" : "full"),
    sound: stored.sound ?? false,
  };
  apply();
}

function apply() {
  const el = document.documentElement;
  el.dataset.theme = state.theme;
  el.dataset.motion = state.motion;
}

function emit() {
  apply();
  safeWrite(state);
  listeners.forEach((l) => l());
}

export const prefs = {
  get: () => {
    init();
    return state;
  },
  set(patch: Partial<Prefs>) {
    init();
    state = { ...state, ...patch };
    emit();
  },
  subscribe(l: () => void) {
    init();
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function usePrefs(): Prefs {
  return useSyncExternalStore(prefs.subscribe, prefs.get, () => SERVER);
}

export function useReducedMotion(): boolean {
  return usePrefs().motion === "reduced";
}

/**
 * Inline script that runs before paint to avoid a theme flash. On a portfolio site the
 * server injects window.__SITE_META__ = { slug, theme }; a visitor's per-site choice wins,
 * then the genome's default theme.
 */
export const siteThemeKey = (slug: string) => `dg01.site.${slug}.theme`;
export { themeBootScript } from "./theme-boot";

/* ---------- Device capability (for degrading heavy effects) ---------- */

export type Capability = { webgl: boolean; lowPower: boolean; finePointer: boolean };

let cap: Capability | null = null;
export function capability(): Capability {
  if (cap) return cap;
  if (typeof window === "undefined") return { webgl: false, lowPower: true, finePointer: false };
  let webgl = false;
  try {
    const c = document.createElement("canvas");
    webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const forcedLite = new URLSearchParams(location.search).has("lite");
  const lowPower =
    forcedLite ||
    (nav.hardwareConcurrency ?? 8) <= 2 ||
    (nav.deviceMemory ?? 8) <= 2 ||
    nav.connection?.saveData === true;
  cap = { webgl, lowPower, finePointer: matchMedia("(pointer: fine)").matches };
  return cap;
}
