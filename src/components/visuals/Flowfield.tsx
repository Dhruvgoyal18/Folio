"use client";

import { useEffect, useRef } from "react";
import { makeNoise } from "@/lib/noise";
import { palette } from "@/design/tokens";
import { mulberry32 } from "@/lib/constellation";
import { capability, useReducedMotion, usePrefs } from "@/lib/prefs";

/**
 * Particle flow field (Canvas 2D): ink and accent particles stream along a seeded noise field
 * and leave fading trails. Pauses off-screen / in background tabs; reduced motion draws a
 * single static frame of streamlines instead.
 */
export function Flowfield({ seed, className, intensity = 1 }: { seed: number; className?: string; intensity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { theme } = usePrefs();

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--c-ink").trim() || palette.light.ink;
    const signal = css.getPropertyValue("--c-signal").trim() || palette.light.signal;
    const paper = css.getPropertyValue("--c-paper").trim() || palette.light.paper;
    const { noise } = makeNoise(seed);
    const rand = mulberry32(seed + 1);
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    let W = 0, H = 0;
    const resize = () => {
      const r = c.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = paper;
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
    };
    resize();
    const lite = capability().lowPower || !capability().finePointer;
    const N = Math.round((lite ? 260 : 700) * intensity);
    const parts = Array.from({ length: N }, (_, i) => ({ x: rand() * W, y: rand() * H, life: rand() * 200, accent: i % 9 === 0 }));
    const scale = 0.0035;
    const angle = (x: number, y: number, t: number) => noise(x * scale + t, y * scale - t * 0.5) * Math.PI * 4;

    if (reduced) {
      // static streamlines
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 160; i++) {
        let x = rand() * W, y = rand() * H;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 60; s++) {
          const a = angle(x, y, 0);
          x += Math.cos(a) * 3;
          y += Math.sin(a) * 3;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = i % 9 === 0 ? signal : ink;
        ctx.globalAlpha = i % 9 === 0 ? 0.5 : 0.12;
        ctx.stroke();
      }
      return;
    }

    let raf = 0;
    let running = true;
    let t = 0;
    const step = () => {
      t += 0.0012;
      // fade previous frame toward transparent → trails
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 0.06;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      for (const p of parts) {
        const a = angle(p.x, p.y, t);
        const nx = p.x + Math.cos(a) * 1.4;
        const ny = p.y + Math.sin(a) * 1.4;
        ctx.strokeStyle = p.accent ? signal : ink;
        ctx.globalAlpha = p.accent ? 0.7 : 0.22;
        ctx.lineWidth = p.accent ? 1.2 : 0.8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        p.x = nx;
        p.y = ny;
        p.life -= 1;
        if (p.life < 0 || nx < 0 || ny < 0 || nx > W || ny > H) {
          p.x = rand() * W;
          p.y = rand() * H;
          p.life = 120 + rand() * 200;
        }
      }
      if (running) raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(([e]) => {
      const vis = !!e?.isIntersecting && document.visibilityState === "visible";
      if (vis && !running) {
        running = true;
        raf = requestAnimationFrame(step);
      } else if (!vis) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(c);
    raf = requestAnimationFrame(step);
    window.addEventListener("resize", resize);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [seed, reduced, theme, intensity]);

  return <canvas ref={ref} className={className} aria-hidden="true" data-testid="hero-flowfield" />;
}
