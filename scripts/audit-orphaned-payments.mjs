#!/usr/bin/env node
/**
 * Find customers who PAID and received NOTHING.
 *
 * WHY THIS EXISTS. CARSI fulfils a course purchase by two paths, and as at 2026-09-06 both
 * can miss the same customer:
 *
 *   1. The Stripe webhook (`app/api/lms/webhooks/stripe/route.ts`) on
 *      `checkout.session.completed`. GP-549 records that deliveries have been failing since
 *      2026-08-29 — Stripe shows successful charges, the platform's webhook table shows none.
 *   2. The success page (`app/api/lms/enrollments/guest-complete/route.ts`). This does NOT
 *      fulfil on arrival: it requires the buyer to choose and submit a password of at least
 *      8 characters. Close the tab, lose signal, or switch apps on mobile, and nothing happens.
 *
 * There is no third path. Verified by enumeration on 2026-09-06: 7 cron routes exist and none
 * reconciles payments against enrolments (`toolbox-talk-drip` matches a payment grep only
 * because the word "enrollee" appears in one of its comments).
 *
 * So when both paths miss, money is taken and no system anywhere notices. This script is the
 * detector. It is READ-ONLY and fulfils nothing — measure before you mutate, and a refund or
 * fulfilment obligation is the founder's call, not an agent's (`ENGINE.md:43` puts money
 * outside autonomous scope).
 *
 * CREDENTIALS. This script never stores or prints a secret. It reads STRIPE_SECRET_KEY and
 * DATABASE_URL from the environment you run it in, so the founder supplies them at run time
 * and no agent has to hold them:
 *
 *   STRIPE_SECRET_KEY=sk_live_… DATABASE_URL=postgres://… node scripts/audit-orphaned-payments.mjs
 *   … --since 2026-08-29        (default: 30 days back)
 *   … --json                    (machine-readable)
 *
 * Exit 0 = every paid session has an enrolment. Exit 1 = orphans found (customers owed).
 * Exit 2 = could not audit. Exit 2 is NOT "nothing wrong" — a run that reached nothing must
 * never read as a clean bill of health, which is the failure mode this repo has shipped before.
 */
import { pathToFileURL } from 'node:url';

/** Sessions carrying this metadata source are booked through a different flow, not enrolments. */
const NON_ENROLMENT_SOURCES = new Set(['carsi-ccw-roadshow']);

/**
 * Enrolment statuses that actually grant access. Mirrors ACCESS_GRANTING_STATUS_LIST in
 * src/lib/server/enrollment-access.ts:23 — an ALLOW-set, so an unrecognised status reads as
 * "no access" rather than being waved through.
 */
export const ACCESS_GRANTING_STATUSES = new Set(['active', 'completed']);

/**
 * Statuses that mean access was DELIBERATELY taken away — the refund / chargeback family.
 * Mirrors NO_ACCESS_STATUSES in src/lib/server/enrollment-access.ts:33.
 *
 * This set exists because "does not grant access" and "was deliberately removed" are NOT the
 * same claim, and an earlier version of this file treated them as one. Anything that is
 * neither access-granting nor listed here is an UNKNOWN status, and an unknown status must be
 * REPORTED, never quietly excused — see classifySession.
 *
 * `status` is a free-text column. Both spellings of cancelled are present upstream because a
 * Stripe-sourced value may use either; keep them.
 */
export const DELIBERATE_NO_ACCESS_STATUSES = new Set([
  'revoked',
  'cancelled',
  'canceled',
  'refunded',
  'disputed',
  'chargeback',
]);

/**
 * Was this session's charge refunded in full?
 *
 * A refunded Stripe session STILL reads `payment_status: 'paid'`, so without this every
 * customer who was refunded during the 2026-08-29 webhook outage would be reported as owed
 * access they are not owed. The predicate mirrors the webhook's own revocation test at
 * app/api/lms/webhooks/stripe/route.ts:107-108: a PARTIAL refund is deliberately not a
 * revocation, so it is deliberately not an exclusion here either.
 *
 * Requires `expand: ['data.payment_intent.latest_charge']` on the listing. Absent expansion
 * this returns false — it cannot see a refund, so it must not claim there was none.
 */
export function isFullyRefunded(session) {
  const charge = session?.payment_intent?.latest_charge;
  if (!charge || typeof charge !== 'object') return false;
  if (charge.refunded === true) return true;
  return typeof charge.amount === 'number'
    && typeof charge.amount_refunded === 'number'
    && charge.amount > 0
    && charge.amount_refunded >= charge.amount;
}

/** Key for the "does this learner hold access to this course" index. */
export function accessKey(userId, courseSlug) {
  return `${userId}::${String(courseSlug).trim().toLowerCase()}`;
}

/**
 * Second pass over a session the id-match called an orphan.
 *
 * The id match asks "is this session id recorded on an enrolment", which is a PROXY for the
 * question that matters: does this customer have the course they paid for. The two diverge,
 * and verified in src/lib/server/enrollment-service.ts:57-68: when a refunded learner buys
 * again, the existing enrolment row is UPDATED and `paymentReference` is overwritten with the
 * new session id. The earlier session id then exists nowhere, so the id match reports an
 * orphan for a customer who is sitting in the course right now.
 *
 * Pure. `accessKeys` holds one entry per learner-course pair that currently grants access.
 */
export function classifyOrphanAgainstAccess(orphan, accessKeys) {
  const { learnerId, courseSlug, learnerIdSource } = orphan;
  if (!learnerId) {
    return { verdict: 'orphan', reason: orphan.reason };
  }
  if (!accessKeys.has(accessKey(learnerId, courseSlug))) {
    return { verdict: 'orphan', reason: orphan.reason };
  }

  // The payer appears to hold access already. WHETHER THAT CLEARS THEM DEPENDS ENTIRELY ON HOW
  // WE IDENTIFIED THEM, because clearing is the irreversible direction: a cleared payer is
  // never shown to the founder again.
  //
  //   'metadata' — `metadata.student_id`, written by our own checkout for this very session.
  //                It identifies the payer directly, so it is safe to clear on.
  //   'email'    — INFERRED by matching the Stripe session email to an LMS account. `email` is
  //                unique, so this cannot collide across two accounts, and a case mismatch
  //                simply fails to resolve (which reports, the safe direction). But a shared or
  //                role inbox — office@, accounts@, a couple or a crew using one address — can
  //                resolve to a DIFFERENT person who happens to hold the course. Clearing on
  //                that silently loses someone who paid and got nothing.
  //
  // So an email-resolved match is reported, not cleared, and the reason says why. This is the
  // over-report side of the trade the file's own rule demands: showing the founder someone who
  // turns out to be fine costs a minute; dropping a real orphan costs a customer.
  if (learnerIdSource === 'metadata') {
    return {
      verdict: 'fulfilled',
      reason: 'the payer holds access to this course under a different payment reference',
    };
  }

  return {
    verdict: 'orphan',
    reason:
      `${orphan.reason} — NOTE: an account matching this session's email already holds this ` +
      'course, so this is most likely a re-purchase after a refund and not a real orphan. ' +
      'Not cleared automatically because the payer was identified by email rather than by ' +
      'checkout metadata, and a shared inbox can match the wrong person. Confirm and dismiss.',
  };
}

/**
 * Decide whether one paid Stripe session should have produced an enrolment, and whether it did.
 * Pure — no network, no database. Separated so the self-test can plant each case.
 *
 * @returns {{verdict: 'orphan'|'fulfilled'|'not-applicable', reason: string}}
 */
export function classifySession(session, enrolmentRefs) {
  if (!session || typeof session !== 'object') {
    return { verdict: 'not-applicable', reason: 'session is not an object' };
  }
  if (session.payment_status && session.payment_status !== 'paid') {
    return { verdict: 'not-applicable', reason: `payment_status=${session.payment_status}` };
  }
  // A refunded session still reads payment_status='paid'. Someone who was refunded is not
  // owed access, and listing them sends the founder to a customer already made whole.
  if (isFullyRefunded(session)) {
    return { verdict: 'not-applicable', reason: 'refunded in full — no outstanding obligation' };
  }
  const source = session.metadata?.source;
  if (source && NON_ENROLMENT_SOURCES.has(source)) {
    return { verdict: 'not-applicable', reason: `booked via ${source}, not a course enrolment` };
  }
  const slug = session.metadata?.course_slug?.trim().toLowerCase();
  if (!slug) {
    // Subscription checkouts and anything without a course carry no slug. The webhook itself
    // returns early on this, so it is out of scope here rather than a defect.
    return { verdict: 'not-applicable', reason: 'no course_slug in metadata' };
  }
  if (!session.id) {
    return { verdict: 'not-applicable', reason: 'session has no id' };
  }
  // `enrolmentRefs` is a Map of payment reference -> enrolment status, not a bare Set. The
  // status matters: a revoked or refunded enrolment CARRIES the session id while granting
  // nothing, so a membership test alone would report "fulfilled" for a customer who has no
  // access at all.
  const recordedStatus = enrolmentRefs.get(session.id);
  if (recordedStatus !== undefined) {
    const normalised = String(recordedStatus).toLowerCase().trim();
    if (ACCESS_GRANTING_STATUSES.has(normalised)) {
      return { verdict: 'fulfilled', reason: 'an enrolment carries this session id and grants access' };
    }
    if (DELIBERATE_NO_ACCESS_STATUSES.has(normalised)) {
      return {
        verdict: 'not-applicable',
        reason: `access deliberately removed (enrolment status "${recordedStatus}")`,
      };
    }
    // NEITHER access-granting NOR a known deliberate removal. `status` is free text, so this
    // is reachable via a new status nobody updated this file for, or an empty string.
    //
    // This branch is the whole point of splitting the two sets. Clearing here would mean
    // telling the founder that a customer who paid and holds no access needs nothing, on the
    // strength of a status string this script does not understand — a silent false negative,
    // which is the one direction that loses a paying customer. Report it and say why.
    return {
      verdict: 'orphan',
      reason:
        `PAID for "${slug}" and the enrolment status "${recordedStatus}" is not recognised — ` +
        'it neither grants access nor is a known refund/chargeback status, so this is reported ' +
        'rather than excused',
    };
  }
  return { verdict: 'orphan', reason: `PAID for "${slug}" with no matching enrolment` };
}

/**
 * Decide the run's verdict. Pure.
 *
 * The non-vacuity rules live here because their failure mode is a comfortable pass: a run that
 * listed zero sessions, or that could not read the enrolment table, looks exactly like a clean
 * system unless it is made to fail loudly.
 */
export function evaluateRun({ sessionsListed, enrolmentRefsLoaded, orphans, dbReadOk }) {
  if (!dbReadOk) {
    return { code: 2, reason: 'could not read the enrolment table — refusing to call every payment an orphan' };
  }
  if (sessionsListed === 0) {
    return { code: 2, reason: 'listed 0 Stripe sessions in the window — reaching nothing is not a clean result' };
  }
  if (enrolmentRefsLoaded === 0) {
    return { code: 2, reason: 'loaded 0 enrolment payment references — every paid session would falsely read as an orphan' };
  }
  if (orphans.length > 0) {
    return { code: 1, reason: `${orphans.length} customer(s) paid and have no enrolment` };
  }
  return { code: 0, reason: `${sessionsListed} paid session(s) checked, all fulfilled` };
}

function parseSince(argv) {
  const i = argv.indexOf('--since');
  if (i !== -1 && argv[i + 1]) {
    const d = new Date(argv[i + 1]);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

async function main() {
  const asJson = process.argv.includes('--json');
  const since = parseSince(process.argv);

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    console.error('STRIPE_SECRET_KEY is not set. Supply it at run time; this script never stores it.');
    process.exit(2);
  }
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set. Supply it at run time; this script never stores it.');
    process.exit(2);
  }

  let Stripe, PrismaClient;
  try {
    ({ default: Stripe } = await import('stripe'));
    ({ PrismaClient } = await import('@prisma/client'));
  } catch (e) {
    console.error(`Could not load dependencies (run npm install first): ${e.message}`);
    process.exit(2);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const prisma = new PrismaClient();

  // Load every enrolment payment reference WITH its status, plus a learner-course access
  // index. A failure here must not be read as "no enrolments".
  const enrolmentRefs = new Map();
  const accessKeys = new Set();
  let dbReadOk = false;
  try {
    const rows = await prisma.lmsEnrollment.findMany({
      where: { paymentReference: { not: null } },
      select: { paymentReference: true, status: true, studentId: true, course: { select: { slug: true } } },
    });
    for (const r of rows) {
      if (r.paymentReference) enrolmentRefs.set(r.paymentReference, r.status);
      const slug = r.course?.slug;
      if (slug && r.studentId && ACCESS_GRANTING_STATUSES.has(String(r.status ?? '').toLowerCase().trim())) {
        accessKeys.add(accessKey(r.studentId, slug));
      }
    }
    dbReadOk = true;
  } catch (e) {
    console.error(`Could not read enrolments: ${e.message}`);
  }

  const orphans = [];
  let sessionsListed = 0;
  const notApplicable = new Map();

  if (dbReadOk) {
    try {
      for await (const session of stripe.checkout.sessions.list({
        created: { gte: Math.floor(since.getTime() / 1000) },
        limit: 100,
        // Required by isFullyRefunded(). Without it a refunded session is indistinguishable
        // from an unfulfilled one, because both still read payment_status='paid'.
        expand: ['data.payment_intent.latest_charge'],
      })) {
        sessionsListed++;
        const { verdict, reason } = classifySession(session, enrolmentRefs);
        if (verdict === 'orphan') {
          orphans.push({
            sessionId: session.id,
            created: new Date(session.created * 1000).toISOString(),
            email: session.customer_details?.email ?? session.customer_email ?? null,
            courseSlug: session.metadata?.course_slug ?? null,
            amountTotal: session.amount_total,
            currency: session.currency,
            // Carried for the second pass, which asks whether this payer holds the course
            // under some OTHER payment reference. Null until the email lookup resolves it.
            learnerId: session.metadata?.student_id?.trim() || null,
            // HOW the learner was identified, not just who. The second pass will only CLEAR a
            // payer on a 'metadata' match — see classifyOrphanAgainstAccess.
            learnerIdSource: session.metadata?.student_id?.trim() ? 'metadata' : null,
            reason,
          });
        } else if (verdict === 'not-applicable') {
          notApplicable.set(reason, (notApplicable.get(reason) ?? 0) + 1);
        }
      }
    } catch (e) {
      console.error(`Stripe listing failed: ${e.message}`);
      await prisma.$disconnect();
      process.exit(2);
    }
  }

  // SECOND PASS. The id match asks "is this session id recorded", which is a proxy for the
  // real question: does this customer have the course they paid for. Those diverge whenever
  // the reference moves — enrollment-service.ts:57-68 overwrites paymentReference when a
  // refunded learner re-purchases, orphaning the earlier id while the learner sits in the
  // course. Resolve each candidate to a learner and ask the real question. Bounded: one
  // extra query total, over the candidates only.
  let clearedByAccess = 0;
  if (orphans.length > 0) {
    const emails = [...new Set(orphans.filter((o) => !o.learnerId && o.email).map((o) => o.email))];
    if (emails.length > 0) {
      try {
        const users = await prisma.lmsUser.findMany({
          where: { email: { in: emails } },
          select: { id: true, email: true },
        });
        const idByEmail = new Map(users.map((u) => [u.email, u.id]));
        for (const o of orphans) {
          if (o.learnerId || !o.email) continue;
          const resolved = idByEmail.get(o.email) ?? null;
          if (!resolved) continue;
          o.learnerId = resolved;
          // Marked as inferred. This identification is good enough to ANNOTATE the row with a
          // likely explanation, but not to drop the payer from the report entirely.
          o.learnerIdSource = 'email';
        }
      } catch (e) {
        // Cannot resolve, so cannot clear anything. Over-reporting is the safe direction:
        // the founder sees a customer who is fine, rather than missing one who is not.
        console.error(`Could not resolve payer identities, second pass skipped: ${e.message}`);
      }
    }
    for (let i = orphans.length - 1; i >= 0; i -= 1) {
      const r = classifyOrphanAgainstAccess(orphans[i], accessKeys);
      if (r.verdict === 'fulfilled') {
        orphans.splice(i, 1);
        clearedByAccess += 1;
      }
    }
  }

  await prisma.$disconnect();

  const verdict = evaluateRun({
    sessionsListed,
    enrolmentRefsLoaded: enrolmentRefs.size,
    orphans,
    dbReadOk,
  });

  if (asJson) {
    console.log(JSON.stringify({ since: since.toISOString(), sessionsListed, enrolmentRefs: enrolmentRefs.size, clearedByAccess, orphans, verdict }, null, 2));
    process.exit(verdict.code);
  }

  console.log(`Orphaned-payment audit — sessions created since ${since.toISOString().slice(0, 10)}`);
  console.log(`  Stripe sessions listed:        ${sessionsListed}`);
  console.log(`  enrolment payment references:  ${enrolmentRefs.size}`);
  console.log(`  cleared by course access:      ${clearedByAccess}  (paid under an older reference, learner has the course)`);
  for (const [reason, n] of notApplicable) console.log(`  skipped (${reason}): ${n}`);

  if (orphans.length) {
    console.log(`\n  CUSTOMERS WHO PAID AND HAVE NO ENROLMENT:\n`);
    for (const o of orphans) {
      const amount = o.amountTotal != null ? `${(o.amountTotal / 100).toFixed(2)} ${(o.currency ?? '').toUpperCase()}` : 'unknown amount';
      console.log(`  ${o.created}  ${amount}`);
      console.log(`    course:  ${o.courseSlug}`);
      console.log(`    email:   ${o.email ?? '(none on session)'}`);
      console.log(`    session: ${o.sessionId}`);
    }
    console.log(`\n  Each of these is a refund-or-fulfil obligation, not a backlog item.`);
  }

  console.log(`\n${verdict.code === 0 ? 'OK' : 'ACTION NEEDED'}: ${verdict.reason}`);
  process.exit(verdict.code);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
