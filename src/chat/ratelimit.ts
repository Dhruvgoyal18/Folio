/** Sliding-window limiter, per isolate. Pair with Cloudflare's Rate Limiting binding in production. */
export class MemoryRateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private perMinute: number, private perDay: number, private now: () => number = Date.now) {}

  check(key: string): { ok: true } | { ok: false; retryAfter: number } {
    const t = this.now();
    const day = 86_400_000;
    const list = (this.hits.get(key) ?? []).filter((x) => t - x < day);
    const lastMinute = list.filter((x) => t - x < 60_000);
    if (lastMinute.length >= this.perMinute) {
      return { ok: false, retryAfter: Math.ceil((60_000 - (t - lastMinute[0]!)) / 1000) };
    }
    if (list.length >= this.perDay) return { ok: false, retryAfter: Math.ceil((day - (t - list[0]!)) / 1000) };
    list.push(t);
    this.hits.set(key, list);
    if (this.hits.size > 5000) this.hits.delete(this.hits.keys().next().value!);
    return { ok: true };
  }
}
