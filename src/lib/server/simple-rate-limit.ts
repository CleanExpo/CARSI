/** Best-effort in-memory limiter for serverless (per-instance). Mitigates casual abuse only. */

const buckets = new Map<string, number[]>();

export function allowWithinWindow(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const times = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= max) return false;
  times.push(now);
  buckets.set(key, times);
  return true;
}

export function clientIpFromRequest(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}
