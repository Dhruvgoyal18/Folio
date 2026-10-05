"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Mode = "llm" | "retrieval" | "guard";
export type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** streamed chunks, used for the token-reveal animation */
  chunks?: string[];
  cites?: string[];
  mode?: Mode;
  degraded?: boolean;
  status?: "streaming" | "done" | "error";
};

const BASE = process.env.NEXT_PUBLIC_CHAT_ENDPOINT ?? "/api/chat";
/** Endpoint for a site: /api/chat?site=<slug> */
export const chatEndpoint = (slug: string) => `${BASE}?site=${encodeURIComponent(slug)}`;

const uid = () => Math.random().toString(36).slice(2, 10);

function load(KEY: string): Msg[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Msg[]).map((m) => ({ ...m, status: m.status === "streaming" ? "error" : m.status })) : [];
  } catch {
    return [];
  }
}

/** Parses the endpoint's SSE stream into typed events. */
export async function* readEvents(body: ReadableStream<Uint8Array>) {
  const reader = body.pipeThrough(new TextDecoderStream() as unknown as ReadableWritablePair<string, Uint8Array>).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      try {
        yield JSON.parse(line.slice(5)) as
          | { type: "meta"; mode: Mode; degraded?: boolean }
          | { type: "delta"; text: string }
          | { type: "replace"; text: string }
          | { type: "cite"; ids: string[] }
          | { type: "error"; message: string }
          | { type: "done" };
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}

export function useChat(slug: string, lostSignal = "Lost signal. Please try again.") {
  const KEY = `dg01.chat.${slug}`;
  const CHAT_ENDPOINT = chatEndpoint(slug);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setMessages(load(KEY)), [KEY]);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(messages.slice(-24).map(({ chunks: _c, ...m }) => m)));
    } catch {
      /* storage unavailable */
    }
  }, [messages, KEY]);

  const patch = (id: string, f: (m: Msg) => Msg) => setMessages((ms) => ms.map((m) => (m.id === id ? f(m) : m)));

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      const user: Msg = { id: uid(), role: "user", content: q, status: "done" };
      const bot: Msg = { id: uid(), role: "assistant", content: "", chunks: [], status: "streaming" };
      const history: Array<{ role: Msg["role"]; content: string }> = [];
      for (const m of [...messages.filter((x) => x.status !== "error" && x.content), user]) {
        const last = history[history.length - 1];
        if (last && last.role === m.role) history[history.length - 1] = { role: m.role, content: m.content };
        else history.push({ role: m.role, content: m.content });
      }
      while (history.length > 16) history.shift();
      while (history[0]?.role === "assistant") history.shift();
      setMessages((ms) => [...ms, user, bot]);
      setBusy(true);
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch(CHAT_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          let msg = lostSignal;
          try {
            const j = (await res.json()) as { error?: string };
            if (j.error) msg = j.error;
          } catch {}
          patch(bot.id, (m) => ({ ...m, content: msg, status: "error" }));
          return;
        }
        for await (const ev of readEvents(res.body)) {
          if (ev.type === "meta") patch(bot.id, (m) => ({ ...m, mode: ev.mode, degraded: ev.degraded }));
          else if (ev.type === "delta") patch(bot.id, (m) => ({ ...m, content: m.content + ev.text, chunks: [...(m.chunks ?? []), ev.text] }));
          else if (ev.type === "replace") patch(bot.id, (m) => ({ ...m, content: ev.text, chunks: [ev.text], mode: "guard" }));
          else if (ev.type === "cite") patch(bot.id, (m) => ({ ...m, cites: ev.ids }));
          else if (ev.type === "error") patch(bot.id, (m) => ({ ...m, content: m.content || ev.message, status: "error" }));
        }
        patch(bot.id, (m) => ({ ...m, status: m.status === "error" ? "error" : "done" }));
      } catch (e) {
        if ((e as Error).name !== "AbortError") patch(bot.id, (m) => ({ ...m, content: lostSignal, status: "error" }));
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, messages, CHAT_ENDPOINT, lostSignal],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, busy, send, reset };
}
