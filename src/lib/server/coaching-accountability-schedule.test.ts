/**
 * GP-677 — the daily accountability run is actually scheduled, by exactly one workflow.
 * The schedule is a GitHub Actions workflow (the same pattern as the recert reminders), so it
 * needs no Vercel or DigitalOcean cron. It was added on main in c9facd55; this test keeps it
 * there and stops a second copy being added. It calls the real cron route with the shared
 * CRON_SECRET; the route itself stays fail-closed (503 with no secret, 401 with a wrong one)
 * and does nothing while the accountability feature flag is off.
 */
import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO = process.cwd();
const WORKFLOWS = path.join(REPO, '.github/workflows');
const WORKFLOW = path.join(WORKFLOWS, 'notifications-coaching-accountability.yml');
const ROUTE = path.join(REPO, 'app/api/cron/coaching-accountability/route.ts');

describe('coaching accountability schedule', () => {
  it('has exactly one workflow that calls the accountability cron route', () => {
    expect(fs.existsSync(WORKFLOW)).toBe(true);
    const callers = fs
      .readdirSync(WORKFLOWS)
      .filter((f) => /\.ya?ml$/.test(f))
      .filter((f) =>
        fs
          .readFileSync(path.join(WORKFLOWS, f), 'utf8')
          .includes('/api/cron/coaching-accountability')
      );
    expect(callers).toEqual(['notifications-coaching-accountability.yml']);
  });

  it('runs once a day on a fixed UTC schedule and can be run by hand', () => {
    const wf = fs.readFileSync(WORKFLOW, 'utf8');
    const crons = [...wf.matchAll(/-\s*cron:\s*'([^']+)'/g)].map((m) => m[1]);
    expect(crons.length).toBeGreaterThanOrEqual(1);
    for (const c of crons) {
      // minute hour * * *  → daily
      expect(c).toMatch(/^\d{1,2} \d{1,2} \* \* \*$/);
    }
    expect(wf).toMatch(/^\s*workflow_dispatch:/m);
  });

  it('calls the accountability cron route on the production site with the cron secret', () => {
    const wf = fs.readFileSync(WORKFLOW, 'utf8');
    expect(wf).toContain('https://carsi.com.au/api/cron/coaching-accountability');
    expect(wf).toContain('Authorization: Bearer ${{ secrets.CRON_SECRET }}');
    // -f makes a 401/503 fail the job, so a broken secret is visible rather than silent.
    expect(wf).toMatch(/curl -fsS/);
  });

  it('points at a route that exists and is guarded by the cron secret', () => {
    const route = fs.readFileSync(ROUTE, 'utf8');
    expect(route).toMatch(/export async function GET/);
    expect(route).toMatch(/const denied = requireCron\(request\);\s*if \(denied\) return denied;/);
  });
});
