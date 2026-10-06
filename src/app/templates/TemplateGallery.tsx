"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Concept } from "@/genome/schema";
import { cn } from "@/lib/cn";

export type GalleryItem = { id: Concept; label: string; blurb: string; bestFor: string; seed: number; mock: ReactNode };

const randomSeed = () => 1 + Math.floor(Math.random() * 2 ** 30);

/** Scales a fixed-width page into whatever box it is given (desktop 1366 or phone 390). */
function ScaledFrame({ src, width, title }: { src: string; width: number; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  useEffect(() => setLoaded(false), [src]);
  return (
    <div ref={box} className="relative h-full w-full overflow-hidden rounded-md border border-rule bg-paper-sunk">
      {!loaded ? <p className="absolute inset-0 grid place-items-center text-[length:var(--fs--1)] text-ink-muted">Loading preview…</p> : null}
      <iframe
        key={src}
        src={src}
        title={title}
        onLoad={() => setLoaded(true)}
        className="absolute left-0 top-0 origin-top-left border-0 bg-paper"
        style={{ width, height: `${100 / scale}%`, transform: `scale(${scale})`, opacity: loaded ? 1 : 0 }}
        data-testid="template-frame"
      />
    </div>
  );
}

function Preview({ item, onClose }: { item: GalleryItem; onClose: () => void }) {
  const [seed, setSeed] = useState(item.seed);
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const src = `/site?demo=${item.id}&seed=${seed}`;
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-scrim backdrop-blur-sm" />
        <Dialog.Content className="app fixed inset-2 z-[61] flex flex-col gap-3 rounded-lg border border-rule bg-paper p-3 shadow-lifted sm:inset-6 sm:p-4" aria-describedby={undefined} data-testid="template-preview">
          <div className="flex flex-wrap items-center gap-2">
            <Dialog.Title className="display mr-auto text-[length:var(--fs-2)]">
              {item.label} <span className="text-[length:var(--fs--1)] font-normal text-ink-muted">· design #{seed}</span>
            </Dialog.Title>
            <div className="flex rounded-pill border border-rule p-0.5" role="tablist" aria-label="Device">
              {(["desktop", "phone"] as const).map((d) => (
                <button key={d} type="button" role="tab" aria-selected={device === d} onClick={() => setDevice(d)} className={cn("h-7 rounded-pill px-3 text-[length:var(--fs--1)] capitalize", device === d ? "bg-ink text-paper" : "text-ink-muted")}>
                  {d}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-outline" onClick={() => setSeed(randomSeed())} data-testid="template-remix">
              Remix ↻
            </button>
            <a href={`/create?template=${item.id}&seed=${seed}`} className="btn btn-primary no-underline" data-testid="template-use">
              Use this design
            </a>
            <Dialog.Close className="btn btn-ghost" aria-label="Close preview">✕</Dialog.Close>
          </div>
          <div className={cn("min-h-0 flex-1", device === "phone" && "mx-auto w-full max-w-[390px]")}>
            <ScaledFrame src={src} width={device === "phone" ? 390 : 1366} title={`${item.label} template preview`} />
          </div>
          <p className="text-[length:var(--fs--2)] text-ink-muted">
            Example content: Dhruv Goyal&apos;s résumé. Remix changes the palette, type, layout and motion within the {item.label} template; your own résumé replaces the content when you use it.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function TemplateGallery({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<GalleryItem | null>(null);
  return (
    <>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list" data-testid="template-grid">
        {items.map((t) => (
          <li key={t.id} className="flex flex-col overflow-hidden rounded-lg border border-rule bg-paper-raised" data-testid={`template-${t.id}`}>
            <button type="button" onClick={() => setOpen(t)} className="group relative block text-left" aria-label={`Preview the ${t.label} template`}>
              <div className="transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-[1.02]">{t.mock}</div>
              <span className="absolute right-3 top-3 rounded-pill bg-ink px-2.5 py-1 text-[length:var(--fs--2)] text-paper opacity-0 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100 group-focus-visible:opacity-100">
                Live preview
              </span>
            </button>
            <div className="flex flex-1 flex-col border-t border-rule p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[length:var(--fs-1)] font-semibold">{t.label}</h2>
                <span className="text-right text-[length:var(--fs--2)] text-ink-muted">{t.bestFor}</span>
              </div>
              <p className="mt-1.5 text-[length:var(--fs--1)] text-ink-muted">{t.blurb}</p>
              <div className="mt-auto flex gap-2 pt-4">
                <button type="button" className="btn btn-outline flex-1" onClick={() => setOpen(t)} data-testid={`preview-${t.id}`}>
                  Preview
                </button>
                <a href={`/create?template=${t.id}&seed=${t.seed}`} className="btn btn-primary flex-1 no-underline" data-testid={`use-${t.id}`}>
                  Use template
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {open ? <Preview item={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
