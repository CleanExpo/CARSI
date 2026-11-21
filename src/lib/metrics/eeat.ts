/**
 * BACKLOG #27 — E-E-A-T authority metrics for the Monday pulse: referring domains, keyword growth
 * and AI-answer presence. An AUTHORITY metric, not RWR: it compounds slowly and must not be read
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
export type AiAnswerPresence = Metric<{ value: number }>;

export type EeatSnapshot = {
  domain: string;
  database: string;
  referringDomains: ReferringDomains;
  keywordGrowth: KeywordGrowth;
  aiAnswerPresence: AiAnswerPresence;
};

export type HttpText = { status: number; body: string };
export type FetchText = (url: string) => Promise<HttpText>;

export type EeatDeps = {
  env: Record<string, string | undefined>;
  fetchText: FetchText;
  now?: Date;
};

const missing = (reason: string): MetricMissing => ({ status: 'not_available', reason });

/** AI-answer presence has no automated source wired. Stated, not guessed. */
export const AI_PRESENCE_UNWIRED =
  'no automated source is wired: the Semrush AI-visibility / prompt-tracking data has no ' +
  'documented REST endpoint in this repo; check the target questions by hand and record the date';

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

/** `type=domain_rank_history`, `export_columns=Dt,Or` — monthly organic keyword snapshots. */
export function parseKeywordGrowth(res: HttpText, key: string, now: Date): KeywordGrowth {
  const err = describeSemrushError(res, key);
  if (err) return missing(err);
  const points: { date: string; count: number }[] = [];
  for (const row of dataRows(res.body)) {
    const date = isoDate(row[0]);
    const count = wholeNumber(row[1]);
    if (date === null || count === null) {
      return missing('Semrush keyword history had an unreadable row');
    }
    points.push({ date, count });
  }
  if (points.length < 2) {
    return missing('Semrush keyword history has fewer than two snapshots to compare');
  }
  points.sort((a, b) => b.date.localeCompare(a.date));
  const [latest, previous] = points;
  const ageDays = (now.getTime() - Date.parse(`${latest.date}T00:00:00Z`)) / 86_400_000;
  if (!(ageDays <= EEAT_MAX_SNAPSHOT_AGE_DAYS)) {
    return missing(
      `latest Semrush keyword snapshot is ${latest.date}, older than ${EEAT_MAX_SNAPSHOT_AGE_DAYS} days`
    );
  }
  return {
    status: 'ok',
    latest: latest.count,
    latestDate: latest.date,
    previous: previous.count,
    previousDate: previous.date,
    change: latest.count - previous.count,
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
    export_columns: 'Dt,Or',
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
  const base = { domain, database, aiAnswerPresence: missing(AI_PRESENCE_UNWIRED) };

  const key = deps.env.SEMRUSH_API_KEY?.trim() ?? '';
  if (!key) {
    const why = missing('SEMRUSH_API_KEY is not set, so Semrush cannot be read');
    return { ...base, referringDomains: why, keywordGrowth: why };
  }
  if (deps.env.SEMRUSH_ALLOW_METERED?.trim() !== '1') {
    const why = missing(
      'Semrush calls are metered; the founder has not set SEMRUSH_ALLOW_METERED=1 (SPEC row 27 stop-line)'
    );
    return { ...base, referringDomains: why, keywordGrowth: why };
  }

  const now = deps.now ?? new Date();
  const [rd, kw] = await Promise.all([
    safeFetch(deps.fetchText, backlinksUrl(key, domain)),
    safeFetch(deps.fetchText, keywordHistoryUrl(key, domain, database)),
  ]);
  return {
    ...base,
    referringDomains: isMissing(rd) ? rd : parseReferringDomains(rd, key),
    keywordGrowth: isMissing(kw) ? kw : parseKeywordGrowth(kw, key, now),
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
      (m) => `${m.latest} (${m.latestDate}) vs ${m.previous} (${m.previousDate}), ${signed(m.change)}`
    ),
    line('AI-answer presence', s.aiAnswerPresence, (m) => `${m.value}`),
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
  const all = [s.referringDomains, s.keywordGrowth, s.aiAnswerPresence];
  return all.every((m) => m.status === 'ok') ? 0 : 2;
}
