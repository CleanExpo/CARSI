// Proves db/ops/write/03 and 04 (GP-671) on an embedded Postgres before they reach carsi-db.
// Run: node scripts/publish-voiced-trailers.sql-check.mjs  (exits 1 on any failed expectation)
import { readFileSync } from 'node:fs';

import { PGlite } from '@electric-sql/pglite';

const d = JSON.parse(readFileSync('data/video/gp671-voiced-trailers.json', 'utf8')).trailers;
const fwd = readFileSync('db/ops/write/03-voice-course-trailers.sql', 'utf8');
const back = readFileSync('db/ops/write/04-revert-voiced-course-trailers.sql', 'utf8');
const db = new PGlite();
let failed = 0;
const expect = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

await db.exec('CREATE TABLE lms_courses (slug text primary key, meta jsonb)');
for (const [i, r] of d.entries()) {
  // course 0 was re-pointed by an admin since: the switch must leave it alone
  const url = i === 0 ? 'https://changed-by-admin.example/x.mp4' : r.silentUrl;
  await db.query('INSERT INTO lms_courses VALUES ($1, $2)', [r.slug, { introVideoUrl: url, keep: 1 }]);
}
await db.query('INSERT INTO lms_courses VALUES ($1, $2)', ['other-course', { introVideoUrl: 'https://x/y.mp4' }]);

const state = async () => {
  const { rows } = await db.query(
    `select
       count(*) filter (where meta->>'introVideoUrl' like '%/v17937%')::int as voiced,
       count(*) filter (where meta->>'introVideoUrl' like '%/v17829%')::int as silent,
       count(*) filter (where meta->>'keep' = '1')::int as other_keys_kept,
       count(*) filter (where slug = 'other-course' and meta->>'introVideoUrl' = 'https://x/y.mp4')::int as unrelated_untouched,
       count(*) filter (where slug = $1 and meta->>'introVideoUrl' like 'https://changed%')::int as admin_edit_kept
     from lms_courses`,
    [d[0].slug],
  );
  return rows[0];
};

expect('before', await state(), { voiced: 0, silent: 49, other_keys_kept: 50, unrelated_untouched: 1, admin_edit_kept: 1 });
await db.exec(fwd);
expect('after 03', await state(), { voiced: 49, silent: 0, other_keys_kept: 50, unrelated_untouched: 1, admin_edit_kept: 1 });
await db.exec(fwd);
expect('after 03 twice', await state(), { voiced: 49, silent: 0, other_keys_kept: 50, unrelated_untouched: 1, admin_edit_kept: 1 });
await db.exec(back);
expect('after 04', await state(), { voiced: 0, silent: 49, other_keys_kept: 50, unrelated_untouched: 1, admin_edit_kept: 1 });

// The row-count guard: a 51st row that would match must stop 03 and save nothing.
await db.exec(`ALTER TABLE lms_courses DROP CONSTRAINT lms_courses_pkey`);
await db.query('INSERT INTO lms_courses VALUES ($1, $2)', [d[1].slug, { introVideoUrl: d[1].silentUrl }]);
await db.query('UPDATE lms_courses SET meta = $2 WHERE slug = $1 AND meta ? $3', [d[0].slug, { introVideoUrl: d[0].silentUrl, keep: 1 }, 'keep']);
let refused = false;
try { await db.exec(fwd); } catch (e) { refused = /Stopped: 51 rows/.test(String(e.message)); }
expect('guard refuses 51 rows', refused, true);
expect('guard saved nothing', (await state()).voiced, 0);

console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
