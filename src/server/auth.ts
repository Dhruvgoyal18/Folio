/** Edit tokens: 32 random bytes, shown once to the owner; only a SHA-256 hash is stored. */
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function newToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return b64url(b);
}

export async function hashToken(token: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return b64url(new Uint8Array(d));
}

/** Constant-time comparison of two equal-length strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifyToken(token: string | null | undefined, hash: string): Promise<boolean> {
  if (!token || token.length < 20 || token.length > 100) return false;
  return safeEqual(await hashToken(token), hash);
}

export function bearer(req: Request): string | null {
  const h = req.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
}
