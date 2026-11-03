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

describe('redirect hops (Codex P1, head 5dfe661f)', () => {
  it('closes a redirect response that keeps streaming, instead of leaving the socket open', async () => {
    let closed = false;
    const srv = createServer((req, res) => {
      req.socket.on('close', () => {
        closed = true;
      });
      res.writeHead(302, { Location: 'http://next.test/', 'Content-Type': 'text/html' });
      const t = setInterval(() => res.write('x'), 25);
      res.on('close', () => clearInterval(t));
    });
    await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));
    const srvPort = (srv.address() as AddressInfo).port;
    const allowAll = createGuardedLookup(
      async () => [{ address: '127.0.0.1', family: 4 }],
      () => true
    );
    const res = await requestPage(new URL(`http://redirect.test:${srvPort}/`), allowAll, 150);
    expect(res.status).toBe(302);
    await new Promise((resolve) => setTimeout(resolve, 350));
    srv.closeAllConnections();
    await new Promise<void>((resolve) => srv.close(() => resolve()));
    expect(closed).toBe(true);
  });
});

describe('oversized pages (Codex P1, head 06f8e812)', () => {
  it('a page over the size cap is reported unreadable, never reviewed from a cut-off prefix', async () => {
    const big = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        `<html><!--${'x'.repeat(1_600_000)}--><head><title>Plumber Mackay</title></head><body><h1>Mackay</h1></body></html>`
      );
    });
    await new Promise<void>((resolve) => big.listen(0, '127.0.0.1', resolve));
    const bigPort = (big.address() as AddressInfo).port;
    const allowAll = createGuardedLookup(
      async () => [{ address: '127.0.0.1', family: 4 }],
      () => true
    );
    const res = await requestPage(new URL(`http://big.test:${bigPort}/`), allowAll, 5000);
    await new Promise<void>((resolve) => big.close(() => resolve()));
    expect(res.ok).toBe(false);
    expect(res.error).toBe('page too large to check');
    expect(res.body).toBeUndefined();
  });
});
