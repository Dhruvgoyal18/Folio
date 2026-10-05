/// <reference types="@cloudflare/workers-types" />
import { handleApi } from "../../src/server/api";
import { storeFor, type Env } from "../../src/server/cf";

/** Cloudflare Pages Function: every /api/* route (extract, sites, slug, chat). */
export const onRequest: PagesFunction<Env> = (ctx) => handleApi(ctx.request as unknown as Request, ctx.env, { store: storeFor(ctx.env) }) as unknown as Promise<globalThis.Response>;
