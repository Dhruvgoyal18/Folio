"use client";

import { useRef, useState } from "react";
import { ACCEPT, loadFile } from "./loaders";
import { extract, type ExtractResult } from "./client";
import { inputCls } from "./fields";
import { cn } from "@/lib/cn";

type Status = { kind: "idle" } | { kind: "busy"; msg: string } | { kind: "error"; msg: string };

export function UploadStep({ onDone }: { onDone: (r: ExtractResult & { source: string }) => void }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [over, setOver] = useState(false);
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const run = async (get: () => Promise<{ text: string; links: string[]; source: string }>) => {
    try {
      setStatus({ kind: "busy", msg: "Reading your résumé…" });
      const { text, links, source } = await get();
      setStatus({ kind: "busy", msg: "Finding roles, dates, skills and results…" });
      const r = await extract(text, links);
      setStatus({ kind: "idle" });
      onDone({ ...r, source });
    } catch (e) {
      setStatus({ kind: "error", msg: e instanceof Error ? e.message : "Something went wrong." });
    }
  };
  const fromFile = (f: File | undefined) => f && run(async () => ({ ...(await loadFile(f)), source: f.name }));
  const busy = status.kind === "busy";

  return (
    <div className="mx-auto grid max-w-[1040px] gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:pt-6">
      <div className="flex flex-col gap-5">
        <header>
          <p className="kicker">Step 1 of 4</p>
          <h1 className="display mt-2 text-[length:var(--fs-4)] leading-tight">Start with your résumé</h1>
          <p className="mt-2 max-w-[56ch] text-ink-muted">PDF, Word or plain text. The file is read in your browser — only its text is sent to be structured, and nothing is published until you say so.</p>
        </header>

        <label
          htmlFor="resume-file"
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            fromFile(e.dataTransfer.files[0]);
          }}
          className={cn(
            "group flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center transition-colors",
            over ? "border-signal-ink bg-paper-sunk" : "border-ink/25 bg-paper-raised hover:border-ink/60",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full border border-rule bg-paper text-[length:var(--fs-2)] text-ink-muted transition-transform group-hover:-translate-y-0.5">
            ↑
          </span>
          <span className="text-[length:var(--fs-1)] font-semibold">Drop your résumé here</span>
          <span className="text-[length:var(--fs--1)] text-ink-muted">
            or <span className="text-ink underline underline-offset-2">browse files</span> · PDF, DOCX, TXT · up to 8 MB
          </span>
          <input ref={input} id="resume-file" type="file" accept={ACCEPT} className="sr-only" disabled={busy} onChange={(e) => fromFile(e.target.files?.[0])} data-testid="resume-file" />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setPaste((p) => !p)} aria-expanded={paste} aria-controls="paste-box">
            {paste ? "Hide text box" : "Paste text instead"}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={busy}
            onClick={() => run(async () => ({ text: await (await fetch("/samples/maya-chen.txt")).text(), links: [], source: "sample résumé" }))}
            data-testid="use-sample"
          >
            Try a sample résumé
          </button>
        </div>

        {paste ? (
          <div id="paste-box" className="flex flex-col gap-2">
            <label htmlFor="paste-text" className="label">
              Résumé text
            </label>
            <textarea id="paste-text" rows={10} className="field" style={{ minHeight: "14rem" }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the full text of your résumé…" />
            <div>
              <button type="button" disabled={busy || text.trim().length < 40} className="btn btn-primary" onClick={() => run(async () => ({ text, links: [], source: "pasted text" }))}>
                Use this text
              </button>
            </div>
          </div>
        ) : null}

        <p role="status" aria-live="polite" className={cn("min-h-6 text-[length:var(--fs--1)]", status.kind === "error" ? "font-medium text-signal-ink" : "text-ink-muted")} data-testid="upload-status">
          {status.kind === "busy" ? <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-ink/20 border-t-ink align-[-1px]" aria-hidden="true" /> : null}
          {status.kind === "idle" ? "" : status.msg}
        </p>
      </div>

      <aside className="panel h-fit p-5">
        <h2 className="font-semibold">What happens next</h2>
        <ol className="mt-3 flex flex-col gap-3 text-[length:var(--fs--1)]" role="list">
          {[
            ["Review", "Check every role, date and bullet we found. Nothing is invented."],
            ["Design", "Pick a concept and remix colours, type and motion until it feels like you."],
            ["Publish", "Choose an address. You get a public link and a private edit link."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="mono mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rule text-[length:var(--fs--2)] text-ink-muted">{i + 2}</span>
              <span>
                <span className="font-medium">{t}</span>
                <span className="block text-ink-muted">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
