"use client";

/**
 * Tiny typed window-event bus between independent islands (hero CTA → chat, konami → terminal).
 * Islands are lazy-loaded, so an event fired before anyone listens is held and replayed
 * to the first subscriber (e.g. a visitor taps "Ask CAPCOM" before the chat chunk arrives).
 */
type Events = {
  "dg:capcom": { question?: string } | undefined;
  "dg:terminal": undefined;
  "dg:launch": undefined;
};

const listeners = new Map<string, number>();
const pending = new Map<string, unknown>();

export function emit<K extends keyof Events>(name: K, detail?: Events[K]) {
  if (!listeners.get(name)) {
    pending.set(name, detail);
    // ask the shell to load whichever island handles this event
    window.dispatchEvent(new CustomEvent("dg:wake", { detail: name }));
    return;
  }
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on<K extends keyof Events>(name: K, fn: (detail: Events[K]) => void) {
  const h = (e: Event) => fn((e as CustomEvent<Events[K]>).detail);
  window.addEventListener(name, h);
  listeners.set(name, (listeners.get(name) ?? 0) + 1);
  if (pending.has(name)) {
    const d = pending.get(name) as Events[K];
    pending.delete(name);
    queueMicrotask(() => fn(d));
  }
  return () => {
    window.removeEventListener(name, h);
    listeners.set(name, Math.max(0, (listeners.get(name) ?? 1) - 1));
  };
}
