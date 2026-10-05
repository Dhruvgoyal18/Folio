/// <reference types="@cloudflare/workers-types" />
import { renderSitePage } from "../src/server/api";
import { shell, storeFor, type Env } from "../src/server/cf";

/** "/" is the Folio landing page, unless HOME_SITE names a site to show there (a personal deployment). */
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const home = ctx.env.HOME_SITE;
  if (!home) return ctx.next();
  const store = storeFor(ctx.env);
  if (await store.get(home)) {
    const res = await renderSitePage(home, await shell(ctx.env, ctx.request as unknown as Request), store, new URL(ctx.request.url).origin);
    if (res) return res as unknown as globalThis.Response;
  }
  // built-in (prerendered) site
  return ctx.env.ASSETS.fetch(new URL(`/u/${home}`, ctx.request.url).toString());
};
