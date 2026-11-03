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

/** Expand any valid IPv6 text form (::, embedded dotted IPv4) to eight 16-bit groups. */
function expandIPv6(ip: string): number[] | null {
  let text = ip.toLowerCase().split('%')[0];
  const dotted = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const n = ipv4ToInt(dotted[1]);
    text = `${text.slice(0, -dotted[1].length)}${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0) return null;
  const groups = [...head, ...Array<string>(fill).fill('0'), ...tail].map((g) => parseInt(g, 16));
  if (groups.length !== 8 || groups.some((g) => Number.isNaN(g) || g < 0 || g > 0xffff)) {
    return null;
  }
  return groups;
}

function v4FromGroups(hi: number, lo: number): string {
  return [hi >>> 8, hi & 0xff, lo >>> 8, lo & 0xff].join('.');
}

export function isBlockedAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return blockedV4(ip);
  if (kind !== 6) return true;
  const g = expandIPv6(ip);
  if (!g) return true;
  // ::/64 covers ::, ::1, IPv4-compatible (::a.b.c.d), IPv4-mapped (::ffff:a.b.c.d) and
  // IPv4-translated (::ffff:0:a.b.c.d) in every text form. None is a public web host.
  if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true;
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
  if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site local (deprecated)
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  if (g[0] === 0x64 && g[1] === 0xff9b) return true; // NAT64
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  if (g[0] === 0x2001 && g[1] === 0x0000) return true; // Teredo
  if (g[0] === 0x2002) return blockedV4(v4FromGroups(g[1], g[2])); // 6to4 wraps an IPv4
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
