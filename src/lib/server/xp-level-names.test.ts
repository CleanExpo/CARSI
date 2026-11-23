import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ claims: vi.fn() }));
vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: mocks.claims }));

import { GET as levelRoute } from '../../../app/api/lms/gamification/me/level/route';
import { levelTitleFromLifetimeXp } from './leaderboard-xp';

/**
 * GP-775 (founder mission rule, 22/11/2026): XP levels must not sound like credentials.
 * Levels were "Apprentice", "Trainee", "Technician", "Senior Technician", "Specialist" and
 * "Master Restorer", shown beside public board entries. Those read as occupational or qualification
 * titles. XP measures engagement only, so its labels must say so.
 */
const CREDENTIAL_LIKE =
  /apprentice|trainee|technician|specialist|master|restorer|certified|qualified|accredited|licensed|expert|practitioner|professional|journeyman|graduate|tradesperson/i;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe('XP level names are engagement terms, never credential-like (GP-775)', () => {
  it('no level label at any XP matches a credential or occupational title', () => {
    const titles = new Set<string>();
    for (let xp = 0; xp <= 50_000; xp += 50) titles.add(levelTitleFromLifetimeXp(xp).level_title);
    expect(titles.size).toBe(6); // every level was reached
    for (const t of titles) expect(t).not.toMatch(CREDENTIAL_LIKE);
  });

  it('the no-database fallback uses the same level-1 label as the level table', async () => {
    vi.stubEnv('DATABASE_URL', '');
    mocks.claims.mockResolvedValue({ sub: 'learner' });
    const res = await levelRoute(new NextRequest('http://localhost/api/lms/gamification/me/level'));
    const body = (await res.json()) as { level_title: string; current_level: number };
    expect(body.current_level).toBe(1);
    expect(body.level_title).toBe(levelTitleFromLifetimeXp(0).level_title);
    expect(body.level_title).not.toMatch(CREDENTIAL_LIKE);
  });
});
