import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="app mx-auto flex min-h-[100svh] max-w-lg flex-col items-start justify-center gap-3 px-6">
      <p className="kicker">404 · Not found</p>
      <h1 className="display text-[length:var(--fs-4)] leading-tight">There's nothing at this address</h1>
      <p className="text-ink-muted">The link may be mistyped, or the site was deleted by its owner.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/" className="btn btn-primary no-underline">
          Go to Folio
        </Link>
        <Link href="/create" className="btn btn-outline no-underline">
          Create a portfolio
        </Link>
      </div>
    </main>
  );
}
