"use client";

import { prefs } from "./prefs";

/** Tiny synthesized UI sounds. No assets; silent unless the visitor turns sound on. */
type Cue = "tick" | "press" | "open" | "close" | "toggle" | "launch";

const CUES: Record<Cue, { f: number; f2: number; d: number; type: OscillatorType; g: number }> = {
  tick: { f: 2400, f2: 1800, d: 0.025, type: "sine", g: 0.04 },
  press: { f: 520, f2: 380, d: 0.06, type: "triangle", g: 0.08 },
  open: { f: 440, f2: 880, d: 0.16, type: "sine", g: 0.07 },
  close: { f: 760, f2: 380, d: 0.14, type: "sine", g: 0.06 },
  toggle: { f: 660, f2: 990, d: 0.09, type: "square", g: 0.03 },
  launch: { f: 110, f2: 1320, d: 0.9, type: "sawtooth", g: 0.05 },
};

let ctx: AudioContext | null = null;

export function play(cue: Cue) {
  if (typeof window === "undefined" || !prefs.get().sound) return;
  try {
    ctx ??= new AudioContext();
    const c = CUES[cue];
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = c.type;
    o.frequency.setValueAtTime(c.f, t);
    o.frequency.exponentialRampToValueAtTime(c.f2, t + c.d);
    g.gain.setValueAtTime(c.g, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + c.d);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + c.d + 0.02);
  } catch {
    /* audio unavailable */
  }
}
