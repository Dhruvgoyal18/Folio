"use client";

import { shortLabel } from "@/lib/skill-graph-label";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { buildConstellation, nodeProgress, type CLayout } from "@/lib/constellation";
import { usePrefs } from "@/lib/prefs";
import { monthLabel } from "@/lib/resume";
import type { Resume } from "@/data/schema";

type Colors = { ink: THREE.Color; signal: THREE.Color; teal: THREE.Color; paper: THREE.Color };

function readColors(): Colors {
  const s = getComputedStyle(document.documentElement);
  const c = (v: string) => new THREE.Color(s.getPropertyValue(v).trim() || "black");
  return { ink: c("--c-ink"), signal: c("--c-signal"), teal: c("--c-teal"), paper: c("--c-paper") };
}

/* ---------------- background: drafting-table contour field ---------------- */

const contourVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }
`;
const contourFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uRes;
uniform vec3 uInk;
uniform vec3 uSignal;
uniform float uAlpha;
uniform float uProgress;

vec2 hash(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453123); }
float noise(vec2 p) {
  const float K1 = 0.366025404; const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1); vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x); vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2; vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
  return dot(n, vec3(70.0));
}
float fbm(vec2 p) { float f = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { f += a * noise(p); p *= 2.02; a *= 0.5; } return f; }

void main() {
  vec2 uv = vUv; vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = uv * asp * 1.6;
  vec2 m = uMouse * asp;
  float d = length(uv * asp - m);
  float h = fbm(p + vec2(uTime * 0.015, uTime * 0.01)) + 0.35 * exp(-d * d * 6.0);
  float bands = h * 14.0;
  float line = abs(fract(bands) - 0.5) / fwidth(bands);
  float c = 1.0 - min(line, 1.0);
  float major = step(0.92, fract(bands / 5.0 + 0.04));
  vec3 col = mix(uInk, uSignal, major * 0.6);
  float fade = smoothstep(1.25, 0.15, length((uv - 0.5) * asp));
  gl_FragColor = vec4(col, c * uAlpha * (0.55 + major * 0.6) * fade * (1.0 - 0.6 * uProgress));
}
`;

function ContourField({ colors, progress, alpha }: { colors: Colors; progress: MotionValue<number>; alpha: number }) {
  const { size } = useThree();
  const mouse = useRef(new THREE.Vector2(0.5, 0.5));
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: contourVert,
        fragmentShader: contourFrag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uTime: { value: 0 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uRes: { value: new THREE.Vector2(1, 1) },
          uInk: { value: colors.ink.clone() },
          uSignal: { value: colors.signal.clone() },
          uAlpha: { value: alpha },
          uProgress: { value: 0 },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    mat.uniforms.uInk!.value.copy(colors.ink);
    mat.uniforms.uSignal!.value.copy(colors.signal);
    mat.uniforms.uAlpha!.value = alpha;
  }, [colors, alpha, mat]);
  useEffect(() => {
    const onMove = (e: PointerEvent) => mouse.current.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  useFrame((_, dt) => {
    const u = mat.uniforms;
    u.uTime!.value += dt;
    (u.uMouse!.value as THREE.Vector2).lerp(mouse.current, 0.04);
    (u.uRes!.value as THREE.Vector2).set(size.width, size.height);
    u.uProgress!.value = progress.get();
  });
  return (
    <mesh frustumCulled={false} renderOrder={-1} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/* ---------------- stars ---------------- */

const starVert = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
varying vec3 vColor;
uniform float uPixelRatio;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPixelRatio * (62.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;
const starFrag = /* glsl */ `
precision highp float;
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.36, d);
  float ring = smoothstep(0.5, 0.44, d) - smoothstep(0.4, 0.34, d);
  gl_FragColor = vec4(vColor, max(a * 0.92, ring));
}
`;

export type HoverInfo = { name: string; x: number; y: number; firstUsed: string | null } | null;

function Stars({
  layout, colors, progress, labelRefs, tickRefs, onHover, shift,
}: {
  shift: { x: number; y: number };
  layout: CLayout;
  colors: Colors;
  progress: MotionValue<number>;
  labelRefs: React.RefObject<(HTMLSpanElement | null)[]>;
  tickRefs: React.RefObject<(HTMLSpanElement | null)[]>;
  onHover: (h: HoverInfo) => void;
}) {
  const { camera, size, gl } = useThree();
  const n = layout.nodes.length;
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const rot = useRef({ x: 0.25, y: 0, tx: 0.25, ty: 0 });
  const lastHover = useRef<string | null>(null);

  const { geo, lineGeo, trailGeo, positions, linePos } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const cols = new Float32Array(n * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(cols, 3));
    const lineGeo = new THREE.BufferGeometry();
    const linePos = new Float32Array(layout.edges.length * 6);
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([layout.line.x0, 0, 0, layout.line.x1, 0, 0]), 3),
    );
    return { geo, lineGeo, trailGeo, positions, linePos };
  }, [layout, n]);

  // colours/sizes depend on theme
  useEffect(() => {
    const sizes = geo.getAttribute("aSize") as THREE.BufferAttribute;
    const cols = geo.getAttribute("aColor") as THREE.BufferAttribute;
    layout.nodes.forEach((node, i) => {
      sizes.setX(i, node.size * (node.key ? 1.25 : 1));
      const c = node.evidenced ? colors.signal : colors.ink;
      cols.setXYZ(i, c.r, c.g, c.b);
    });
    sizes.needsUpdate = true;
    cols.needsUpdate = true;
  }, [colors, geo, layout]);

  const starMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: starVert,
        fragmentShader: starFrag,
        transparent: true,
        depthWrite: false,
        uniforms: { uPixelRatio: { value: Math.min(gl.getPixelRatio(), 1.75) } },
      }),
    [gl],
  );
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, opacity: 0.28 }), []);
  const trailMat = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, opacity: 0 }), []);
  const trailLine = useMemo(() => new THREE.Line(trailGeo, trailMat), [trailGeo, trailMat]);
  useEffect(() => {
    lineMat.color.copy(colors.ink);
    trailMat.color.copy(colors.signal);
  }, [colors, lineMat, trailMat]);

  useEffect(() => {
    const el = gl.domElement.parentElement?.parentElement ?? gl.domElement;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      rot.current.ty = ((e.clientX - r.left) / r.width - 0.5) * 0.9;
      rot.current.tx = 0.25 + ((e.clientY - r.top) / r.height - 0.5) * 0.5;
    };
    const leave = () => {
      pointer.current = null;
    };
    window.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [gl]);

  const v = useMemo(() => new THREE.Vector3(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const m = useMemo(() => new THREE.Matrix4(), []);

  useFrame((state, dt) => {
    const p = progress.get();
    const R = rot.current;
    R.y += dt * 0.06 * (1 - p); // idle drift
    R.x += (R.tx - R.x) * 0.05;
    const yaw = R.y + R.ty;
    e.set(R.x * (1 - p), yaw * (1 - p), 0);
    m.makeRotationFromEuler(e);

    const breathe = Math.sin(state.clock.elapsedTime * 0.6) * 0.04 * (1 - p);
    for (let i = 0; i < n; i++) {
      const node = layout.nodes[i]!;
      const t = nodeProgress(p, i, n);
      v.set(node.start[0], node.start[1], node.start[2]).multiplyScalar(1 + breathe).applyMatrix4(m);
      v.x += shift.x;
      v.y += shift.y;
      positions[i * 3] = v.x + (node.end[0] - v.x) * t;
      positions[i * 3 + 1] = v.y + (node.end[1] - v.y) * t;
      positions[i * 3 + 2] = v.z + (node.end[2] - v.z) * t;
    }
    (geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;

    layout.edges.forEach(([a, b], k) => {
      linePos.set(positions.subarray(a * 3, a * 3 + 3), k * 6);
      linePos.set(positions.subarray(b * 3, b * 3 + 3), k * 6 + 3);
    });
    (lineGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    lineMat.opacity = 0.28 * (1 - Math.min(1, p * 1.6));
    trailMat.opacity = Math.max(0, (p - 0.55) / 0.45);

    // project to screen for DOM labels / ticks (no React re-render)
    const proj = (x: number, y: number, z: number) => {
      v.set(x, y, z).project(camera);
      return { sx: (v.x * 0.5 + 0.5) * size.width, sy: (-v.y * 0.5 + 0.5) * size.height, front: v.z < 1 };
    };
    const labels = labelRefs.current ?? [];
    layout.nodes.forEach((node, i) => {
      const el = labels[i];
      if (!el) return;
      const s = proj(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!);
      el.style.transform = `translate3d(${s.sx + 10}px, ${s.sy - 8}px, 0)`;
      el.style.opacity = String(Math.max(0, 1 - p * 2.2));
    });
    const ticks = tickRefs.current ?? [];
    layout.ticks.forEach((tk, i) => {
      const el = ticks[i];
      if (!el) return;
      const s = proj(tk.x, -0.55, 0);
      el.style.transform = `translate3d(${s.sx}px, ${s.sy}px, 0) translateX(-50%)`;
      el.style.opacity = String(Math.max(0, (p - 0.7) / 0.3));
    });

    // hover: nearest star within 22px
    if (pointer.current && p < 0.98) {
      let best = -1;
      let bestD = 22;
      for (let i = 0; i < n; i++) {
        const s = proj(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!);
        const d = Math.hypot(s.sx - pointer.current.x, s.sy - pointer.current.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      const id = best >= 0 ? layout.nodes[best]!.id : null;
      if (id !== lastHover.current) {
        lastHover.current = id;
        if (best >= 0) {
          const node = layout.nodes[best]!;
          const s = proj(positions[best * 3]!, positions[best * 3 + 1]!, positions[best * 3 + 2]!);
          onHover({ name: node.name, x: s.sx, y: s.sy, firstUsed: node.firstUsed });
        } else onHover(null);
      }
    } else if (lastHover.current) {
      lastHover.current = null;
      onHover(null);
    }
  });

  return (
    <>
      <lineSegments geometry={lineGeo} material={lineMat} />
      <primitive object={trailLine} />
      <points geometry={geo} material={starMat} />
    </>
  );
}

/**
 * Adaptive quality: samples frame time and steps down when the device struggles.
 * level 0 → full; level 1 → DPR 1 and no contour shader; then hands back to the SVG fallback.
 */
function Governor({ onLevel }: { onLevel: (level: number) => void }) {
  const { setDpr } = useThree();
  // time-based so a slow device is detected in ~2 s, not after hundreds of slow frames
  const acc = useRef({ t: 0, n: 0, level: 0, warm: 0.8 });
  useFrame((_, dt) => {
    const a = acc.current;
    if (a.warm > 0) {
      a.warm -= dt; // ignore shader-compile / first-frame hitches
      return;
    }
    a.t += dt;
    a.n++;
    if (a.t < 1.2) return;
    const fps = a.n / a.t;
    a.t = 0;
    a.n = 0;
    if (fps < 40 && a.level === 0) {
      a.level = 1;
      setDpr(1);
      onLevel(1);
    } else if (fps < 28 && a.level === 1) {
      a.level = 2;
      onLevel(2);
    }
  });
  return null;
}

function Scene({ resume, colors, progress, labelRefs, tickRefs, onHover, layout, setLayout, dark, level, onLevel }: {
  resume: Resume;
  level: number;
  onLevel: (l: number) => void;
  colors: Colors;
  progress: MotionValue<number>;
  labelRefs: React.RefObject<(HTMLSpanElement | null)[]>;
  tickRefs: React.RefObject<(HTMLSpanElement | null)[]>;
  onHover: (h: HoverInfo) => void;
  layout: CLayout;
  setLayout: (l: CLayout) => void;
  dark: boolean;
}) {
  const { viewport } = useThree();
  const wide = viewport.width > viewport.height;
  const half = Math.min(viewport.width * 0.44, 7.5);
  const radius = wide ? Math.min(2.1, viewport.width * 0.17) : Math.min(1.2, viewport.width * 0.34, viewport.height * 0.15);
  const shift = useMemo(
    () => (wide ? { x: viewport.width * 0.2, y: 0 } : { x: 0, y: -viewport.height * 0.31 }),
    [wide, viewport.width, viewport.height],
  );
  useEffect(() => {
    setLayout(buildConstellation(resume, { halfWidth: half, radius }));
  }, [resume, half, radius, setLayout]);
  return (
    <>
      {/* ?quality=high pins full quality (used for documentation captures on GPU-less CI) */}
      {typeof location !== "undefined" && new URLSearchParams(location.search).get("quality") === "high" ? null : <Governor onLevel={onLevel} />}
      {level === 0 ? <ContourField colors={colors} progress={progress} alpha={dark ? 0.16 : 0.12} /> : null}
      <Stars layout={layout} colors={colors} progress={progress} labelRefs={labelRefs} tickRefs={tickRefs} onHover={onHover} shift={shift} />
    </>
  );
}

/**
 * Hero WebGL moment: 56 skills as ink stars that collapse onto the career line.
 * Render loop pauses when off-screen or when the tab is hidden.
 */
export default function Constellation({
  resume, progress, className, onReady, onDegrade,
}: { resume: Resume; progress: MotionValue<number>; className?: string; onReady?: () => void; onDegrade?: () => void }) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (level >= 2) onDegrade?.();
  }, [level, onDegrade]);
  const { theme } = usePrefs();
  const wrap = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<Colors | null>(null);
  const [layout, setLayout] = useState<CLayout>(() => buildConstellation(resume));
  const [active, setActive] = useState(true);
  const [hover, setHover] = useState<HoverInfo>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    // wait a frame so the theme attribute has been applied
    const id = requestAnimationFrame(() => setColors(readColors()));
    return () => cancelAnimationFrame(id);
  }, [theme]);

  useEffect(() => {
    if (!wrap.current) return;
    let visible = true;
    const update = () => setActive(visible && document.visibilityState === "visible");
    const io = new IntersectionObserver(([en]) => {
      visible = !!en?.isIntersecting;
      update();
    });
    io.observe(wrap.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const dark = theme === "dark";

  return (
    <div ref={wrap} className={className} aria-hidden="true" data-testid="constellation-webgl" data-quality={level}>
      {colors ? (
        <Canvas
          dpr={[1, 1.75]}
          frameloop={active ? "always" : "never"}
          camera={{ position: [0, 0, 8], fov: 38 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ position: "absolute", inset: 0 }}
          onCreated={() => requestAnimationFrame(() => onReady?.())}
        >
          <Scene resume={resume} colors={colors} progress={progress} labelRefs={labelRefs} tickRefs={tickRefs} onHover={setHover} layout={layout} setLayout={setLayout} dark={dark} level={level} onLevel={setLevel} />
        </Canvas>
      ) : null}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {layout.nodes.map((node, i) =>
          node.key ? (
            <span
              key={node.id}
              ref={(el) => {
                labelRefs.current[i] = el;
              }}
              className="mono absolute left-0 top-0 whitespace-nowrap text-[length:var(--fs--2)] uppercase text-ink-muted will-change-transform max-md:hidden"
            >
              {shortLabel(node.name)}
            </span>
          ) : null,
        )}
        {layout.ticks.map((t, i) => (
          <span
            key={t.label}
            ref={(el) => {
              tickRefs.current[i] = el;
            }}
            className={
              "mono absolute left-0 top-0 whitespace-nowrap text-[length:var(--fs--1)] will-change-transform " +
              (t.kind === "toolkit" ? "text-ink-muted" : "text-signal-ink")
            }
            style={{ opacity: 0 }}
          >
            {t.kind === "toolkit" ? "◇ toolkit" : `▲ ${t.label}`}
          </span>
        ))}
        {hover ? (
          <span
            className="mono absolute left-0 top-0 rounded-sm bg-ink px-2 py-1 text-[length:var(--fs--2)] text-paper shadow-lifted"
            style={{ transform: `translate3d(${hover.x + 12}px, ${hover.y - 30}px, 0)` }}
          >
            {hover.name}
            {hover.firstUsed ? ` · first used ${monthLabel(hover.firstUsed)}` : " · toolkit"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
