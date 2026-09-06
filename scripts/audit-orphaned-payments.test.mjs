#!/usr/bin/env node
/**
 * Self-test for audit-orphaned-payments.mjs.
 *
 * This detector's dangerous failure is not missing an orphan — it is INVENTING one. A false
 * orphan sends the founder to refund a customer who was in fact served, or to distrust a
 * working system. So the non-vacuity cases below matter more than the detection cases, and
 * each asserts its precondition before asserting the verdict.
 *
 * Run: node scripts/audit-orphaned-payments.test.mjs   (exit 0 = all passed)
 */
import { classifySession, evaluateRun } from './audit-orphaned-payments.mjs';

let passed = 0;
const failures = [];

function check(name, fn) {
  try { fn(); passed++; } catch (e) { failures.push(`${name}: ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const REFS = new Set(['cs_test_fulfilled_1']);
const paidSession = (over = {}) => ({
  id: 'cs_test_orphan_1',
  payment_status: 'paid',
  metadata: { course_slug: 'introduction-to-water-damage-restoration' },
  ...over,
});

// ---------------------------------------------------------------- positive controls
check('positive control: a session WITH a matching enrolment is fulfilled, not an orphan', () => {
  const r = classifySession(paidSession({ id: 'cs_test_fulfilled_1' }), REFS);
  assert(r.verdict === 'fulfilled', `expected fulfilled, got ${r.verdict}: ${r.reason}`);
});

check('positive control: the detector CAN return orphan', () => {
  // Without this, a detector that never fires and a clean system are indistinguishable.
  const r = classifySession(paidSession(), REFS);
  assert(r.verdict === 'orphan', `expected orphan, got ${r.verdict}: ${r.reason}`);
  assert(/water-damage/.test(r.reason), `reason must name the course, got: ${r.reason}`);
});

// ---------------------------------------------------------------- must NOT fire
check('an unpaid session is not an orphan', () => {
  for (const status of ['unpaid', 'no_payment_required']) {
    const r = classifySession(paidSession({ payment_status: status }), REFS);
    assert(r.verdict === 'not-applicable', `payment_status=${status} must not be an orphan, got ${r.verdict}`);
  }
});

check('a CCW roadshow booking is not an orphan', () => {
  // The webhook routes these to a different flow and never creates an enrolment, so counting
  // them would manufacture an obligation that does not exist.
  const s = paidSession({ metadata: { source: 'carsi-ccw-roadshow', course_slug: 'x' } });
  const r = classifySession(s, REFS);
  assert(r.verdict === 'not-applicable', `roadshow booking must be skipped, got ${r.verdict}: ${r.reason}`);
});

check('a session with no course_slug is not an orphan', () => {
  // Subscription checkouts carry no slug; the webhook returns early on them too.
  const r = classifySession(paidSession({ metadata: {} }), REFS);
  assert(r.verdict === 'not-applicable', `no-slug session must be skipped, got ${r.verdict}`);
});

check('a session with no id is not an orphan', () => {
  const r = classifySession(paidSession({ id: undefined }), REFS);
  assert(r.verdict === 'not-applicable', `id-less session must be skipped, got ${r.verdict}`);
});

check('a non-object is handled, not thrown on', () => {
  for (const bad of [null, undefined, 'string', 42]) {
    const r = classifySession(bad, REFS);
    assert(r.verdict === 'not-applicable', `${typeof bad} must be skipped, got ${r.verdict}`);
  }
});

check('payment_status absent is treated as paid (Stripe omits it on some modes)', () => {
  const s = { id: 'cs_x', metadata: { course_slug: 'a-course' } };
  const r = classifySession(s, REFS);
  assert(r.verdict === 'orphan', `absent payment_status must not silently skip, got ${r.verdict}`);
});

// ---------------------------------------------------------------- non-vacuity
check('an unreadable enrolment table exits 2, never 1', () => {
  // The critical one. If the DB read fails and we still judged, EVERY paid session would look
  // like an orphan and the report would demand refunds for served customers.
  const r = evaluateRun({ sessionsListed: 50, enrolmentRefsLoaded: 0, orphans: [{}], dbReadOk: false });
  assert(r.code === 2, `expected 2, got ${r.code}: ${r.reason}`);
  assert(/refusing/.test(r.reason), `reason must say it refused to judge, got: ${r.reason}`);
});

check('zero enrolment references exits 2 even when the DB read "succeeded"', () => {
  // An empty table and a mis-aimed query are indistinguishable from the result alone.
  const r = evaluateRun({ sessionsListed: 50, enrolmentRefsLoaded: 0, orphans: [{}, {}], dbReadOk: true });
  assert(r.code === 2, `expected 2, got ${r.code}: ${r.reason}`);
  assert(/falsely/.test(r.reason), `reason must name the false-orphan risk, got: ${r.reason}`);
});

check('listing zero Stripe sessions exits 2, not 0', () => {
  const r = evaluateRun({ sessionsListed: 0, enrolmentRefsLoaded: 120, orphans: [], dbReadOk: true });
  assert(r.code === 2, `reaching nothing must not pass, got ${r.code}: ${r.reason}`);
});

check('a complete run with orphans exits 1 and counts them', () => {
  const r = evaluateRun({ sessionsListed: 40, enrolmentRefsLoaded: 120, orphans: [{}, {}, {}], dbReadOk: true });
  assert(r.code === 1, `expected 1, got ${r.code}`);
  assert(/3 customer/.test(r.reason), `reason must count the orphans, got: ${r.reason}`);
});

check('a complete clean run exits 0', () => {
  const r = evaluateRun({ sessionsListed: 40, enrolmentRefsLoaded: 120, orphans: [], dbReadOk: true });
  assert(r.code === 0, `expected 0, got ${r.code}: ${r.reason}`);
});

// ---------------------------------------------------------------- reference matching
check('matching is on the raw Stripe session id', () => {
  // Verified 2026-09-06: resolveStripePaymentReference() only trims, so the stored
  // paymentReference IS the session id. If that ever transforms the id, this test fails and
  // the detector must be updated with it — otherwise every payment reads as an orphan.
  const refs = new Set(['cs_live_abc123']);
  assert(classifySession(paidSession({ id: 'cs_live_abc123' }), refs).verdict === 'fulfilled', 'exact id must match');
  assert(classifySession(paidSession({ id: 'cs_live_abc124' }), refs).verdict === 'orphan', 'a different id must not match');
});

if (failures.length) {
  console.error(`FAIL — ${failures.length} of ${passed + failures.length} checks failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`OK — ${passed} checks passed.`);
