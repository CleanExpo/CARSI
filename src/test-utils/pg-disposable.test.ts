import { describe, expect, it } from 'vitest';

import { assertPgSuiteAllowed, pgSuiteTarget } from './pg-disposable';

const LOCAL = 'postgresql://root:root@localhost:55432/carsi';

describe('pgSuiteTarget: the real-Postgres suites only ever run against a throwaway database', () => {
  it('runs on a loopback database explicitly marked disposable', () => {
    for (const url of [
      LOCAL,
      'postgresql://root:root@127.0.0.1:5432/carsi',
      'postgresql://root:root@[::1]:5432/carsi',
      'postgresql://root:root@LOCALHOST:5432/carsi',
    ]) {
      expect(pgSuiteTarget({ DATABASE_URL: url, CARSI_PG_DISPOSABLE: '1' })).toEqual({
        runnable: true,
        refusal: null,
      });
    }
  });

  it('refuses a loopback database that is not marked disposable', () => {
    for (const flag of [undefined, '', '0', 'true', 'yes', ' 1', '1 ']) {
      const target = pgSuiteTarget({ DATABASE_URL: LOCAL, CARSI_PG_DISPOSABLE: flag });
      expect(target.runnable).toBe(false);
      expect(target.refusal).toMatch(/CARSI_PG_DISPOSABLE=1/);
    }
  });

  it('refuses a non-loopback host even when the flag is set', () => {
    for (const url of [
      'postgresql://root:root@db.example.com:5432/carsi',
      'postgresql://root:root@localhost.example:5432/carsi',
      'postgresql://root:root@127.0.0.2:5432/carsi',
      'postgresql://root:root@postgres:5432/carsi',
      'postgresql://u:p@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres',
    ]) {
      const target = pgSuiteTarget({ DATABASE_URL: url, CARSI_PG_DISPOSABLE: '1' });
      expect(target.runnable).toBe(false);
      expect(target.refusal).toMatch(/not a loopback host/);
    }
  });

  it('refuses a DATABASE_URL it cannot parse, or one with no host', () => {
    for (const url of ['not a url', 'postgresql:///carsi?host=/tmp']) {
      const target = pgSuiteTarget({ DATABASE_URL: url, CARSI_PG_DISPOSABLE: '1' });
      expect(target.runnable).toBe(false);
      expect(target.refusal).not.toBeNull();
    }
  });

  it('skips quietly on a laptop with no database, but refuses in CI', () => {
    expect(pgSuiteTarget({})).toEqual({ runnable: false, refusal: null });
    expect(pgSuiteTarget({ DATABASE_URL: '  ' })).toEqual({ runnable: false, refusal: null });
    const ci = pgSuiteTarget({ CI: 'true', CARSI_PG_DISPOSABLE: '1' });
    expect(ci.runnable).toBe(false);
    expect(ci.refusal).toMatch(/CI=true/);
  });

  it('never reports a refusal as runnable', () => {
    const target = pgSuiteTarget({ DATABASE_URL: LOCAL });
    expect(target.runnable && target.refusal !== null).toBe(false);
  });
});

describe('assertPgSuiteAllowed (vitest.pg.config.ts globalSetup)', () => {
  it('throws the refusal before any suite is collected', () => {
    expect(() => assertPgSuiteAllowed({ DATABASE_URL: LOCAL })).toThrow(
      /Refusing to run the real-Postgres suites/
    );
    expect(() =>
      assertPgSuiteAllowed({
        DATABASE_URL: 'postgresql://root:root@db.example.com:5432/carsi',
        CARSI_PG_DISPOSABLE: '1',
      })
    ).toThrow(/Refusing to run the real-Postgres suites/);
    expect(() => assertPgSuiteAllowed({ CI: 'true' })).toThrow(
      /Refusing to run the real-Postgres suites/
    );
  });

  it('lets a disposable loopback database, or no database at all, through', () => {
    expect(() =>
      assertPgSuiteAllowed({ DATABASE_URL: LOCAL, CARSI_PG_DISPOSABLE: '1' })
    ).not.toThrow();
    expect(() => assertPgSuiteAllowed({})).not.toThrow();
  });
});
