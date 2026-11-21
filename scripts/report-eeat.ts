/**
 * npm run report:eeat [-- --json]
 *
 * BACKLOG #27: E-E-A-T authority metrics for the Monday pulse (referring domains, organic keyword
 * growth, AI-answer presence). Needs SEMRUSH_API_KEY and SEMRUSH_ALLOW_METERED=1, both set by the
 * founder (Semrush calls spend API units). Exits 2 while any metric is not available; each one is
 * still printed with its reason. Logic and tests: src/lib/metrics/eeat.ts.
 */
import { runEeatReport } from '@/lib/metrics/eeat';

runEeatReport({
  env: process.env,
  json: process.argv.includes('--json'),
  fetchText: async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    return { status: res.status, body: await res.text() };
  },
  out: (line) => console.log(line),
})
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const kind = error instanceof Error ? error.name.replace(/[^A-Za-z]/g, '') : 'Error';
    console.error(`E-E-A-T not reported: the report crashed (${kind}).`);
    process.exitCode = 2;
  });
