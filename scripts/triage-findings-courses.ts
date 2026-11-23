/**
 * npm run triage:findings-courses [-- --all | --since YYYY-MM-DD] [--findings <file.md|file.json>] [--json]
 *
 * BACKLOG #24: the findings→course mapping step of the weekly triage (ENGINE.md). Reads the
 * BACKLOG "Discoveries" findings (default: those dated in the last 7 days) and prints which
 * catalogue courses and lessons each may affect, with a reason. A review report only: it edits
 * nothing, calls no API and uses no AI. Exits 2 with "not run (reason)" when the findings source
 * or the catalogue cannot be read; "no findings" (exit 0) means it read the source and found none.
 * Logic and tests: src/lib/triage/findings-course-map.ts.
 */
import { readFileSync } from 'node:fs';

import { runFindingsCourseTriage } from '@/lib/triage/findings-course-map';

try {
  process.exitCode = runFindingsCourseTriage({
    args: process.argv.slice(2),
    now: new Date(),
    readText: (path) => readFileSync(path, 'utf8'),
    out: (line) => console.log(line),
  });
} catch (error: unknown) {
  const kind = error instanceof Error ? error.name.replace(/[^A-Za-z]/g, '') : 'Error';
  console.error(`Findings→course mapping: not run (the triage crashed: ${kind}).`);
  process.exitCode = 2;
}
