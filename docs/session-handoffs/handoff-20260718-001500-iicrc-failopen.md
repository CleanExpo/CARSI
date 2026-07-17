# Session Handoff — IICRC CEC auto-submit fail-open (LICENCE-CRITICAL)

**Supersedes nothing. Companion to `handoff-20260717-234500.md` (GP-518).**
**State: SAFE TO STOP.** Two branches pushed, unmerged. No prod change, no merge, no DB write.

> **⚠️ START HERE — LIVE RISK.** The fix is **pushed but NOT deployed**. Until
> `IICRC_CEC_AUTO_SUBMIT=false` is set on CARSI prod, **every course completion can still
> email `renewals@iicrcnet.org`**. Setting that env var is the single highest-value action
> and requires no code change. Owner: **Phill** (agent cannot set prod env).

---

## 1. What happened (founder-observed, 2026-07-17 ~23:50)

Phill logged in, found a course live with no information, clicked **finish**, and the system
sent emails to **Phill, support, and the IICRC**. Reported as "no good… needs to be addressed
and changed immediately."

## 2. Root cause — the auto-submit gate was FAIL-OPEN

`src/lib/server/iicrc-cec-config.ts`:

```ts
/** IICRC CEC auto-submission configuration (course completion → renewals@iicrcnet.org). */
export const DEFAULT_IICRC_CEC_SUBMISSION_EMAIL = 'renewals@iicrcnet.org';

export function isIicrcCecAutoSubmitEnabled(): boolean {   // BEFORE
  const v = process.env.IICRC_CEC_AUTO_SUBMIT?.trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  return true;                                             // ← unset == SUBMIT
}
```

**An unset env var meant "email the IICRC".** The only gate on the submit path is
`iicrc-cec-submission.ts:301` — `if (!forceSend && !isIicrcCecAutoSubmitEnabled())`.

**This class was already known.** `CLAUDE.md` states: *"IICRC/CEC framing was fail-OPEN —
present by default and removed by exception. The standing fix inverts that to fail-CLOSED —
absent by default, added only by explicit approval."* Two prior incidents are recorded from it.
**This gate was never inverted.** The doctrine was right; one file didn't get the sweep.

## 3. What shipped

- **Branch:** `fix/iicrc-cec-autosubmit-fail-closed` — **commit `ddaa0514`** (pushed, **no PR**)
- **Files:** `src/lib/server/iicrc-cec-config.ts`, `src/lib/server/iicrc-cec-config.test.ts` (new)
- **Change:** gate is now off unless explicitly opted in (`true|1|yes|on`). Unrecognised values →
  **OFF**. Never guess consent to contact a certifying body.
- **Verified:** 19 tests pass. **Proven non-vacuous by mutation** — restoring the old default
  fails **8** cases with `expected true to be false`, including the unset-env case.
- **Type-check:** 6 errors — **identical to `main`**, verified by checking out main. None mine.
- **NOT deployed. NOT merged.**

## 4. ⚠️ Three defects still LIVE behind the gate I closed

The outer gate is shut. These remain, and if the gate is ever opened they fire immediately:

1. **`courseEligibleForIicrcCecSubmission` never reads the approvals registry.** It ignores
   `data/seed/cec-approvals.json` — which CLAUDE.md calls the licence-critical SSOT that
   "ships empty until the first genuine approval is confirmed" — and returns `true` if
   `iicrcDiscipline` is merely non-null:
   `return Boolean(disc && disc !== '—' && disc !== '-')`.
2. **`resolveEffectiveCecHours` short-circuits the registry.**
   `if (direct !== null && direct > 0) return direct;` — DB-set `cecHours` bypasses approval.
3. **`app/api/lms/[[...path]]/route.ts` manufactures the eligibility signal.**
   `inferDisciplineFromCourseSlug()` regex-infers an IICRC discipline from the slug and
   **defaults to `return 'WRT'`** for anything unmatched. CLAUDE.md requires
   `iicrcDiscipline: null` and bans discipline acronyms on CARSI courses. A default-'WRT'
   feeding defect #1 is how a course with no approval becomes "eligible".

**These three are the real fix.** Item 3 was found while root-causing GP-518 — the same
catch-all that produced GP-518's 504.

## 5. Second finding — unfinished courses published (UNVERIFIED)

Founder: *"unfinished courses should be unpublished. They are admin available only but they are
on the site for any student to click into."*

**The gate code is correct** — catalogue and detail both filter
`status: { equals: 'published', mode: 'insensitive' }`.

**Hypothesis (NOT verified — no DB access from this machine):** the vector is migration
`137-canonicalize-course-status`. Per the header comment in `src/lib/server/public-courses-list.ts`:

> *"backfills `status='published'` for every row **the old `isPublished OR status` predicate**
> counted as published, so this narrowing is non-regressing"*

That `OR` is permissive. Any course with legacy `isPublished = true` — finished or not — was
counted published, and the migration stamped `status='published'` on it **permanently**. It was
"non-regressing" because it preserved the old behaviour exactly; the old behaviour was already
wrong, so it canonicalised the bug into the new schema.

**Confirm with (Phill — agent has no DB access):**

```sql
SELECT slug, title, status, is_published
FROM lms_courses
WHERE lower(status) = 'published'
ORDER BY created_at DESC;
```

⚠️ **Table/column names are UNVERIFIED** — taken from the estate record, not read from
`schema.prisma` this session. Asserting `"LmsCourse"/"priceAud"` over `lms_courses/price_aud`
is **one of the six fabrications in the H5 handoff**. Read the schema before trusting them.

## 6. The pattern (both findings, one cause)

**Both defects are fail-open defaults inherited without question.** The IICRC gate defaulted to
submit; the publication predicate defaulted to permissive and a migration made it durable.
CLAUDE.md already names fail-open as the systemic enemy — the doctrine simply has not been
swept across every gate.

**Recommended standing action:** audit every boolean gate touching a licence-critical or
learner-visible surface for its unset/default branch. `return true` as a default on a gate is
the bug signature.

## 7. Running state

- **Branch:** `main` (checked out). Both fix branches pushed, unmerged, **no PRs**.
  - `fix/iicrc-cec-autosubmit-fail-closed` → `ddaa0514`
  - `fix/gp-518-course-detail-route` → `14eac5bd`, `879f736d`, `d95066e0`
- **`main` is RED:** `npm run type-check` → 6 pre-existing errors (`ai-website`,
  `stripe-revocation`). **Not caused by either branch** — verified on main directly.
- **Background processes:** none. **Linear:** unchanged. **Prod:** untouched.

## 8. Verification

```bash
cd ~/CARSI
npx vitest run src/lib/server/iicrc-cec-config.test.ts      # 19 pass
npx vitest run src/lib/server/lms-course-detail-route.test.ts   # 6 pass
npm run type-check                                          # 6 errors, same as main
```

## 9. Pick up here

```text
Start here:
1. CONFIRM Phill set IICRC_CEC_AUTO_SUBMIT=false on prod. Until then the risk is LIVE.
2. Fix the three defects in §4 — eligibility must read data/seed/cec-approvals.json.
   The gate being shut is a tourniquet, not the fix.
3. Run the §5 SQL (read schema.prisma FIRST for real names) to size the publication bug.
4. Decide merge on both pushed branches.

Do not redo:
- IICRC root cause (gate defaulted true; CLAUDE.md already named this class)
- GP-518 root cause (handler never existed; git log --all empty)
- The mutation proofs (both suites proven non-vacuous)
- Assuming main's 6 type errors are ours — they are not

First command to run:
cd ~/CARSI && grep -n "return v === 'true'" src/lib/server/iicrc-cec-config.ts
```

## 10. Risk notes

- **The fix is not live.** Pushed ≠ merged ≠ deployed. Only the prod env var stops emails now.
- **The IICRC fix is unit-tested only** — never exercised against a real completion flow. That
  the gate returns false is proven; that no other path reaches the submitter is **not**.
- **Two assertions were made and disproven this session**, both by checking rather than
  reasoning: "the frontend doesn't need this route" (false — 5 consumers) and "no precedent for
  route tests" (false — 102 test files). Neither was caught by self-review. Same pattern as the
  H5 handoff's six.
- **Codex-PC adversarially challenged the GP-518 root cause and lost** — its counter-hypothesis
  (shared dependency 503) was refuted because `[slug]/pricing` shares the same `DATABASE_URL`
  guard and returns 200. The challenge still improved the finding: it exposed the catch-all as an
  elaborate discipline-inferring handler, not a dumb stub — which led directly to §4 item 3.
- **PC Codex auto-approves every permission request** (blanket `PermissionRequest` hook, empty
  matcher). Do not rely on that box for anything irreversible.

`Handoff complete. Next safe action: confirm IICRC_CEC_AUTO_SUBMIT=false is set on CARSI prod — the fix is pushed but not deployed, and until that env var is set every course completion can still email the IICRC.`
