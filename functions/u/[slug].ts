/// <reference types="@cloudflare/workers-types" />
import { renderSitePage } from "../../src/server/api";
import { shell, storeFor, type Env } from "../../src/server/cf";

/**
 * /u/<slug>: published sites are the static /site shell with the person's data injected.
 * Anything not in the store falls through to static files (the prerendered showcase) or 404.
 */
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const slug = String(ctx.params.slug ?? "");
  const store = storeFor(ctx.env);
  if (/^[a-z0-9-]{1,64}$/.test(slug) && (await store.get(slug))) {
    const res = await renderSitePage(slug, await shell(ctx.env, ctx.request as unknown as Request), store, new URL(ctx.request.url).origin);
    if (res) return res as unknown as globalThis.Response;
  }
  return ctx.next();
};
