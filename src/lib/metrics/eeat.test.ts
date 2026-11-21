/**
 * BACKLOG #27 — E-E-A-T metrics fail closed. A fake Semrush (no network, no units spent) pins the
 * parsing, the "not available (reason)" paths and that the key is never printed.
 */
import { describe, expect, it } from 'vitest';

import {
  collectEeat,
  formatEeat,
  parseKeywordGrowth,
  parseReferringDomains,
  runEeatReport,
  type FetchText,
} from './eeat';

const KEY = 'fake-semrush-key-1234567890';
const NOW = new Date('2026-11-21T00:00:00Z');
const ENV = { SEMRUSH_API_KEY: KEY, SEMRUSH_ALLOW_METERED: '1' };

/** Routes by report type; records every URL so tests can see what was (not) called. */
function fakeSemrush(bodies: { backlinks?: string; history?: string; status?: number }) {
  const calls: string[] = [];
  const fetchText: FetchText = async (url) => {
    calls.push(url);
    const type = new URL(url).searchParams.get('type');
    const body = type === 'backlinks_overview' ? bodies.backlinks : bodies.history;
    return { status: bodies.status ?? 200, body: body ?? 'ERROR 50 :: NOTHING FOUND' };
  };
  return { calls, fetchText };
}

const OK_BACKLINKS = 'domains_num\r\n57\r\n';
const OK_HISTORY = 'Date;Organic Keywords\r\n20261015;131\r\n20260915;119\r\n';

describe('parse — Semrush CSV', () => {
  it('reads referring domains', () => {
    expect(parseReferringDomains({ status: 200, body: OK_BACKLINKS }, KEY)).toEqual({
      status: 'ok',
      value: 57,
    });
  });

  it('reads keyword growth newest-first whatever the row order', () => {
    const body = 'Date;Organic Keywords\n20260915;119\n20261015;131\n';
    expect(parseKeywordGrowth({ status: 200, body }, KEY, NOW)).toEqual({
      status: 'ok',
      latest: 131,
      latestDate: '2026-10-15',
      previous: 119,
      previousDate: '2026-09-15',
      change: 12,
    });
  });

  it('a Semrush ERROR body is not available, never 0', () => {
    const r = parseReferringDomains({ status: 200, body: 'ERROR 50 :: NOTHING FOUND' }, KEY);
    expect(r).toEqual({ status: 'not_available', reason: 'Semrush error 50 (NOTHING FOUND)' });
  });

  it('an empty or non-numeric body is not available', () => {
    expect(parseReferringDomains({ status: 200, body: 'domains_num\n' }, KEY).status).toBe(
      'not_available'
    );
    expect(parseReferringDomains({ status: 200, body: 'domains_num\nn/a' }, KEY).status).toBe(
      'not_available'
    );
  });

  it('a stale latest snapshot is not passed off as current', () => {
    const body = 'Date;Organic Keywords\n20260601;131\n20260501;119\n';
    const r = parseKeywordGrowth({ status: 200, body }, KEY, NOW);
    expect(r.status).toBe('not_available');
    expect(r.status === 'not_available' && r.reason).toMatch(/older than 62 days/);
  });

  it('one snapshot cannot show growth', () => {
    const body = 'Date;Organic Keywords\n20261015;131\n';
    expect(parseKeywordGrowth({ status: 200, body }, KEY, NOW).status).toBe('not_available');
  });

  it('a non-2xx status is not available', () => {
    const r = parseReferringDomains({ status: 503, body: OK_BACKLINKS }, KEY);
    expect(r).toEqual({ status: 'not_available', reason: 'Semrush returned HTTP 503' });
  });
});

describe('collectEeat — fail closed before any metered call', () => {
  it('no key: nothing is fetched and every metric names the blocker', async () => {
    const f = fakeSemrush({ backlinks: OK_BACKLINKS, history: OK_HISTORY });
    const s = await collectEeat({ env: {}, fetchText: f.fetchText, now: NOW });
    expect(f.calls).toHaveLength(0);
    expect(s.referringDomains).toMatchObject({ status: 'not_available' });
    expect(formatEeat(s).join('\n')).toMatch(/SEMRUSH_API_KEY is not set/);
  });

  it('key without metered opt-in: nothing is fetched', async () => {
    const f = fakeSemrush({ backlinks: OK_BACKLINKS, history: OK_HISTORY });
    const s = await collectEeat({
      env: { SEMRUSH_API_KEY: KEY },
      fetchText: f.fetchText,
      now: NOW,
    });
    expect(f.calls).toHaveLength(0);
    expect(s.keywordGrowth.status === 'not_available' && s.keywordGrowth.reason).toMatch(
      /SEMRUSH_ALLOW_METERED/
    );
  });

  it('with key and opt-in: reads both Semrush metrics for the AU database', async () => {
    const f = fakeSemrush({ backlinks: OK_BACKLINKS, history: OK_HISTORY });
    const s = await collectEeat({ env: ENV, fetchText: f.fetchText, now: NOW });
    expect(f.calls).toHaveLength(2);
    expect(s.referringDomains).toEqual({ status: 'ok', value: 57 });
    expect(s.keywordGrowth).toMatchObject({ status: 'ok', latest: 131, change: 12 });
    expect(new URL(f.calls[1]).searchParams.get('database')).toBe('au');
    expect(s.aiAnswerPresence.status).toBe('not_available');
  });

  it('a thrown fetch error carrying the URL reports the type only', async () => {
    const fetchText: FetchText = async (url) => {
      throw new TypeError(`fetch failed for ${url}`);
    };
    const s = await collectEeat({ env: ENV, fetchText, now: NOW });
    expect(s.referringDomains).toEqual({
      status: 'not_available',
      reason: 'Semrush request failed (TypeError)',
    });
  });
});

describe('runEeatReport — output and exit code', () => {
  it('never prints the key, in text or JSON, on success or failure', async () => {
    for (const json of [false, true]) {
      for (const bodies of [
        { backlinks: OK_BACKLINKS, history: OK_HISTORY },
        { backlinks: `ERROR 120 :: WRONG KEY - ID PAIR ${KEY}`, history: `oops ${KEY}` },
      ]) {
        const lines: string[] = [];
        await runEeatReport({
          env: ENV,
          fetchText: fakeSemrush(bodies).fetchText,
          now: NOW,
          json,
          out: (l) => lines.push(l),
        });
        expect(lines.join('\n')).not.toContain(KEY);
      }
    }
  });

  it('exits 2 while any metric is not available, and prints no 0 for it', async () => {
    const lines: string[] = [];
    const code = await runEeatReport({
      env: {},
      fetchText: fakeSemrush({}).fetchText,
      now: NOW,
      json: false,
      out: (l) => lines.push(l),
    });
    expect(code).toBe(2);
    const text = lines.join('\n');
    expect(text).toMatch(/Referring domains: not available \(/);
    expect(text).toMatch(/Organic keywords: not available \(/);
    expect(text).toMatch(/AI-answer presence: not available \(/);
    expect(text).not.toMatch(/:\s*0\b/);
  });

  it('text output shows the dated keyword comparison', async () => {
    const lines: string[] = [];
    await runEeatReport({
      env: ENV,
      fetchText: fakeSemrush({ backlinks: OK_BACKLINKS, history: OK_HISTORY }).fetchText,
      now: NOW,
      json: false,
      out: (l) => lines.push(l),
    });
    expect(lines).toContain('  Referring domains: 57');
    expect(lines).toContain('  Organic keywords: 131 (2026-10-15) vs 119 (2026-09-15), +12');
  });
});
