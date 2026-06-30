import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NextRequest } from 'next/server';

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: vi.fn(),
  getBearerAuthorizationFromRequest: vi.fn(),
}));

import {
  getBearerAuthorizationFromRequest,
  getSessionClaimsFromRequest,
} from '@/lib/server/auth-from-request';
import { authorizeWorkflowRequest, withForwardedAuth } from './workflow-auth';

const req = {} as NextRequest;
const claims = (role: string) => ({ sub: 'u1', email: 'u@x.io', full_name: 'U', role });

describe('authorizeWorkflowRequest (issue #12)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when there is no session', async () => {
    vi.mocked(getSessionClaimsFromRequest).mockResolvedValue(null);
    const r = await authorizeWorkflowRequest(req);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });

  it('returns 403 for a non-staff role (student)', async () => {
    vi.mocked(getSessionClaimsFromRequest).mockResolvedValue(claims('student'));
    const r = await authorizeWorkflowRequest(req);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it.each(['admin', 'instructor'])('allows %s and forwards the bearer token', async (role) => {
    vi.mocked(getSessionClaimsFromRequest).mockResolvedValue(claims(role));
    vi.mocked(getBearerAuthorizationFromRequest).mockReturnValue('Bearer tok');
    const r = await authorizeWorkflowRequest(req);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.authorization).toBe('Bearer tok');
  });
});

describe('withForwardedAuth', () => {
  it('adds the Authorization header when a token is present', () => {
    expect(withForwardedAuth('Bearer x', { 'Content-Type': 'application/json' })).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer x',
    });
  });

  it('omits Authorization when the token is null', () => {
    expect(withForwardedAuth(null, { 'Content-Type': 'application/json' })).toEqual({
      'Content-Type': 'application/json',
    });
  });
});
