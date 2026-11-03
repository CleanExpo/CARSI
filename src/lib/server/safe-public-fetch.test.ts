import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createGuardedLookup, requestPage } from './safe-public-fetch';

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
