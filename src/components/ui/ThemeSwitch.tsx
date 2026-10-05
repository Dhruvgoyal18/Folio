"use client";

import { flushSync } from "react-dom";
import { prefs, usePrefs } from "@/lib/prefs";
import { duration, cssEase } from "@/design/motion";
import { play } from "@/lib/sound";
import { IconButton } from "./Button";
import { Moon, Sun, MotionOff, MotionOn, SoundOff, SoundOn } from "./icons";

type VT = { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

/** Theme flip reveals as an expanding circle from the toggle (View Transitions API). */
export function ThemeSwitch() {
  const { theme, motion } = usePrefs();
  const next = theme === "dark" ? "light" : "dark";
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    play("toggle");
    const doc = document as Document & VT;
    if (!doc.startViewTransition || motion === "reduced") {
      prefs.set({ theme: next });
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = doc.startViewTransition(() => flushSync(() => prefs.set({ theme: next })));
    t.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: duration.slower, easing: cssEase("inOut"), pseudoElement: "::view-transition-new(root)" },
      );
    });
  };
  return (
    <IconButton label={`Switch to ${next} theme`} onClick={onClick} data-testid="theme-toggle">
      {theme === "dark" ? <Sun /> : <Moon />}
    </IconButton>
  );
}

export function MotionToggle() {
  const { motion } = usePrefs();
  const reduced = motion === "reduced";
  return (
    <IconButton
      label={reduced ? "Turn motion on" : "Reduce motion"}
      pressed={reduced}
      onClick={() => prefs.set({ motion: reduced ? "full" : "reduced" })}
      data-testid="motion-toggle"
    >
      {reduced ? <MotionOff /> : <MotionOn />}
    </IconButton>
  );
}

export function SoundToggle() {
  const { sound } = usePrefs();
  return (
    <IconButton
      label={sound ? "Mute interface sounds" : "Turn on interface sounds"}
      pressed={sound}
      onClick={() => {
        prefs.set({ sound: !sound });
        if (!sound) setTimeout(() => play("open"), 10);
      }}
      data-testid="sound-toggle"
    >
      {sound ? <SoundOn /> : <SoundOff />}
    </IconButton>
  );
}
