import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Prisma } from '@/generated/prisma/client';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn(), findMany: vi.fn(), claims: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: mocks.queryRaw, lmsUser: { findMany: mocks.findMany } },
}));
vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: mocks.claims }));

import { GET } from '../../../app/api/lms/gamification/leaderboard/route';
import { anonymousLeaderboardLabel, sanitizeLeaderboardDisplayName } from './leaderboard-xp';

/**
 * GP-775 (founder mission rules, 22/11/2026): leaderboards are optional, nobody is ranked
 * publicly without consent, and public entries never carry a real name or email.
 *
 * On main every learner with XP was ranked; the opt-in only changed the label, so nobody could
 * leave the board, and the API answered anyone without a sign-in.
 */

type FixtureUser = {
  id: string;
  email: string;
  fullName: string | null;
  /** Undefined models a learner who never touched the setting (the column default applies). */
  leaderboardShowDisplayName?: boolean;
  leaderboardDisplayName: string | null;
  xp: number;
};

const OPTED_IN_LABEL: FixtureUser = {
  id: '10000000-0000-4000-8000-00000000aaa1',
  email: 'alex.learner@example.test',
  fullName: 'Alexandra Kingsford',
  leaderboardShowDisplayName: true,
  leaderboardDisplayName: 'Alex K., QLD',
  xp: 40,
};
const OPTED_IN_NO_LABEL: FixtureUser = {
  id: '10000000-0000-4000-8000-00000000aaa2',
  email: 'casey.learner@example.test',
  fullName: 'Casey Nguyen',
  leaderboardShowDisplayName: true,
  leaderboardDisplayName: null,
  xp: 30,
};
/** Chose a label that is their own legal name: still never shown publicly. */
const OPTED_IN_REAL_NAME: FixtureUser = {
  id: '10000000-0000-4000-8000-00000000aaa3',
  email: 'jordan.learner@example.test',
  fullName: 'Jordan Pemberton',
  leaderboardShowDisplayName: true,
  leaderboardDisplayName: '  jordan   pemberton ',
  xp: 20,
};
const OPTED_OUT: FixtureUser = {
  id: '10000000-0000-4000-8000-00000000bbb1',
  email: 'bob.private@example.test',
  fullName: 'Robert Privately',
  leaderboardShowDisplayName: false,
  leaderboardDisplayName: 'Bob the Top Scorer',
  xp: 900,
};
const NEVER_ASKED: FixtureUser = {
  id: '10000000-0000-4000-8000-00000000bbb2',
  email: 'dana.default@example.test',
  fullName: 'Dana Default',
  leaderboardDisplayName: null,
  xp: 500,
};

let users: FixtureUser[] = [];

const optedIn = (u: FixtureUser) => u.leaderboardShowDisplayName ?? false; // schema @default(false)

function req(cookie = true) {
  const r = new NextRequest('http://localhost/api/lms/gamification/leaderboard');
  if (cookie) r.cookies.set('auth_token', 'synthetic-session');
  return r;
}

/** Honours the `where` clause the code sends, so removing the consent filter turns tests red. */
function findManyHonouringWhere(args: {
  where?: { id?: { in?: string[] }; leaderboardShowDisplayName?: boolean };
  select?: Record<string, boolean>;
}) {
  const where = args.where ?? {};
  const rows = users
    .filter((u) => !where.id?.in || where.id.in.includes(u.id))
    .filter(
      (u) =>
        where.leaderboardShowDisplayName === undefined ||
        optedIn(u) === where.leaderboardShowDisplayName
    )
    .map((u) => {
      const full: Record<string, unknown> = { ...u, leaderboardShowDisplayName: optedIn(u) };
      if (!args.select) return full;
      return Object.fromEntries(Object.keys(args.select).map((k) => [k, full[k]]));
    });
  return Promise.resolve(rows);
}

beforeEach(() => {
  users = [OPTED_IN_LABEL, OPTED_IN_NO_LABEL, OPTED_IN_REAL_NAME, OPTED_OUT, NEVER_ASKED];
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost/unused-no-connect');
  mocks.claims.mockResolvedValue({ sub: OPTED_IN_LABEL.id });
  mocks.findMany.mockImplementation(findManyHonouringWhere);
  mocks.queryRaw.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = Prisma.sql(strings, ...(values as Prisma.Sql[]));
    if (/date_trunc/.test(q.sql)) {
      return Promise.resolve([
        { start: new Date('2026-10-31T13:00:00Z'), end: new Date('2026-11-30T13:00:00Z') },
      ]);
    }
    if (/lms_lesson_progress/.test(q.sql)) {
      return Promise.resolve(users.map((u) => ({ student_id: u.id, xp: BigInt(u.xp) })));
    }
    return Promise.resolve([]);
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

async function board() {
  const res = await GET(req());
  expect(res.status).toBe(200);
  return (await res.json()) as {
    items: Array<Record<string, unknown> & { rank: number; display_name: string }>;
  };
}

describe('leaderboard consent (GP-775)', () => {
  it('an opted-out learner never appears, even with the highest XP and a chosen label', async () => {
    const body = await board();
    const names = body.items.map((i) => i.display_name);
    expect(names).toContain('Alex K., QLD'); // the board really rendered opted-in entries
    expect(names).not.toContain('Bob the Top Scorer');
    expect(names).not.toContain(anonymousLeaderboardLabel(OPTED_OUT.id));
    expect(body.items.map((i) => i.total_xp)).not.toContain(OPTED_OUT.xp);
    // Ranks are contiguous from 1: an excluded learner leaves no gap that reveals them.
    expect(body.items.map((i) => i.rank)).toEqual(body.items.map((_, n) => n + 1));
    expect(body.items[0].display_name).toBe('Alex K., QLD');
  });

  it('the default is opted out: a learner who never chose is not ranked', async () => {
    const schema = readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
    expect(schema).toMatch(/leaderboardShowDisplayName\s+Boolean\s+@default\(false\)/);

    const body = await board();
    expect(body.items.map((i) => i.display_name)).not.toContain(
      anonymousLeaderboardLabel(NEVER_ASKED.id)
    );
    expect(body.items.map((i) => i.total_xp)).not.toContain(NEVER_ASKED.xp);
    expect(body.items).toHaveLength(3);
  });

  it('opting out removes the learner on the next read', async () => {
    expect((await board()).items.map((i) => i.display_name)).toContain('Alex K., QLD');
    users = users.map((u) =>
      u.id === OPTED_IN_LABEL.id ? { ...u, leaderboardShowDisplayName: false } : u
    );
    const after = (await board()).items;
    expect(after.map((i) => i.display_name)).not.toContain('Alex K., QLD');
    // Not merely relabelled: the learner is off the board entirely.
    expect(after.map((i) => i.display_name)).not.toContain(
      anonymousLeaderboardLabel(OPTED_IN_LABEL.id)
    );
    expect(after.map((i) => i.total_xp)).not.toContain(OPTED_IN_LABEL.xp);
  });

  it('no real name or email appears in the API response', async () => {
    const res = await GET(req());
    const raw = await res.text();
    for (const u of users) {
      expect(raw).not.toContain(u.email);
      if (u.fullName) expect(raw.toLowerCase()).not.toContain(u.fullName.toLowerCase());
    }
    expect(raw).not.toMatch(/@/);
    const body = JSON.parse(raw) as { items: Array<Record<string, unknown>> };
    expect(body.items.length).toBeGreaterThan(0);
    for (const item of body.items) {
      expect(Object.keys(item).sort()).toEqual(
        ['current_level', 'display_name', 'level_title', 'rank', 'total_xp'].sort()
      );
    }
    // A label equal to the learner's own legal name falls back to the anonymous label.
    expect(body.items.map((i) => i.display_name)).toContain(
      anonymousLeaderboardLabel(OPTED_IN_REAL_NAME.id)
    );
  });

  it('with nobody opted in, the board is empty', async () => {
    users = [OPTED_OUT, NEVER_ASKED];
    expect((await board()).items).toEqual([]);
  });

  it('reports the board unavailable, not empty, when no database is configured', async () => {
    vi.stubEnv('DATABASE_URL', '');
    const body = (await (await GET(req())).json()) as { items: unknown[]; unavailable?: boolean };
    expect(body.items).toEqual([]);
    expect(body.unavailable).toBe(true);
  });

  it('requires a signed-in learner', async () => {
    mocks.claims.mockResolvedValue(null);
    const res = await GET(req(false));
    expect(res.status).toBe(401);
    expect(mocks.queryRaw).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});

/**
 * Review r1 (discovery) of 10a4e46e: a chosen label could still carry identity. A full-width
 * at sign (U+FF20) passed the ASCII '@' check, and a legal name with punctuation, accents or an
 * extra word passed the case/whitespace comparison. The label rule now compares Unicode-folded,
 * letters-only forms and rejects any at-sign look-alike.
 */
describe('a chosen label never carries an email or the legal name (GP-775 r1)', () => {
  const variant = (n: number, fullName: string, label: string): FixtureUser => ({
    id: `10000000-0000-4000-8000-0000000cc${String(n).padStart(3, '0')}`,
    email: `variant${n}@example.test`,
    fullName,
    leaderboardShowDisplayName: true,
    leaderboardDisplayName: label,
    xp: 10 + n,
  });

  it.each([
    ['a full-width at sign', 'Jordan Pemberton', 'jordan＠example.com'],
    ['a small at sign', 'Jordan Pemberton', 'jordan﹫example.com'],
    ['the legal name with a trailing full stop', 'Jordan Pemberton', 'Jordan Pemberton.'],
    ['the legal name with a hyphen', 'Mary Jane Watts', 'Mary-Jane Watts'],
    ['the legal name without its accent', 'Zoë Hart', 'Zoe Hart'],
    ['the legal name inside a longer label', 'Jordan Pemberton', 'Jordan Pemberton (QLD)'],
    ['the legal name in full-width letters', 'Jordan Pemberton', 'Ｊordan Pemberton'],
  ])('%s falls back to the anonymous label', async (_label, fullName, label) => {
    const u = variant(1, fullName, label);
    users = [u, OPTED_IN_LABEL];
    const res = await GET(req());
    const raw = await res.text();
    const body = JSON.parse(raw) as { items: Array<{ display_name: string }> };
    const names = body.items.map((i) => i.display_name);
    expect(names).toContain('Alex K., QLD'); // the board really rendered
    expect(names).toContain(anonymousLeaderboardLabel(u.id));
    expect(names).not.toContain(label);
    expect(raw.normalize('NFKC')).not.toMatch(/[@﹫＠]/);
  });

  it('the shared save-time sanitiser rejects at-sign look-alikes too', () => {
    // PATCH /api/lms/auth/me stores labels through this same function.
    expect(sanitizeLeaderboardDisplayName('jordan\uff20example.com')).toBeNull();
    expect(sanitizeLeaderboardDisplayName('jordan\ufe6bexample.com')).toBeNull();
    expect(sanitizeLeaderboardDisplayName('Alex K., QLD')).toBe('Alex K., QLD');
  });

  it('keeps an ordinary chosen label that is not the legal name', async () => {
    users = [variant(2, 'Alexandra Kingsford', 'Alex K., QLD')];
    expect((await board()).items.map((i) => i.display_name)).toEqual(['Alex K., QLD']);
  });
});
