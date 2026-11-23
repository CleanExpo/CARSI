/**
 * GP-767: the partner settlement CSV route is admin only and refuses an unknown partner.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  adminSession: vi.fn(),
  csv: vi.fn(),
}));

vi.mock('@/lib/admin/admin-session', () => ({ getAdminSessionOrNull: mocks.adminSession }));
vi.mock('@/lib/server/partner-referral-sales', () => ({ getPartnerReferralSalesCsv: mocks.csv }));

import { GET } from '../../../app/api/admin/partner-referrals/route';

function get(query: string) {
  return GET(new NextRequest(`https://carsi.com.au/api/admin/partner-referrals${query}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.adminSession.mockResolvedValue({ sub: 'admin-1' });
  mocks.csv.mockResolvedValue('date,partner\n');
});

describe('GET /api/admin/partner-referrals (GP-767)', () => {
  it('refuses a visitor who is not an admin', async () => {
    mocks.adminSession.mockResolvedValue(null);
    const res = await get('?partner=ccw');
    expect(res.status).toBe(401);
    expect(mocks.csv).not.toHaveBeenCalled();
  });

  it('refuses an unknown or missing partner', async () => {
    expect((await get('?partner=someone-else')).status).toBe(400);
    expect((await get('')).status).toBe(400);
    expect(mocks.csv).not.toHaveBeenCalled();
  });

  it('returns the CSV for ccw as a private download', async () => {
    const res = await get('?partner=ccw');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('ccw-referral-sales.csv');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(await res.text()).toBe('date,partner\n');
    expect(mocks.csv).toHaveBeenCalledWith('ccw');
  });

  it('returns 500, not an empty file, when the report fails', async () => {
    mocks.csv.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await get('?partner=ccw');
    expect(res.status).toBe(500);
  });
});
