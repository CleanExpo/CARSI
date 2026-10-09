import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBuildIdentity } from './build-identity';

const health = vi.hoisted(() => ({ getLiveness: vi.fn() }));
vi.mock('@/lib/server/health', () => health);
import { GET } from '../../../app/api/health/route';

const COMMIT = 'c3e767baa79c9a8e7cc9b86dfab29086a9974da8';

afterEach(() => vi.unstubAllEnvs());

describe('build identity', () => {
  it('reports the DigitalOcean runtime binding when configured', () => {
    expect(getBuildIdentity({ CARSI_BUILD_SHA: COMMIT.toUpperCase() })).toEqual({
      commit: COMMIT,
      source: 'CARSI_BUILD_SHA',
    });
  });

  it('accepts the existing Vercel deployment SHA', () => {
    expect(getBuildIdentity({ VERCEL_GIT_COMMIT_SHA: COMMIT })).toEqual({
      commit: COMMIT,
      source: 'VERCEL_GIT_COMMIT_SHA',
    });
  });

  it('prefers the explicit deployment binding when both valid sources exist', () => {
    expect(getBuildIdentity({ CARSI_BUILD_SHA: COMMIT, VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40) })).toEqual({
      commit: COMMIT,
      source: 'CARSI_BUILD_SHA',
    });
  });

  it('uses the Vercel SHA if the primary binding is invalid', () => {
    expect(getBuildIdentity({ CARSI_BUILD_SHA: '${_self.COMMIT_HASH}', VERCEL_GIT_COMMIT_SHA: COMMIT })).toEqual({
      commit: COMMIT,
      source: 'VERCEL_GIT_COMMIT_SHA',
    });
  });

  it.each([undefined, '', 'main', 'c3e767b', '${_self.COMMIT_HASH}', 'not-a-commit']) (
    'does not manufacture a revision from %s', (value) => {
      expect(getBuildIdentity({ CARSI_BUILD_SHA: value })).toEqual({ commit: null, source: null });
    },
  );

  it.each([200, 503])('reports identity without changing liveness status %i', async (status) => {
    vi.stubEnv('CARSI_BUILD_SHA', COMMIT);
    health.getLiveness.mockReturnValue({
      status: status === 200 ? 'healthy' : 'unhealthy',
      httpStatus: status,
      checks: { ai: status === 200 },
    });
    const response = await GET();
    expect(response.status).toBe(status);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await response.json()).build).toEqual({ commit: COMMIT, source: 'CARSI_BUILD_SHA' });
  });
});
