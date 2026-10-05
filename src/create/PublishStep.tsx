"use client";

import { useEffect, useRef, useState } from "react";
import { checkSlug, deleteSite, publish, saveEdit, type Published } from "./client";
import type { Draft } from "@/extract/draft";
import type { Genome } from "@/genome/schema";
import { inputCls } from "./fields";

type Props = {
  draft: Draft;
  genome: Genome;
  /** set when editing an existing site */
  edit?: { slug: string; token: string };
  onBack: () => void;
  onPublished: (p: { slug: string; editUrl?: string; token?: string }) => void;
};

function Copy({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-outline shrink-0"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {}
      }}
      aria-label={`Copy ${label}`}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

export function PublishStep({ draft, genome, edit, onBack, onPublished }: Props) {
  const [slug, setSlug] = useState(edit?.slug ?? "");
  const touched = useRef(false); // once the owner types, a late suggestion must not overwrite it
  const [avail, setAvail] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<(Published & { origin: string }) | { slug: string; url: string; origin: string; saved: true } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // suggest an address from the name
  useEffect(() => {
    if (edit) return;
    checkSlug(draft.name)
      .then((r) => {
        if (!touched.current) setSlug((s) => s || r.suggestion);
      })
      .catch(() => {});
  }, [draft.name, edit]);

  // live availability
  useEffect(() => {
    if (edit || !slug) return setAvail(null);
    const t = setTimeout(() => {
      checkSlug(slug)
        .then((r) => setAvail(r.slug === slug && r.available ? { ok: true, msg: "Available" } : { ok: false, msg: r.slug !== slug ? `Will be saved as “${r.slug}”` : `Taken — try “${r.suggestion}”` }))
        .catch(() => setAvail(null));
    }, 250);
    return () => clearTimeout(t);
  }, [slug, edit]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (edit) {
        const r = await saveEdit(edit.slug, edit.token, draft, genome);
        setDone({ slug: r.slug, url: r.url, origin: location.origin, saved: true });
        onPublished({ slug: r.slug });
      } else {
        const r = await publish(draft, genome, slug);
        setDone({ ...r, origin: location.origin });
        onPublished({ slug: r.slug, editUrl: r.editUrl, token: r.editToken });
      }
    } catch (e) {
      const err = e as Error & { issues?: string[]; suggestion?: string };
      setError([err.message, ...(err.issues ?? []).slice(0, 3)].join(" "));
      if (err.suggestion) setSlug(err.suggestion);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    const live = `${done.origin}${done.url}`;
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5 pt-4" data-testid="published">
        <header>
          <p className="kicker">{"saved" in done ? "Saved" : "Published"}</p>
          <h1 className="display mt-2 text-[length:var(--fs-4)] leading-tight">{"saved" in done ? "Changes saved" : "You're live"}</h1>
        </header>
        <div className="panel flex flex-col gap-2 p-4">
          <span className="label">Your site</span>
          <div className="flex items-center gap-2">
            <a href={done.url} className="mono field flex-1 truncate no-underline" data-testid="live-url">
              {live}
            </a>
            <Copy value={live} label="site address" />
          </div>
        </div>
        {"editUrl" in done ? (
          <div className="flex flex-col gap-2 rounded-md border border-signal-ink/60 bg-paper-raised p-4 shadow-[inset_3px_0_0_var(--c-signal-ink)]">
            <span className="font-semibold">Save your private edit link</span>
            <p className="text-[length:var(--fs--1)] text-ink-muted">It's the only way to change or delete this site, and it's shown only once. Keep it somewhere safe, like a password manager.</p>
            <div className="flex items-center gap-2">
              <code className="mono field flex-1 truncate text-[length:var(--fs--1)]" data-testid="edit-url">
                {`${done.origin}${done.editUrl}`}
              </code>
              <Copy value={`${done.origin}${done.editUrl}`} label="edit link" />
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <a href={done.url} className="btn btn-primary btn-lg no-underline" data-testid="open-site">
            Open my site →
          </a>
          <button type="button" onClick={onBack} className="btn btn-outline btn-lg" data-testid="keep-editing">
            Keep editing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 pt-4">
      <header>
        <p className="kicker">Step 4 of 4</p>
        <h1 className="display mt-2 text-[length:var(--fs-4)] leading-tight">{edit ? "Save your changes" : "Choose your address"}</h1>
        <p className="mt-2 text-ink-muted">{edit ? "Your site updates as soon as you save." : "Anyone with the link can see your site. You'll get a private link to edit or delete it later."}</p>
      </header>
      {!edit ? (
        <div className="panel flex flex-col gap-1.5 p-4">
          <label htmlFor="slug" className="label">
            Address
          </label>
          <div className="flex h-[var(--ctl-h)] items-stretch overflow-hidden rounded-sm border border-rule bg-paper focus-within:border-signal-ink focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--c-signal)_28%,transparent)]">
            <span className="mono flex items-center border-r border-rule bg-ink/[0.04] px-3 text-[length:var(--fs--1)] text-ink-muted">{typeof location !== "undefined" ? location.host : ""}/u/</span>
            <input
              id="slug"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[length:var(--fs-0)] outline-none"
              value={slug}
              onFocus={() => (touched.current = true)}
              onChange={(e) => {
                touched.current = true;
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40));
              }}
              aria-describedby="slug-status"
              data-testid="slug"
            />
          </div>
          <p id="slug-status" aria-live="polite" className={avail?.ok === false ? "hint !text-signal-ink" : "hint"}>
            {avail?.msg ?? "3–40 lowercase letters, numbers and dashes."}
          </p>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="font-medium text-signal-ink">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onBack} className="btn btn-outline btn-lg">
          ← Design
        </button>
        <button type="button" onClick={submit} disabled={busy || (!edit && (!slug || avail?.ok === false))} className="btn btn-primary btn-lg flex-1" data-testid="publish">
          {busy ? "Publishing…" : edit ? "Save changes" : "Publish my site"}
        </button>
      </div>
      {edit ? (
        <div className="mt-4 border-t border-rule pt-4">
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm delete">
              <span className="text-[length:var(--fs--1)]">Delete /u/{edit.slug} for good?</span>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={async () => {
                  try {
                    await deleteSite(edit.slug, edit.token);
                    location.href = "/";
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
                data-testid="confirm-delete"
              >
                Yes, delete it
              </button>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(true)} data-testid="delete">
              Delete this site
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
