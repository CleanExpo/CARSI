import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * GP-518: `GET /api/lms/courses/[slug]` had no handler and never has —
 * `git log --all` over the path returns empty. Requests fell through to the
 * `[[...path]]` catch-all's 503 stub, which the DigitalOcean edge rewrites to
 * an HTML 504. The masked 404 is the regression that matters: an unknown slug
 * returned 504, indistinguishable from a real outage.
 *
 * Vitest only collects `src/**`, so the handler is imported by relative path.
 */

vi.mock('@/lib/server/public-courses-list', () => ({
  getPublishedCourseDetailBySlugFromDatabase: vi.fn(),
}));

import { getPublishedCourseDetailBySlugFromDatabase } from '@/lib/server/public-courses-list';
import { GET } from '../../../app/api/lms/courses/[slug]/route';

const mockDetail = vi.mocked(getPublishedCourseDetailBySlugFromDatabase);
const req = {} as NextRequest;
const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe('GET /api/lms/courses/[slug] (GP-518)', () => {
  const originalDbUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://test';
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalDbUrl;
  });

  it('returns 404 — not a masked 504 — for a slug that does not exist', async () => {
    mockDetail.mockResolvedValue(null);
    const res = await GET(req, ctx('definitely-not-a-real-slug-xyz'));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ detail: 'Course not found' });
  });

  it('returns 200 with the course detail for a published slug', async () => {
    const course = { id: 'c1', slug: 'avian-influenza', title: 'Avian Influenza', price_aud: '149' };
    mockDetail.mockResolvedValue(course as never);
    const res = await GET(req, ctx('avian-influenza'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(course);
  });

  it('normalises the slug to lowercase before lookup', async () => {
    mockDetail.mockResolvedValue(null);
    await GET(req, ctx('  Avian-Influenza  '));
    expect(mockDetail).toHaveBeenCalledWith('avian-influenza');
  });

  it('returns 400 when the slug is empty', async () => {
    const res = await GET(req, ctx('   '));
    expect(res.status).toBe(400);
    expect(mockDetail).not.toHaveBeenCalled();
  });

  it('returns 503 when the database is not configured', async () => {
    delete process.env.DATABASE_URL;
    const res = await GET(req, ctx('avian-influenza'));
    expect(res.status).toBe(503);
    expect(mockDetail).not.toHaveBeenCalled();
  });

  it('returns 500 rather than hanging when the lookup throws', async () => {
    mockDetail.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(req, ctx('avian-influenza'));
    expect(res.status).toBe(500);
  });
});
