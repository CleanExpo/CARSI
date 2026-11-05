import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-681 — /api/health/deep in the single-app (monolith) deployment.
 *
 * CARSI has no separate backend: getUpstreamBaseUrl() is null and
 * getBackendOrigin() is ''. The deep check used to fetch the bare relative URL
 * '/health', which Node's fetch rejects, so production always answered 503.
 * With no upstream it must probe the real database (as /api/health/ready does)
 * and report the backend as unchecked rather than failed.
 */

const mock = vi.hoisted(() => ({ probeDatabase: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/server/health', () => ({ probeDatabase: mock.probeDatabase }));
vi.stubGlobal('fetch', mock.fetch);

import { GET } from '../../../app/api/health/deep/route';

beforeEach(() => {
  mock.probeDatabase.mockReset();
  mock.fetch.mockReset();
  mock.fetch.mockRejectedValue(new TypeError('Failed to parse URL from /health'));
});

describe('GET /api/health/deep (no upstream configured)', () => {
  it('is 200 healthy when the database probe passes', async () => {
    mock.probeDatabase.mockResolvedValue(true);
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.dependencies.database.status).toBe('healthy');
    expect(body.dependencies.backend.status).toBe('unchecked');
    expect(body.summary.failed).toBe(0);
    expect(mock.fetch).not.toHaveBeenCalled();
  });

  it('is 503 unhealthy when the database probe fails', async () => {
    mock.probeDatabase.mockResolvedValue(false);
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.status).toBe('unhealthy');
    expect(body.dependencies.database.status).toBe('unhealthy');
    expect(body.dependencies.backend.status).toBe('unchecked');
    expect(mock.fetch).not.toHaveBeenCalled();
  });
});
