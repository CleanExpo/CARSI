import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createGuardedLookup, fetchPublicPage, requestPage } from './safe-public-fetch';

let server: Server;
let port = 0;
let hits = 0;

beforeAll(async () => {
  server = createServer((_req, res) => {
    hits += 1;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><title>internal-marker</title></html>');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('DNS-pinned page request', () => {
  it('refuses to connect when the name resolves to a private address at connect time', async () => {
    hits = 0;
    const rebinding = createGuardedLookup(async () => [{ address: '127.0.0.1', family: 4 }]);
    const res = await requestPage(new URL(`http://rebind.test:${port}/`), rebinding);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('not a public address');
    expect(hits).toBe(0);
  });

  it('positive control: the same request connects when the lookup allows the address', async () => {
    hits = 0;
    const allowAll = createGuardedLookup(
      async () => [{ address: '127.0.0.1', family: 4 }],
      () => true
    );
    const res = await requestPage(new URL(`http://rebind.test:${port}/`), allowAll);
    expect(res.ok).toBe(true);
    expect(res.body).toContain('internal-marker');
    expect(hits).toBe(1);
  });

  it('a slow drip of bytes is cut off at the absolute deadline, not just an idle timeout', async () => {
    const drip = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      const t = setInterval(() => res.write('x'), 50);
      res.on('close', () => clearInterval(t));
    });
    await new Promise<void>((resolve) => drip.listen(0, '127.0.0.1', resolve));
    const dripPort = (drip.address() as AddressInfo).port;
    const allowAll = createGuardedLookup(
      async () => [{ address: '127.0.0.1', family: 4 }],
      () => true
    );
    const started = Date.now();
    const res = await requestPage(new URL(`http://drip.test:${dripPort}/`), allowAll, 400);
    const elapsed = Date.now() - started;
    await new Promise<void>((resolve) => drip.close(() => resolve()));
    expect(res.ok).toBe(false);
    expect(res.error).toBe('timed out');
    expect(elapsed).toBeLessThan(1500);
  });

  it('a DNS lookup that never answers is cut off at the deadline', async () => {
    const hang = createGuardedLookup(() => new Promise(() => {}));
    const started = Date.now();
    const res = await requestPage(new URL('http://hang.test/'), hang, 300);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('timed out');
    expect(Date.now() - started).toBeLessThan(1500);
  });

  it('the deadline covers every redirect hop together', async () => {
    const hang = createGuardedLookup(() => new Promise(() => {}));
    const started = Date.now();
    const res = await fetchPublicPage('https://hang.test/', hang, 300);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('timed out');
    expect(Date.now() - started).toBeLessThan(1500);
  });

  it('refuses when any resolved address is private (mixed answer)', async () => {
    hits = 0;
    const mixed = createGuardedLookup(async () => [
      { address: '1.1.1.1', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);
    const res = await requestPage(new URL(`http://mixed.test:${port}/`), mixed);
    expect(res.ok).toBe(false);
    expect(hits).toBe(0);
  });
});
