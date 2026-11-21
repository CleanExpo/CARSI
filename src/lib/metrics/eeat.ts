/**
 * BACKLOG #27 — E-E-A-T authority metrics for the Monday pulse: referring domains, keyword growth
 * and AI-answer presence (as ranking keywords whose SERP shows an AI Overview, Semrush FK52). An AUTHORITY metric, not RWR: it compounds slowly and must not be read
 * as revenue movement.
 *
 * Fails closed exactly like the RWR report (`rwr-report.ts`): a metric that could not be read is
 * reported as "not available (reason)", never as 0 and never as an old number passed off as
 * current. "0 referring domains" claims a fact; "I could not look" is the truth.
 *
 * Source: the Semrush Analytics API, keyed by SEMRUSH_API_KEY. Semrush calls are METERED (API
 * units), and SPEC.md row 27 makes a metered call a stop-line, so nothing is fetched unless the
 * founder also sets SEMRUSH_ALLOW_METERED=1. The key is only ever placed in the request URL; no
 * URL, header or raw response body is printed.
 */

export const EEAT_DEFAULT_DOMAIN = 'carsi.com.au';
export const EEAT_DEFAULT_DATABASE = 'au';
/** A keyword snapshot older than this is stale and is not reported as the current figure. */
export const EEAT_MAX_SNAPSHOT_AGE_DAYS = 62;

export type MetricOk<T> = { status: 'ok' } & T;
export type MetricMissing = { status: 'not_available'; reason: string };
export type Metric<T> = MetricOk<T> | MetricMissing;

export type ReferringDomains = Metric<{ value: number }>;
export type KeywordGrowth = Metric<{
  latest: number;
  latestDate: string;
  previous: number;
  previousDate: string;
  change: number;
}>;
/**
 * Semrush FK52 (SERP feature 52 = "AI overview"): how many of the domain's ranking keywords have a
 * results page that shows a Google AI Overview. It does NOT say CARSI is cited in the overview
 * (that would be FP52), so it is always labelled with AI_OVERVIEW_LABEL.
 */
export type AiOverviewKeywords = Metric<{
  label: typeof AI_OVERVIEW_LABEL;
  latest: number;
  rankingKeywords: number;
  latestDate: string;
  previous: number;
  previousDate: string;
  change: number;
}>;

export type EeatSnapshot = {
  domain: string;
  database: string;
  referringDomains: ReferringDomains;
  keywordGrowth: KeywordGrowth;
  aiOverviewKeywords: AiOverviewKeywords;
};

export type HttpText = { status: number; body: string };
export type FetchText = (url: string) => Promise<HttpText>;

export type EeatDeps = {
  env: Record<string, string | undefined>;
  fetchText: FetchText;
  now?: Date;
};

const missing = (reason: string): MetricMissing => ({ status: 'not_available', reason });

export const AI_OVERVIEW_LABEL =
  'ranking keywords whose results page shows a Google AI Overview (does not mean CARSI is cited)';

/**
 * Semrush reports failures as HTTP 200 with a body like `ERROR 50 :: NOTHING FOUND`. Only that
 * stable code and phrase are surfaced, with any occurrence of the key removed first.
 */
export function describeSemrushError(res: HttpText, key: string): string | null {
  const body = key ? res.body.split(key).join('[key removed]') : res.body;
  const m = /ERROR\s+(\d+)\s*::\s*([A-Z][A-Z ]{0,60})/.exec(body);
  if (m) return `Semrush error ${m[1]} (${m[2].trim()})`;
  if (res.status < 200 || res.status >= 300) return `Semrush returned HTTP ${res.status}`;
  return null;
}

/** Semicolon CSV, header row first. Returns the data rows only. */
function dataRows(body: string): string[][] {
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.slice(1).map((l) => l.split(';').map((c) => c.trim()));
}

function wholeNumber(cell: string | undefined): number | null {
  if (cell === undefined || !/^\d+$/.test(cell)) return null;
  return Number(cell);
}

/** `type=backlinks_overview`, `export_columns=domains_num`. */
export function parseReferringDomains(res: HttpText, key: string): ReferringDomains {
  const err = describeSemrushError(res, key);
  if (err) return missing(err);
  const value = wholeNumber(dataRows(res.body)[0]?.[0]);
  if (value === null) return missing('Semrush backlinks response had no readable domains_num');
  return { status: 'ok', value };
}

/** Accepts YYYYMMDD or YYYY-MM-DD; returns YYYY-MM-DD or null. */
function isoDate(cell: string | undefined): string | null {
  const m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(cell ?? '');
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Header names Semrush returns for `export_columns=Dt,Or,FK52`, in that order. */
const RANK_HISTORY_HEADER = ['date', 'organic keywords', 'ai overview'];

/**
 * `type=domain_rank_history`, `export_columns=Dt,Or,FK52` — monthly snapshots of organic keyword
 * count and of ranking keywords whose SERP shows an AI Overview. One call feeds both metrics.
 * The header is checked so a renamed or reordered column is "not available", never misread.
 */
export function parseRankHistory(
  res: HttpText,
  key: string,
  now: Date
): { keywordGrowth: KeywordGrowth; aiOverviewKeywords: AiOverviewKeywords } {
  const both = (m: MetricMissing) => ({ keywordGrowth: m, aiOverviewKeywords: m });
  const err = describeSemrushError(res, key);
  if (err) return both(missing(err));
  const header = (res.body.split(/\r?\n/)[0] ?? '').split(';').map((c) => c.trim().toLowerCase());
  if (RANK_HISTORY_HEADER.some((h, i) => header[i] !== h)) {
    return both(
      missing('Semrush keyword history header was not Date;Organic Keywords;AI overview')
    );
  }
  const points: { date: string; count: number; aio: number }[] = [];
  for (const row of dataRows(res.body)) {
    const date = isoDate(row[0]);
    const count = wholeNumber(row[1]);
    const aio = wholeNumber(row[2]);
    if (date === null || count === null || aio === null) {
      return both(missing('Semrush keyword history had an unreadable row'));
    }
    points.push({ date, count, aio });
  }
  if (points.length < 2) {
    return both(missing('Semrush keyword history has fewer than two snapshots to compare'));
  }
  points.sort((a, b) => b.date.localeCompare(a.date));
  const [latest, previous] = points;
  const ageDays = (now.getTime() - Date.parse(`${latest.date}T00:00:00Z`)) / 86_400_000;
  if (!(ageDays <= EEAT_MAX_SNAPSHOT_AGE_DAYS)) {
    return both(
      missing(
        `latest Semrush keyword snapshot is ${latest.date}, older than ${EEAT_MAX_SNAPSHOT_AGE_DAYS} days`
      )
    );
  }
  const dates = { latestDate: latest.date, previousDate: previous.date };
  return {
    keywordGrowth: {
      status: 'ok',
      ...dates,
      latest: latest.count,
      previous: previous.count,
      change: latest.count - previous.count,
    },
    aiOverviewKeywords: {
      status: 'ok',
      label: AI_OVERVIEW_LABEL,
      ...dates,
      latest: latest.aio,
      rankingKeywords: latest.count,
      previous: previous.aio,
      change: latest.aio - previous.aio,
    },
  };
}

function backlinksUrl(key: string, domain: string): string {
  const q = new URLSearchParams({
    key,
    type: 'backlinks_overview',
    target: domain,
    target_type: 'root_domain',
    export_columns: 'domains_num',
  });
  return `https://api.semrush.com/analytics/v1/?${q}`;
}

function keywordHistoryUrl(key: string, domain: string, database: string): string {
  const q = new URLSearchParams({
    key,
    type: 'domain_rank_history',
    domain,
    database,
    display_limit: '2',
    display_sort: 'dt_desc',
    export_columns: 'Dt,Or,FK52',
  });
  return `https://api.semrush.com/?${q}`;
}

async function safeFetch(fetchText: FetchText, url: string): Promise<HttpText | MetricMissing> {
  try {
    return await fetchText(url);
  } catch (error) {
    // The error text could carry the URL, and the URL carries the key: report the type only.
    const kind = error instanceof Error ? error.name.replace(/[^A-Za-z]/g, '') : 'Error';
    return missing(`Semrush request failed (${kind})`);
  }
}

const isMissing = (x: HttpText | MetricMissing): x is MetricMissing =>
  (x as MetricMissing).status === 'not_available';

export async function collectEeat(deps: EeatDeps): Promise<EeatSnapshot> {
  const domain = deps.env.EEAT_DOMAIN?.trim() || EEAT_DEFAULT_DOMAIN;
  const database = deps.env.EEAT_SEMRUSH_DATABASE?.trim() || EEAT_DEFAULT_DATABASE;
  const base = { domain, database };

  const key = deps.env.SEMRUSH_API_KEY?.trim() ?? '';
  if (!key) {
    const why = missing('SEMRUSH_API_KEY is not set, so Semrush cannot be read');
    return { ...base, referringDomains: why, keywordGrowth: why, aiOverviewKeywords: why };
  }
  if (deps.env.SEMRUSH_ALLOW_METERED?.trim() !== '1') {
    const why = missing(
      'Semrush calls are metered; the founder has not set SEMRUSH_ALLOW_METERED=1 (SPEC row 27 stop-line)'
    );
    return { ...base, referringDomains: why, keywordGrowth: why, aiOverviewKeywords: why };
  }

  const now = deps.now ?? new Date();
  const [rd, kw] = await Promise.all([
    safeFetch(deps.fetchText, backlinksUrl(key, domain)),
    safeFetch(deps.fetchText, keywordHistoryUrl(key, domain, database)),
  ]);
  return {
    ...base,
    referringDomains: isMissing(rd) ? rd : parseReferringDomains(rd, key),
    ...(isMissing(kw)
      ? { keywordGrowth: kw, aiOverviewKeywords: kw }
      : parseRankHistory(kw, key, now)),
  };
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export function formatEeat(s: EeatSnapshot): string[] {
  const line = <T>(label: string, m: Metric<T>, ok: (v: MetricOk<T>) => string) =>
    `  ${label}: ${m.status === 'ok' ? ok(m) : `not available (${m.reason})`}`;
  return [
    `E-E-A-T authority (not RWR) — ${s.domain}, Semrush ${s.database} database`,
    line('Referring domains', s.referringDomains, (m) => `${m.value}`),
    line(
      'Organic keywords',
      s.keywordGrowth,
      (m) =>
        `${m.latest} (${m.latestDate}) vs ${m.previous} (${m.previousDate}), ${signed(m.change)}`
    ),
    line(
      'AI Overview SERPs',
      s.aiOverviewKeywords,
      (m) =>
        `${m.latest} of ${m.rankingKeywords} ${m.label} (${m.latestDate}); ` +
        `${m.previous} on ${m.previousDate}, ${signed(m.change)}`
    ),
  ];
}

/**
 * Exit codes: 0 only when all three metrics were read; 2 when any is not available. Every
 * metric is still printed (text or `--json`), so the pulse shows what was read and names the
 * blocker for the rest.
 */
export async function runEeatReport(
  deps: EeatDeps & { json: boolean; out: (line: string) => void }
): Promise<number> {
  const s = await collectEeat(deps);
  if (deps.json) deps.out(JSON.stringify(s));
  else for (const l of formatEeat(s)) deps.out(l);
  const all = [s.referringDomains, s.keywordGrowth, s.aiOverviewKeywords];
  return all.every((m) => m.status === 'ok') ? 0 : 2;
}
