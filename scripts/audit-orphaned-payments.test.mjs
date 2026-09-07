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
import {
  classifySession,
  evaluateRun,
  isFullyRefunded,
  classifyOrphanAgainstAccess,
  applySecondPass,
  accessKey,
} from './audit-orphaned-payments.mjs';

let passed = 0;
const failures = [];

function check(name, fn) {
  try { fn(); passed++; } catch (e) { failures.push(`${name}: ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// Map of payment reference -> enrolment status. A bare Set could not tell a live enrolment
// from a revoked one, and a revoked enrolment carries the session id while granting nothing.
const REFS = new Map([['cs_test_fulfilled_1', 'active']]);
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
  const refs = new Map([['cs_live_abc123', 'active']]);
  assert(classifySession(paidSession({ id: 'cs_live_abc123' }), refs).verdict === 'fulfilled', 'exact id must match');
  assert(classifySession(paidSession({ id: 'cs_live_abc124' }), refs).verdict === 'orphan', 'a different id must not match');
});

// ---------------------------------------------------------------- refunds
// A refunded Stripe session STILL reads payment_status:'paid'. Without this the detector
// sends the founder to customers who have already been made whole — likely during the
// 2026-08-29 webhook outage, where complaints were resolved by refund.
const charged = (over = {}) => ({ payment_intent: { latest_charge: { amount: 9900, amount_refunded: 0, refunded: false, ...over } } });

check('positive control: the SAME session is an orphan when it is not refunded', () => {
  // Without this, the refund tests below could pass because the session was skipped for some
  // unrelated reason, and would say nothing about the refund check.
  const r = classifySession(paidSession({ ...charged() }), REFS);
  assert(r.verdict === 'orphan', `unrefunded must still be an orphan, got ${r.verdict}: ${r.reason}`);
});

check('a fully refunded session is not an outstanding obligation', () => {
  const byFlag = classifySession(paidSession({ ...charged({ refunded: true }) }), REFS);
  assert(byFlag.verdict === 'not-applicable', `refunded flag must exclude, got ${byFlag.verdict}`);
  const byAmount = classifySession(paidSession({ ...charged({ amount_refunded: 9900 }) }), REFS);
  assert(byAmount.verdict === 'not-applicable', `full amount refund must exclude, got ${byAmount.verdict}`);
});

check('a PARTIAL refund is still an obligation', () => {
  // Mirrors the webhook's own revocation predicate (route.ts:107-108): a partial refund does
  // not revoke access, so it must not silently excuse a missing enrolment either.
  const r = classifySession(paidSession({ ...charged({ amount_refunded: 5000 }) }), REFS);
  assert(r.verdict === 'orphan', `partial refund must remain an orphan, got ${r.verdict}: ${r.reason}`);
});

check('without charge expansion the refund check claims nothing', () => {
  // It cannot see a refund, so it must not assert there was none by excluding the session.
  assert(isFullyRefunded({ id: 'cs_x' }) === false, 'unexpanded session must not read as refunded');
  assert(isFullyRefunded({ payment_intent: 'pi_123' }) === false, 'unexpanded payment_intent must not read as refunded');
  const r = classifySession(paidSession(), REFS);
  assert(r.verdict === 'orphan', 'an unexpanded session must still be judged, not skipped');
});

// ---------------------------------------------------------------- revoked enrolments
check('an enrolment that carries the id but grants nothing is NOT fulfilled', () => {
  for (const status of ['revoked', 'refunded', 'disputed', 'cancelled']) {
    const refs = new Map([['cs_test_rev_1', status]]);
    const r = classifySession(paidSession({ id: 'cs_test_rev_1' }), refs);
    assert(r.verdict !== 'fulfilled', `status "${status}" must not read as fulfilled, got ${r.verdict}`);
    assert(new RegExp(status).test(r.reason), `reason must name the status, got: ${r.reason}`);
  }
});

check('an unrecognised enrolment status is REPORTED, not quietly excused', () => {
  // This assertion is deliberately `=== 'orphan'` and not `!== 'fulfilled'`.
  //
  // The weaker form was the original, and it could not fail: an earlier version of the script
  // sent every non-access-granting status down the "access deliberately removed" path, so an
  // unknown status returned 'not-applicable' — which is not 'fulfilled', so the check passed
  // while the payer was silently dropped from the report. An independent review planted
  // `pending_provision`, `paused` and `''` and demonstrated exactly that.
  //
  // "Not fulfilled" is two different outcomes and only one of them is safe. `not-applicable`
  // clears the payer; `orphan` shows them to the founder. For a status this script does not
  // recognise, only the second is defensible, so the test must distinguish them.
  // The statuses are GENERATED, not a fixed list, and that is the point.
  //
  // A previous version enumerated five literal strings. A review defeated it with a mutant
  // that orphaned exactly those five and cleared every other unknown status — the suite stayed
  // green while `awaiting_provision` and `held` still silently cleared the payer. A control
  // that names its own inputs can only ever certify those inputs; the implementation can
  // hardcode them and the test cannot tell the difference.
  //
  // Random statuses cannot be hardcoded in advance, so passing this requires the real
  // property: anything outside the two known sets is reported. The named cases below are kept
  // as well, because they are the ones a human reading this file should recognise.
  const generated = [];
  for (let i = 0; i < 25; i += 1) {
    generated.push(`st_${Math.random().toString(36).slice(2, 10)}_${i}`);
  }
  const named = ['some_future_status', 'pending_provision', 'awaiting_provision', 'held', 'paused', '', '   '];

  for (const status of [...named, ...generated]) {
    const refs = new Map([['cs_test_new_1', status]]);
    const r = classifySession(paidSession({ id: 'cs_test_new_1' }), refs);
    assert(
      r.verdict === 'orphan',
      `unrecognised status "${status}" must be reported as an orphan, got ${r.verdict}: ${r.reason}`,
    );
  }
});

check('a KNOWN deliberate removal is still excused, so the split is real', () => {
  // Negative control for the check above. Without this, making everything an orphan would pass
  // that test while destroying the distinction the fix exists to draw.
  for (const status of ['revoked', 'refunded', 'disputed', 'cancelled', 'canceled', 'chargeback']) {
    const refs = new Map([['cs_test_rem_1', status]]);
    const r = classifySession(paidSession({ id: 'cs_test_rem_1' }), refs);
    assert(
      r.verdict === 'not-applicable',
      `known removal status "${status}" should be not-applicable, got ${r.verdict}: ${r.reason}`,
    );
  }
});

// ---------------------------------------------------------------- second pass, access by course
// enrollment-service.ts:57-68 OVERWRITES paymentReference when a refunded learner buys again,
// so the earlier session id exists nowhere while the learner sits in the course.
// `learnerIdSource: 'metadata'` is load-bearing, not decoration: only a learner identified from
// the checkout's own `metadata.student_id` may be CLEARED. See the email case further down.
const ORPHAN = {
  learnerId: 'user-1',
  courseSlug: 'introduction-to-water-damage-restoration',
  learnerIdSource: 'metadata',
  reason: 'PAID with no matching enrolment',
};

check('positive control: the second pass CAN still return orphan', () => {
  const r = classifyOrphanAgainstAccess(ORPHAN, new Set());
  assert(r.verdict === 'orphan', `empty access index must leave it an orphan, got ${r.verdict}`);
});

check('a payer who holds the course under another reference is not an orphan', () => {
  const keys = new Set([accessKey('user-1', 'introduction-to-water-damage-restoration')]);
  const r = classifyOrphanAgainstAccess(ORPHAN, keys);
  assert(r.verdict === 'fulfilled', `expected fulfilled, got ${r.verdict}: ${r.reason}`);
});

check('an EMAIL-resolved payer holding the course is annotated, NOT cleared', () => {
  // The clearing path is only safe when the payer was identified by checkout metadata. An
  // email match is inference: `email` is unique so it cannot collide across two accounts, and
  // a case mismatch simply fails to resolve — but a shared or role inbox (office@, accounts@,
  // a couple or a crew on one address) can resolve to a DIFFERENT person who happens to hold
  // the course. Clearing on that loses someone who paid and got nothing, silently.
  //
  // So this must stay an orphan, carrying the likely explanation for the founder to dismiss in
  // seconds. Over-reporting costs a minute; under-reporting costs a customer.
  const keys = new Set([accessKey('user-1', 'introduction-to-water-damage-restoration')]);
  const r = classifyOrphanAgainstAccess({ ...ORPHAN, learnerIdSource: 'email' }, keys);
  assert(r.verdict === 'orphan', `email-resolved payer must stay reported, got ${r.verdict}`);
  assert(/re-purchase/i.test(r.reason), `reason must explain the likely cause, got: ${r.reason}`);
  assert(/email/i.test(r.reason), `reason must say the id came from email, got: ${r.reason}`);
});

// -------------------------------------------------- the second pass as main() actually runs it
// These call applySecondPass, the SAME function main() calls. A test that re-implemented the
// loop over its own fixture passed while main() computed the annotation and discarded it.

check('applySecondPass CLEARS a metadata-identified payer who holds the course', () => {
  const orphans = [{ ...ORPHAN }];
  const keys = new Set([accessKey('user-1', 'introduction-to-water-damage-restoration')]);
  const cleared = applySecondPass(orphans, keys);
  assert(cleared === 1, `expected 1 cleared, got ${cleared}`);
  assert(orphans.length === 0, `row should be removed, ${orphans.length} left`);
});

check('applySecondPass WRITES the annotation onto a surviving row', () => {
  // The regression this exists for: the reason was computed and thrown away, so the operator
  // read "PAID with no matching enrolment" and the email pass may as well not have run.
  const orphans = [{ ...ORPHAN, learnerIdSource: 'email' }];
  const keys = new Set([accessKey('user-1', 'introduction-to-water-damage-restoration')]);
  const cleared = applySecondPass(orphans, keys);
  assert(cleared === 0, `email-resolved payer must not be cleared, got ${cleared}`);
  assert(orphans.length === 1, `row should survive, got ${orphans.length}`);
  assert(
    /re-purchase/i.test(orphans[0].reason),
    `the ROW must carry the annotation, got: ${orphans[0].reason}`,
  );
});

check('applySecondPass leaves an unrelated orphan untouched', () => {
  // Negative control: without this, always overwriting every reason would pass the check above.
  const orphans = [{ ...ORPHAN, reason: 'PAID with no matching enrolment' }];
  const cleared = applySecondPass(orphans, new Set());
  assert(cleared === 0, `nothing should clear, got ${cleared}`);
  assert(
    orphans[0].reason === 'PAID with no matching enrolment',
    `reason must not gain a spurious note, got: ${orphans[0].reason}`,
  );
});

check('a payer with no identified source is never cleared', () => {
  // Defensive: a future caller that forgets to set learnerIdSource must not fall into the
  // clearing branch by default.
  const keys = new Set([accessKey('user-1', 'introduction-to-water-damage-restoration')]);
  const r = classifyOrphanAgainstAccess({ ...ORPHAN, learnerIdSource: undefined }, keys);
  assert(r.verdict === 'orphan', `unsourced learner id must stay reported, got ${r.verdict}`);
});

check('access to a DIFFERENT course does not clear the orphan', () => {
  const keys = new Set([accessKey('user-1', 'some-other-course')]);
  assert(classifyOrphanAgainstAccess(ORPHAN, keys).verdict === 'orphan', 'wrong course must not clear');
});

check('another learner holding the course does not clear the orphan', () => {
  const keys = new Set([accessKey('user-2', 'introduction-to-water-damage-restoration')]);
  assert(classifyOrphanAgainstAccess(ORPHAN, keys).verdict === 'orphan', 'wrong learner must not clear');
});

check('an unidentifiable payer is reported, never cleared', () => {
  // Over-reporting is the safe direction: the founder sees someone who is fine, rather than
  // missing someone who paid and got nothing.
  const keys = new Set([accessKey('user-1', 'introduction-to-water-damage-restoration')]);
  const r = classifyOrphanAgainstAccess({ ...ORPHAN, learnerId: null }, keys);
  assert(r.verdict === 'orphan', `unresolved payer must stay an orphan, got ${r.verdict}`);
});

check('course slug matching is case and whitespace insensitive', () => {
  const keys = new Set([accessKey('user-1', 'introduction-to-water-damage-restoration')]);
  const r = classifyOrphanAgainstAccess({ ...ORPHAN, courseSlug: '  Introduction-To-Water-Damage-Restoration ' }, keys);
  assert(r.verdict === 'fulfilled', `slug normalisation must match, got ${r.verdict}`);
});

if (failures.length) {
  console.error(`FAIL — ${failures.length} of ${passed + failures.length} checks failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`OK — ${passed} checks passed.`);
