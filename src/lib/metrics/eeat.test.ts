/**
 * BACKLOG #27 — E-E-A-T metrics fail closed. A fake Semrush (no network, no units spent) pins the
 * parsing, the "not available (reason)" paths and that the key is never printed.
 */
import { describe, expect, it } from 'vitest';

import {
  collectEeat,
  formatEeat,
  AI_OVERVIEW_LABEL,
  parseRankHistory,
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
/**
 * The exact rows of the 2026-11-21 live connector run (carsi.com.au, au, date_desc) for
 * Dt,Or,FK52,FP52. Both AI columns come back headed "AI overview".
 */
const OK_HISTORY =
  'Date;Organic Keywords;AI overview;AI overview\r\n20261015;161;148;0\r\n20260915;110;94;0\r\n';
const H = 'Date;Organic Keywords;AI overview;AI overview';

describe('parse — Semrush CSV', () => {
  it('reads referring domains', () => {
    expect(parseReferringDomains({ status: 200, body: OK_BACKLINKS }, KEY)).toEqual({
      status: 'ok',
      value: 57,
    });
  });

  it('reads keyword growth and AI Overview SERPs newest-first whatever the row order', () => {
    const body = `${H}\n20260915;110;94;0\n20261015;161;148;0\n`;
    expect(parseRankHistory({ status: 200, body }, KEY, NOW)).toEqual({
      keywordGrowth: {
        status: 'ok',
        latest: 161,
        latestDate: '2026-10-15',
        previous: 110,
        previousDate: '2026-09-15',
        change: 51,
      },
      aiOverviewKeywords: {
        status: 'ok',
        label: AI_OVERVIEW_LABEL,
        latest: 148,
        rankingKeywords: 161,
        latestDate: '2026-10-15',
        previous: 94,
        previousDate: '2026-09-15',
        change: 54,
      },
      aiOverviewCitations: {
        status: 'ok',
        label: 'CARSI appears in 0 of 148 AI Overviews on its ranking keywords',
        latest: 0,
        aiOverviews: 148,
        latestDate: '2026-10-15',
        previous: 0,
        previousDate: '2026-09-15',
        change: 0,
      },
    });
  });

  it('the exact live fixture: a real 0 citations is printed as 0, not "not available"', async () => {
    const lines: string[] = [];
    await runEeatReport({
      env: ENV,
      fetchText: fakeSemrush({ backlinks: OK_BACKLINKS, history: OK_HISTORY }).fetchText,
      now: NOW,
      json: false,
      out: (l) => lines.push(l),
    });
    expect(lines).toContain(
      '  AI Overview citations: CARSI appears in 0 of 148 AI Overviews on its ranking keywords ' +
        '(2026-10-15); 0 on 2026-09-15, 0'
    );
  });

  it('FK52 and FP52 share a header name, so they are read by position', () => {
    const swapped = `${H}\n20261015;161;0;148\n20260915;110;0;94\n`;
    const r = parseRankHistory({ status: 200, body: swapped }, KEY, NOW);
    expect(r.aiOverviewKeywords).toMatchObject({ status: 'ok', latest: 0 });
    expect(r.aiOverviewCitations).toMatchObject({
      status: 'ok',
      latest: 148,
      label: 'CARSI appears in 148 of 0 AI Overviews on its ranking keywords',
    });
    const normal = parseRankHistory({ status: 200, body: OK_HISTORY }, KEY, NOW);
    expect(normal.aiOverviewCitations).toMatchObject({ latest: 0, aiOverviews: 148 });
  });

  it('a missing or reordered AI overview column is not available, never misread', () => {
    for (const body of [
      'Date;Organic Keywords\n20261015;161\n20260915;110\n',
      'Date;AI overview;Organic Keywords\n20261015;148;161\n20260915;94;110\n',
      'Date;Organic Keywords;AI overview\n20261015;161;148\n20260915;110;94\n',
      `${H};AI overview\n20261015;161;148;0;0\n20260915;110;94;0;0\n`,
    ]) {
      const r = parseRankHistory({ status: 200, body }, KEY, NOW);
      expect(r.keywordGrowth.status).toBe('not_available');
      expect(r.aiOverviewKeywords.status).toBe('not_available');
      expect(r.aiOverviewCitations.status).toBe('not_available');
    }
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
    const body = `${H}\n20260601;131;100;0\n20260501;119;90;0\n`;
    const r = parseRankHistory({ status: 200, body }, KEY, NOW);
    expect(r.aiOverviewKeywords.status).toBe('not_available');
    const kg = r.keywordGrowth;
    expect(kg.status === 'not_available' && kg.reason).toMatch(/older than 62 days/);
  });

  it('one snapshot cannot show growth', () => {
    const body = `${H}\n20261015;161;148;0\n`;
    expect(parseRankHistory({ status: 200, body }, KEY, NOW).keywordGrowth.status).toBe(
      'not_available'
    );
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

  it('with key and opt-in: two calls read all three metrics for the AU database', async () => {
    const f = fakeSemrush({ backlinks: OK_BACKLINKS, history: OK_HISTORY });
    const s = await collectEeat({ env: ENV, fetchText: f.fetchText, now: NOW });
    expect(f.calls).toHaveLength(2);
    expect(s.referringDomains).toEqual({ status: 'ok', value: 57 });
    expect(s.keywordGrowth).toMatchObject({ status: 'ok', latest: 161, change: 51 });
    expect(s.aiOverviewKeywords).toMatchObject({ status: 'ok', latest: 148, change: 54 });
    const history = new URL(f.calls[1]).searchParams;
    expect(history.get('database')).toBe('au');
    expect(history.get('export_columns')).toBe('Dt,Or,FK52,FP52');
    expect(s.aiOverviewCitations).toMatchObject({ status: 'ok', latest: 0, aiOverviews: 148 });
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
    expect(text).toMatch(/AI Overview SERPs: not available \(/);
    expect(text).toMatch(/AI Overview citations: not available \(/);
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
    expect(lines).toContain('  Organic keywords: 161 (2026-10-15) vs 110 (2026-09-15), +51');
  });

  it('pins the AI Overview wording: not a citation claim, in text and JSON', async () => {
    expect(AI_OVERVIEW_LABEL).toBe(
      'ranking keywords whose results page shows a Google AI Overview (does not mean CARSI is cited)'
    );
    const run = async (json: boolean) => {
      const lines: string[] = [];
      const code = await runEeatReport({
        env: ENV,
        fetchText: fakeSemrush({ backlinks: OK_BACKLINKS, history: OK_HISTORY }).fetchText,
        now: NOW,
        json,
        out: (l) => lines.push(l),
      });
      return { code, lines };
    };
    const text = await run(false);
    expect(text.code).toBe(0);
    expect(text.lines).toContain(
      '  AI Overview SERPs: 148 of 161 ranking keywords whose results page shows a Google AI ' +
        'Overview (does not mean CARSI is cited) (2026-10-15); 94 on 2026-09-15, +54'
    );
    const json = await run(true);
    const parsed = JSON.parse(json.lines[0]);
    expect(parsed.aiOverviewKeywords.label).toBe(AI_OVERVIEW_LABEL);
    expect(parsed.aiOverviewKeywords).toMatchObject({
      latest: 148,
      rankingKeywords: 161,
      change: 54,
    });
    expect(json.lines[0]).not.toMatch(/presence|cited in/i);
  });
});
