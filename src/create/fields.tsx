"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Shared control styles live in globals.css under `.app` (.field, .btn, .panel …). */
export const inputCls = "field";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: (id: string, describedBy?: string) => ReactNode; className?: string }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children(id, hintId)}
      {hint ? (
        <p id={hintId} className="hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Text({ label, value, onChange, hint, placeholder, className, type = "text", testId }: { label: string; value: string | undefined; onChange: (v: string) => void; hint?: string; placeholder?: string; className?: string; type?: string; testId?: string }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id, d) => <input id={id} aria-describedby={d} type={type} className="field" value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} data-testid={testId} />}
    </Field>
  );
}

/** One item per line (bullets, coursework). Grows with its content. */
export function Lines({ label, value, onChange, hint, rows = 3, testId, className }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string; rows?: number; testId?: string; className?: string }) {
  return (
    <Field label={label} hint={hint ?? "One per line."} className={className}>
      {(id, d) => <textarea id={id} aria-describedby={d} rows={rows} className="field" value={value.join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} data-testid={testId} />}
    </Field>
  );
}

export function TextArea({ label, value, onChange, hint, testId }: { label: string; value: string; onChange: (v: string) => void; hint?: string; testId?: string }) {
  return (
    <Field label={label} hint={hint}>
      {(id, d) => <textarea id={id} aria-describedby={d} rows={3} className="field" value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId} />}
    </Field>
  );
}

export function SmallButton({ children, onClick, tone = "plain", className, ...rest }: { children: ReactNode; onClick: () => void; tone?: "plain" | "danger" | "solid"; className?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children">) {
  return (
    <button type="button" onClick={onClick} className={cn("btn btn-sm", tone === "plain" && "btn-outline", tone === "danger" && "btn-ghost", tone === "solid" && "btn-primary", className)} {...rest}>
      {children}
    </button>
  );
}

export function Card({ title, children, actions, id, count }: { title: string; children: ReactNode; actions?: ReactNode; id?: string; count?: number }) {
  return (
    <section id={id} className="panel scroll-mt-24 p-4 sm:p-5" aria-labelledby={id ? `${id}-h` : undefined}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={id ? `${id}-h` : undefined} className="text-[length:var(--fs-1)] font-semibold">
          {title}
          {count !== undefined ? <span className="ml-2 font-normal text-ink-muted">{count}</span> : null}
        </h2>
        {actions}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
