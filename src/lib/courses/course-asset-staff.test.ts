/**
 * GP-730: who besides the public may fetch a draft course file. Staff (an admin panel cookie, or
 * a verified session whose role opens the admin panel) may review drafts; a learner may not.
 * Kept apart from course-asset-access.test.ts because loading next/experimental/testing/server
 * there breaks jose signing and verification in the same worker.
 */
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_COOKIE_NAME, createAdminSessionToken } from '@/lib/admin/admin-auth';
import { signSessionToken } from '@/lib/auth/session-jwt';

import { courseAssetDecision } from './course-asset-access';

const mocks = vi.hoisted(() => ({ updateSession: vi.fn(), renamed: vi.fn(), lookup: vi.fn() }));
vi.mock('@/lib/api/middleware', () => ({ updateSession: mocks.updateSession }));
// GP-760: an admin token is staff only while the database agrees (isLmsSessionAdminNow, tested in
// auth-current-role-readers.test.ts). Here the database agrees with the token's role.
vi.mock('@/lib/server/lms-admin-now', () => ({
  isLmsSessionAdminNow: async (claims: { role?: string } | null) => claims?.role === 'admin',
}));
vi.mock('@/lib/seo/renamed-course-slugs', () => ({
  renamedCourseRedirect: mocks.renamed,
  lookupCourseSlugInDatabase: mocks.lookup,
}));

const { proxy } = await import('../../../proxy');

const DRAFT_FIELD_TOOL = '/courses/hard-floor-care/field-tools/floor-family-and-surface-layer-card.md';

const sessionCookie = async (role: string) =>
  `auth_token=${await signSessionToken({
    sub: `test-${role}`,
    email: `${role}@example.com`,
    full_name: 'Test User',
    role,
  })}`;

async function fetchThroughProxy(url: string, cookie?: string) {
  return proxy(
    new NextRequest(`https://carsi.com.au${url}`, { headers: cookie ? { cookie } : {} })
  );
}

beforeEach(() => {
  mocks.renamed.mockReset();
  mocks.renamed.mockResolvedValue(null);
  mocks.updateSession.mockReset();
  mocks.updateSession.mockImplementation(async () => NextResponse.next());
  mocks.lookup.mockReset();
  mocks.lookup.mockResolvedValue('unpublished');
});

describe('GP-730: draft course files for signed-in visitors', () => {
  it('an anonymous visitor gets 404', async () => {
    const res = await fetchThroughProxy(DRAFT_FIELD_TOOL);
    expect(res.status).toBe(404);
  });

  it('a signed-in student gets 404', async () => {
    const res = await fetchThroughProxy(DRAFT_FIELD_TOOL, await sessionCookie('student'));
    expect(res.status).toBe(404);
  });

  it('a forged or unsigned session cookie gets 404', async () => {
    const res = await fetchThroughProxy(
      DRAFT_FIELD_TOOL,
      `auth_token=not-a-jwt; ${ADMIN_COOKIE_NAME}=not-a-jwt`
    );
    expect(res.status).toBe(404);
  });

  it('an LMS admin session gets the draft file, marked private and never cached', async () => {
    const res = await fetchThroughProxy(DRAFT_FIELD_TOOL, await sessionCookie('admin'));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.updateSession).not.toHaveBeenCalled();
  });

  it('a valid admin panel cookie gets the draft file', async () => {
    const token = await createAdminSessionToken('admin@example.com');
    const res = await fetchThroughProxy(DRAFT_FIELD_TOOL, `${ADMIN_COOKIE_NAME}=${token}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('a published course file needs no session check and is not marked private', async () => {
    mocks.lookup.mockResolvedValue('published');
    const res = await fetchThroughProxy(
      '/courses/water-damage-restoration-fundamentals/field-tools/x.md'
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBeNull();
  });

  it('a traversal address is refused even for staff', async () => {
    const decision = await courseAssetDecision(
      '/courses/water-damage-restoration-fundamentals/%2e%2e/hard-floor-care/x.md',
      { lookup: async () => 'published', isStaff: async () => true }
    );
    expect(decision).toBe('refuse');
  });
});
