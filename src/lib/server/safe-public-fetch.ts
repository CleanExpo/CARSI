/**
 * GP-634: fetch a member-supplied public web page without letting the server reach private or
 * internal addresses. A member types their own website URL, so every hop (including redirects)
 * is resolved and checked against private, loopback, link-local and metadata ranges before it
 * is requested. The check runs inside the socket's own DNS lookup, so the checked address is
 * the connected address. Bounded by a timeout, a redirect limit and a body size cap.
 */
import { lookup as dnsLookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
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

export type ResolvedAddress = { address: string; family: number };
export type Resolver = (hostname: string) => Promise<ResolvedAddress[]>;
type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | ResolvedAddress[],
  family?: number
) => void;
export type GuardedLookup = (
  hostname: string,
  options: { all?: boolean } | number | undefined,
  callback: LookupCallback
) => void;

const BLOCKED_CODE = 'ECARSI_PRIVATE_ADDRESS';

/**
 * The DNS lookup the socket itself uses. Every resolved address is checked here, at connect
 * time, so the address that was checked is the address that is connected to: a name that
 * changes its DNS answer between a check and a connect (DNS rebinding) cannot slip through.
 * Any private answer refuses the whole name.
 */
export function createGuardedLookup(
  resolve: Resolver,
  isAllowed: (ip: string) => boolean = (ip) => !isBlockedAddress(ip)
): GuardedLookup {
  return (hostname, options, callback) => {
    const wantAll = typeof options === 'object' && options !== null && options.all === true;
    resolve(hostname)
      .then((addrs) => {
        if (addrs.length === 0 || !addrs.every((a) => isAllowed(a.address))) {
          const err = new Error('not a public address') as NodeJS.ErrnoException;
          err.code = BLOCKED_CODE;
          callback(err, wantAll ? [] : '', 0);
          return;
        }
        if (wantAll) callback(null, addrs);
        else callback(null, addrs[0].address, addrs[0].family);
      })
      .catch((e: unknown) => callback(e as NodeJS.ErrnoException, wantAll ? [] : '', 0));
  };
}

const systemResolver: Resolver = async (hostname) =>
  (await dnsLookup(hostname, { all: true, verbatim: true })).map((a) => ({
    address: a.address,
    family: a.family,
  }));

type RawPage = {
  ok: boolean;
  status: number;
  location?: string | null;
  contentType?: string;
  body?: string;
  error?: string;
};

/**
 * One GET over node:http(s) with the guarded lookup and a body cap. No redirects. `deadlineMs`
 * is an absolute limit on the whole request (DNS, connect, headers and body): a site that
 * drips bytes slowly is cut off at the deadline, not merely when it goes idle.
 */
export function requestPage(
  url: URL,
  lookup: GuardedLookup,
  deadlineMs: number = TIMEOUT_MS
): Promise<RawPage> {
  const mod = url.protocol === 'https:' ? https : http;
  return new Promise((resolvePage) => {
    let settled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const open: { req?: http.ClientRequest } = {};
    // Every way out of a hop also tears down its socket: a redirect or capped body that keeps
    // streaming must not hold a connection open past the deadline (Codex P1, head 5dfe661f).
    const finish = (page: RawPage) => {
      if (!settled) {
        settled = true;
        timers.forEach(clearTimeout);
        resolvePage(page);
        open.req?.destroy();
      }
    };
    if (deadlineMs <= 0) {
      finish({ ok: false, status: 0, error: 'timed out' });
      return;
    }
    const req = mod.request(
      url,
      {
        method: 'GET',
        lookup: lookup as unknown as http.RequestOptions['lookup'],
        timeout: TIMEOUT_MS,
        headers: {
          'User-Agent': 'CARSI-Coaching-Marketing-Review/1.0',
          Accept: 'text/html,application/xhtml+xml',
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location ?? null;
        const contentType = String(res.headers['content-type'] ?? '');
        if (status >= 300 && status < 400) {
          res.destroy();
          finish({ ok: false, status, location });
          return;
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on('data', (chunk: Buffer) => {
          total += chunk.byteLength;
          if (total > MAX_BYTES) {
            res.destroy();
            finish({
              ok: true,
              status,
              contentType,
              body: Buffer.concat(chunks).toString('utf8'),
            });
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () =>
          finish({ ok: true, status, contentType, body: Buffer.concat(chunks).toString('utf8') })
        );
        res.on('error', () => finish({ ok: false, status, error: 'could not read the page' }));
      }
    );
    open.req = req;
    timers.push(
      setTimeout(() => {
        finish({ ok: false, status: 0, error: 'timed out' });
        req.destroy();
      }, deadlineMs)
    );
    req.on('timeout', () => {
      finish({ ok: false, status: 0, error: 'timed out' });
      req.destroy();
    });
    req.on('error', (err: NodeJS.ErrnoException) =>
      finish({
        ok: false,
        status: 0,
        error: err.code === BLOCKED_CODE ? 'not a public address' : 'could not connect',
      })
    );
    req.end();
  });
}

export async function fetchPublicPage(
  raw: string,
  lookup: GuardedLookup = createGuardedLookup(systemResolver),
  totalMs: number = TIMEOUT_MS
): Promise<SiteFetchResult> {
  const first = validatePublicHttpUrl(raw);
  if (!first.ok) return { ok: false, status: 0, html: null, error: first.reason };
  // One deadline for the whole fetch, shared by every redirect hop.
  const deadline = Date.now() + totalMs;
  let url = first.url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const page = await requestPage(url, lookup, deadline - Date.now());
    if (page.status >= 300 && page.status < 400) {
      if (!page.location) {
        return { ok: false, status: page.status, html: null, error: 'redirect without location' };
      }
      const next = validatePublicHttpUrl(new URL(page.location, url).toString());
      if (!next.ok) return { ok: false, status: page.status, html: null, error: next.reason };
      url = next.url;
      continue;
    }
    if (!page.ok) return { ok: false, status: page.status, html: null, error: page.error };
    if (page.status < 200 || page.status >= 300) {
      return { ok: false, status: page.status, html: null, error: `HTTP ${page.status}` };
    }
    if (page.contentType && !/html|xml/i.test(page.contentType)) {
      return { ok: false, status: page.status, html: null, error: 'not a web page' };
    }
    return { ok: true, status: page.status, html: page.body ?? '', finalUrl: url.toString() };
  }
  return { ok: false, status: 0, html: null, error: 'too many redirects' };
}
