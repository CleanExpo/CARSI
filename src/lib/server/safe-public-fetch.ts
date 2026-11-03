/**
 * GP-634: fetch a member-supplied public web page without letting the server reach private or
 * internal addresses. A member types their own website URL, so every hop (including redirects)
 * is resolved and checked against private, loopback, link-local and metadata ranges before it
 * is requested. Bounded by a timeout, a redirect limit and a body size cap.
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import type { SiteFetchResult } from '@/lib/coaching-portal/marketing-pack/types';

const MAX_REDIRECTS = 4;
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 8_000;

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function blockedV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  });
}

export function isBlockedAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return blockedV4(ip);
  if (kind !== 6) return true;
  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return blockedV4(mapped[1]);
  if (lower === '::' || lower === '::1') return true;
  const first = parseInt(lower.split(':')[0] || '0', 16);
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
  if ((first & 0xff00) === 0xff00) return true; // multicast
  if (lower.startsWith('64:ff9b:') || lower.startsWith('2001:db8')) return true;
  return false;
}

export function validatePublicHttpUrl(
  raw: string
): { ok: true; url: URL } | { ok: false; reason: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: 'empty' };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, reason: 'not a web address' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'only http and https addresses can be checked' };
  }
  if (url.username || url.password) return { ok: false, reason: 'address contains a login' };
  if (url.port && url.port !== '80' && url.port !== '443') {
    return { ok: false, reason: 'non-standard port' };
  }
  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal') ||
    host.endsWith('.local')
  ) {
    return { ok: false, reason: 'not a public address' };
  }
  if (isIP(host.replace(/^\[|\]$/g, '')) && isBlockedAddress(host.replace(/^\[|\]$/g, ''))) {
    return { ok: false, reason: 'not a public address' };
  }
  return { ok: true, url };
}

async function hostIsPublic(hostname: string): Promise<boolean> {
  const bare = hostname.replace(/^\[|\]$/g, '');
  if (isIP(bare)) return !isBlockedAddress(bare);
  try {
    const addrs = await lookup(bare, { all: true, verbatim: true });
    return addrs.length > 0 && addrs.every((a) => !isBlockedAddress(a.address));
  } catch {
    return false;
  }
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(chunks));
}

/**
 * Note: DNS is checked before each hop, then fetch resolves again. A host that flips its DNS
 * between the two lookups could still reach a private address; the fetch is GET-only, carries
 * no credentials and its body is only parsed as HTML, which limits what that could expose.
 */
export async function fetchPublicPage(raw: string): Promise<SiteFetchResult> {
  const first = validatePublicHttpUrl(raw);
  if (!first.ok) return { ok: false, status: 0, html: null, error: first.reason };
  let url = first.url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!(await hostIsPublic(url.hostname))) {
      return { ok: false, status: 0, html: null, error: 'not a public address' };
    }
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'User-Agent': 'CARSI-Coaching-Marketing-Review/1.0',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'TimeoutError' ? 'timed out' : 'could not connect';
      return { ok: false, status: 0, html: null, error: msg };
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location)
        return { ok: false, status: res.status, html: null, error: 'redirect without location' };
      const next = validatePublicHttpUrl(new URL(location, url).toString());
      if (!next.ok) return { ok: false, status: res.status, html: null, error: next.reason };
      url = next.url;
      continue;
    }
    if (!res.ok) return { ok: false, status: res.status, html: null, error: `HTTP ${res.status}` };
    const type = res.headers.get('content-type') ?? '';
    if (type && !/html|xml/i.test(type)) {
      return { ok: false, status: res.status, html: null, error: 'not a web page' };
    }
    const html = await readCapped(res);
    return { ok: true, status: res.status, html, finalUrl: url.toString() };
  }
  return { ok: false, status: 0, html: null, error: 'too many redirects' };
}
