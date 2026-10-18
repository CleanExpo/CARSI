#!/usr/bin/env node
/**
 * Two-session lock proof for the review-request send transaction (release-gate review r6).
 *
 * The send holds FOR SHARE locks on the switch row, the enrolment row and the learner row (and
 * FOR UPDATE on its ledger row) for the whole provider call. This script proves, on a REAL
 * PostgreSQL server with two connections, that switching OFF, unsubscribing and revoking all
 * conflict with those locks: while session A holds them, session B's writes cannot commit; once
 * A commits, they can. It also proves the other order: an OFF committed first is seen by A.
 *
 * Needs a DISPOSABLE PostgreSQL 13+: REVIEW_LOCK_TEST_DATABASE_URL. It works inside its own new
 * schema and drops it at the end. Non-local hosts are refused unless
 * REVIEW_LOCK_TEST_ALLOW_REMOTE=1. Never point this at production.
 *
 * Exit 0 = proven; 1 = a lock did not conflict as required; 2 = UNPROVEN (no database given).
 */
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import pg from 'pg';

const url = process.env.REVIEW_LOCK_TEST_DATABASE_URL;
if (!url) {
  console.error('UNPROVEN: set REVIEW_LOCK_TEST_DATABASE_URL to a disposable PostgreSQL to run the two-session lock proof.');
  process.exit(2);
}
const host = new URL(url).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(host) && process.env.REVIEW_LOCK_TEST_ALLOW_REMOTE !== '1') {
  console.error(`Refusing non-local host ${host}. This script creates and drops a schema; use a disposable database.`);
  process.exit(2);
}

const schema = `review_lock_test_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
const a = new pg.Client({ connectionString: url });
const b = new pg.Client({ connectionString: url });
let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) failed += 1;
};
async function blocked(client, sql, params = []) {
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '500ms'");
    await client.query(sql, params);
    await client.query('ROLLBACK');
    return false;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    return e.code === '55P03'; // lock_not_available
  }
}

try {
  await a.connect();
  await b.connect();
  await a.query(`CREATE SCHEMA "${schema}"`);
  for (const c of [a, b]) await c.query(`SET search_path TO "${schema}", public`);
  const dir = join(process.cwd(), 'prisma/migrations');
  for (const m of readdirSync(dir).filter((d) => /^\d/.test(d)).sort()) {
    await a.query(readFileSync(join(dir, m, 'migration.sql'), 'utf8'));
  }

  const [learner, inst, course, enrolment, token] = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  await a.query("INSERT INTO lms_users (id, email, hashed_password) VALUES ($1, 'learner@example.com', 'x'), ($2, 'inst@example.com', 'x')", [learner, inst]);
  await a.query("INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud) VALUES ($1, 'c', 'C', $2, 'published', 0)", [course, inst]);
  await a.query('UPDATE lms_review_request_settings SET enabled = true WHERE id = 1');
  await a.query("INSERT INTO lms_enrollments (id, student_id, course_id, status, completed_at) VALUES ($1, $2, $3, 'completed', now() - interval '5 days')", [enrolment, learner, course]);
  await a.query("UPDATE lms_review_request_emails SET status = 'pending', claim_token = $2, send_attempted_at = now() WHERE enrollment_id = $1", [enrolment, token]);

  // Session A: the send transaction's locked reads, held as during the provider call.
  await a.query('BEGIN');
  await a.query('SELECT "enabled" FROM "lms_review_request_settings" WHERE "id" = 1 FOR SHARE');
  await a.query('SELECT "status", "completed_at" FROM "lms_enrollments" WHERE "id" = $1::uuid FOR SHARE', [enrolment]);
  await a.query('SELECT "email", "full_name", "email_opt_out", "is_active" FROM "lms_users" WHERE "id" = $1::uuid FOR SHARE', [learner]);
  await a.query('SELECT "status", "claim_token", "completion_seq" FROM "lms_review_request_emails" WHERE "enrollment_id" = $1::uuid FOR UPDATE', [enrolment]);

  check(await blocked(b, 'SELECT "enabled" FROM "lms_review_request_settings" WHERE "id" = 1 FOR UPDATE'), 'switch OFF (toggle FOR UPDATE) waits while a send holds its locks');
  check(await blocked(b, 'UPDATE lms_users SET email_opt_out = true WHERE id = $1', [learner]), 'unsubscribe waits while a send holds its locks');
  check(await blocked(b, "UPDATE lms_enrollments SET status = 'revoked', completed_at = NULL WHERE id = $1", [enrolment]), 'revocation waits while a send holds its locks');
  check(await blocked(b, "UPDATE lms_enrollments SET status = 'active' WHERE id = $1", [enrolment]), 'status-only revocation waits while a send holds its locks');

  await a.query("UPDATE lms_review_request_emails SET status = 'sent', claim_token = NULL WHERE enrollment_id = $1", [enrolment]);
  await a.query('COMMIT');
  check(!(await blocked(b, 'UPDATE lms_users SET email_opt_out = true WHERE id = $1', [learner])), 'after the send commits, unsubscribe proceeds');

  // Other order: OFF commits first; the send's locked read then sees it.
  await b.query('UPDATE lms_review_request_settings SET enabled = false WHERE id = 1');
  await a.query('BEGIN');
  const sw = await a.query('SELECT "enabled" FROM "lms_review_request_settings" WHERE "id" = 1 FOR SHARE');
  await a.query('ROLLBACK');
  check(sw.rows[0].enabled === false, 'an OFF committed before the send is seen by the send transaction');
} catch (e) {
  console.error('FAIL (error)', e);
  failed += 1;
} finally {
  await a.query('ROLLBACK').catch(() => {});
  await a.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => {});
  await a.end().catch(() => {});
  await b.end().catch(() => {});
}
console.log(failed ? `✖ ${failed} lock check(s) failed` : '✓ two-session lock proof passed');
process.exit(failed ? 1 : 0);
