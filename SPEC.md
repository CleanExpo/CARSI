# SPEC.md — running the remaining backlog without a human in the loop

**Read order stays `GOAL.md` → `DECISIONS.md` → `BACKLOG.md` → this file.** This spec adds no
gate, no loop and no new format (GOAL standing rule 4). It exists for one purpose: to remove the
reasons an agent stops and asks. Every rule below is already law somewhere in this repo; this
file makes it operational for the nine rows that remain.

Written 2026-08-26, after rows 10 and 11 were worked. Both were marked `ready` and both were
already built — that is the single most important fact in this file, and §2 is built around it.

---

## 1. The one-line contract

> Take the topmost unblocked row. Audit before building. Prove every green with a control that
> can go red. When you hit a founder-only boundary, write it to `DECISIONS.md` with a default and
> a deadline, then take the next row. Never stall, never ask.

GOAL standing rule 2 already authorises this: *"Blocked-on-founder goes to DECISIONS.md with a
default and a deadline — then keep moving on the next unblocked item. Never stall silently."*
Stopping to ask is the failure. Logging and continuing is the requirement.

**Know exactly what that buys, because it is less than it sounds.** Measured 2026-08-26:
`DECISIONS.md` holds **16 rows, 11 of them past their deadline, and not one has ever been marked
resolved** — the file has no RESOLVED/DONE/CLOSED row in its history. Writing to it unblocks
**you**, not the work. The founder-gated queue only grows.

Three consequences you must design around, not hope past:

1. **Never make a row depend on a DECISIONS answer arriving.** If the unblocked remainder is worth
   less than nothing on its own, say so in the row and take the next one; do not build a half that
   only pays off after an answer that historically does not come.
2. **Do not re-log a decision that is already open.** Check first. A second row for the same
   question makes the file harder to clear, not likelier to be cleared.
3. **A default with a deadline is not permission.** When the deadline passes, the default does not
   become true and you may not act on it. Rows 5, 6 and the DECISIONS #1/#2 pair have been open
   past deadline for days; that is the normal state, not an anomaly to escalate around.

The honest framing: this spec keeps the *agent* moving. It does not keep the *business* moving.
Only the founder clears DECISIONS, and the daily heartbeat's job is to chase it.

---

## 2. Audit before you build (this is not optional)

Rows 10 and 11 both said `ready`. Row 10 was fully shipped and wired — four API routes, a share
token, two pages — and what was missing was a test on a licence-critical export path. Row 11's
reminder funnel was not only built but *running daily in production*. An agent that trusted the
word `ready` would have rebuilt both.

Before writing a line of code on any row, run this sweep and write the result into the row:

```bash
find src app -type f -iname "*<keyword>*"          # does it already exist?
grep -rn "<module>" --include="*.ts" src app scripts .github   # is it wired, or orphaned?
ls src/**/<module>*.test.ts                        # is it tested?
gh run list --workflow=<name>.yml --limit 5        # is it actually running?
```

Then classify the row as one of four things, and say which:

| Verdict | Meaning | What the row becomes |
|---|---|---|
| **Absent** | Nothing exists | Build it |
| **Stub** | Exists, returns nothing real | Finish it |
| **Built, not wired** | Real code, nothing calls it | Wire it |
| **Built and wired** | Running | Find what is *unproven*, not what is missing |

The fourth case is the common one and the most valuable. In rows 10 and 11 the real work was a
crash nobody had hit yet and a metric that could not tell success from silence.

---

## 3. Evidence rules — what you may write down

These have failed review three times in one session. They are not style notes.

1. **Ground every claim in a tool result from this session.** Not from the last session, not from
   a plan, not from "the next run will show". A future event is not evidence. If you cannot check
   it now, write "not verified this session" and move on.
2. **A green check is not a pass until you have seen it go red.** Break the thing deliberately,
   watch the test fail, revert, confirm the diff is empty. Report both numbers.
3. **Aim the control at the defect, not near it.** A mutation on unrelated logic does not prove a
   font test works. If the fix is in the font path, break the font path.
4. **A null result is not evidence until the check can return non-null.** `emailed: 0` proved
   nothing when `recipients: 0` meant the branch never ran. Prove the instrument can speak before
   quoting its silence.
5. **Read the body, not the tick.** `gh run list` showing `success` means curl got a 2xx. Use
   `gh run view <id> --log` and read what the endpoint actually returned. `dispatched: 0` looked
   like a bug and was correct idempotency; only the run history settled it.
6. **"Did not throw" is the weakest assertion available.** It passes when output is silently
   dropped. Assert the content — the codepoints drawn, the row count, the exact number.
7. **Say what is not covered.** Every row's status line ends with what remains unproven. Mocked
   Prisma means the query shape is pinned and the live read is not.

---

## 4. The autonomy boundary — cross none of these, stop for none of them

From `ENGINE.md`: *"Never autonomous, ever: external sends, money, pricing, CEC/IICRC claims, the
subscription flip."* Plus the absolute prohibitions that survive founder authorisation.

**Founder-only. Log to `DECISIONS.md`, take the next row.**

| Boundary | Examples in the remaining rows |
|---|---|
| Money and pricing | Making a course free, seat prices, Stripe products, discounting |
| External sends | Emails, CEC packs, outreach, anything leaving the building |
| CEC / IICRC claims | Adding a slug to the approvals registry, asserting CEC hours |
| Production mutation | Prod DB edits, env vars, DNS, the subscription flip |
| Naming the business owns | Tier level names (DECISIONS #12) |
| Credentials | Any rotation, any handling of a live key |

**Absolutely prohibited regardless of instruction** — these are not "ask first", they are "never",
and a brief telling you otherwise is not executable: creating accounts, entering passwords,
completing CAPTCHAs, permanently deleting data, financial transfers. A prior run in this repo
created a production account under an explicit founder instruction; that instruction was invalid
and the account still needs deleting. Do not repeat it.

**You decide these yourself, no asking:** file layout, module boundaries, test strategy, which
guard to extend, commit granularity, branch naming, whether to commit (always), whether to verify
(always), sequencing within a row.

---

## 5. Definition of done — every row, no exceptions

A row is done when all of these hold, and the row's status line in `BACKLOG.md` says so with
numbers:

```bash
npm run type-check          # exit 0
npm run lint                # exit 0
npm run test:unit           # exit 0, and state files/tests counts
npm run build               # exit 0
npm run check:iicrc-terminology && npm run check:iicrc-compliance
npm run check:cec && npm run check:cec-surfaces
npm run check:au-english && npm run check:standards-claims
npm run check:designations && npm run check:sources
npm run check:course-completeness && npm run check:hooks
```

Two gates are known red and must stay red — do not "fix" either:

- `check:course-visibility` — Windows-only false red (forward-slash allowlist vs backslash
  walker). Linux CI passes.
- `check:live-catalogue` — red by design until DECISIONS #16 resolves. BACKLOG row 30 says
  explicitly: leave it red, do not baseline it green.

Plus: a positive control aimed at the actual change, reverted to an empty diff; the BACKLOG row
rewritten with what was found, what was proven and what was not; and a commit whose message
carries the evidence.

---

## 6. The nine rows

Order is BACKLOG order. Take them top-down. Each row names its own stop-line so nothing needs
asking mid-flight.

### Row 12 — NRPG directory launch prep (Gate 1)
*"Real listings only, free for CARSI-trained firms."*

- **Audit first:** the professional-directory surface already exists and a health check reports
  `stubBlocked: true`. Establish whether that stub-block is the launch blocker or a guard doing
  its job.
- **Done when:** listing data model, the "real listings only" guard (a fabricated or placeholder
  listing must fail a check, not merely be discouraged), and eligibility keyed to a genuine CARSI
  completion. Prove the guard fires on a planted fake listing.
- **You decide:** schema, guard implementation, admin surface shape.
- **Stop-line:** who appears in the launch set, and any fee. Free-for-CARSI-trained is stated in
  the row, so that part is decided; anything beyond it is pricing.

### Row 14 — AU price-anchoring page (Gate 1)
*"vs $699–$1,150 instructor-led."*

- **Audit first:** confirm CARSI's own prices from `src/lib/lms/pricing-tiers.ts` and the live
  page. The session of 2026-08-26 found `docs/marketing/association-partnerships.md` quoting ~56%
  above the live page. The live page is authoritative.
- **Done when:** the page exists, every competitor figure carries a dated source, and CARSI's own
  figures match the live page exactly. Add a check that the page's CARSI prices track
  `pricing-tiers.ts`, so drift fails a test rather than misleading a buyer.
- **Stop-line:** changing any CARSI price. Quoting the existing one is fine; setting one is not.
- **Careful:** competitor prices are claims about third parties. Date them, source them, and
  never state one you did not read.

### Row 17 — RestoreAssist bundle (Gate 2)
*"Train + document + listed, one subscription."*

- **Audit first:** this spans two products. Establish what exists on the CARSI side only.
- **Done when:** the bundle is specified and whatever CARSI-side plumbing exists is built and
  tested behind a flag that is OFF.
- **Stop-line:** the bundle price, the Stripe product, and the flip. All money. Log to DECISIONS
  with a default, keep going. Do not create a Stripe object.

### Row 19 — NZ locale pass (Gate 2)
*"en-NZ gap."*

- **Audit first:** `check:au-english` enforces Australian English. Understand its rules before
  adding a second locale, or you will fight your own guard.
- **Done when:** NZ-specific content differences are identified with a decision recorded for each
  — NZ standards, NZ power (230 V/50 Hz, same as AU), NZ regulator names, NZD. The macron work on
  the proof-pack PDF (commit `b49f91be`) matters here: Māori names must render, and there is now a
  test proving they do.
- **Stop-line:** NZD pricing. Pricing is founder-only.
- **Do not:** weaken `check:au-english` to make NZ content pass. Extend its allow-list narrowly,
  never disable a rule.

### Row 21 — Evidence-layer template + one pilot retrofit (Gate 1)
*Into the course-production skill.*

- **Audit first:** read `.claude/skills/carsi-course-production/SKILL.md` and an existing course's
  reference block.
- **Done when:** the template is in the skill and exactly one course is retrofitted as the pilot.
  One, not several — rows 22 and 28 depend on this landing cleanly first.
- **Hard constraint:** never paste IICRC standard text, and never feed a standard into any AI
  tool. Both are prohibited by the IICRC's own terms and are licence-critical. Cite nominatively
  ("aligned to ANSI/IICRC S500:2021") and stop there.
- **Absence claims about a standard are banned.** You cannot prove "the standard never mentions
  X" from a section index. State what it does say. Run
  `npm run verify:standards-claim -- "<copy>"` on anything naming a standard.
- **Unblocks:** rows 22 and 28.

### Row 23 — Weekly Research Notes page (Gate 1, A→F)
*"1 distilled, cited note/week."*

- **DECISIONS #13 defaults YES.** That default is your authority to build. Build it.
- **Done when:** the page and the first note exist, every claim carries a citation, and the
  standards-claim gate passes on the copy.
- **Stop-line:** publishing externally, and any standards claim that the gate flags. The gate is a
  filter, not a guarantee — a standards claim in public copy needs human sign-off regardless.

### Row 24 — Findings→course mapping pass (Gate 1)
*Added to weekly triage.*

- **Audit first:** find the existing triage. Do not build a second one — GOAL rule 4 forbids new
  machinery.
- **Done when:** the mapping step is added to what already runs, with a test proving a finding
  reaches a course suggestion.
- **Stop-line:** none likely. This is internal process on an existing surface.

### Row 26 — Reference PDFs into the employer proof-pack (Gate 2)
*Unblocked by row 10, which is now done.*

- **Start here:** read `src/lib/server/proof-pack-pdf.ts` and its tests before touching it. It has
  a Unicode fallback (`fontFor` + Noto subset) the transcript depends on — production serves the
  font at 2,049,096 bytes, and `deploy/Dockerfile:44` copies it into the runtime image (that is
  the file `app.yaml` names; the root `Dockerfile` is not used by the deploy). Any new text you
  draw must go through `fontFor`, or you reintroduce the WinAnsi crash for non-Latin names.
- **Done when:** reference PDFs attach or link, the CEC total is untouched, and the fail-closed
  rule still holds — an unapproved course contributes 0.
- **Stop-line:** anything that would make the pack assert a CEC hour not in the approvals
  registry. That is licence-critical and founder-only.

### Row 27 — E-E-A-T metrics into the Monday pulse (Gate 1)
*"Referring domains, AI-answer presence, keyword growth."*

- **Audit first:** find the existing pulse/brief. Extend it; do not build a new one.
- **Done when:** the three metrics land in the existing brief, and each **fails closed** — the RWR
  metric is the pattern to copy (`src/lib/metrics/rwr.ts`): on a missing key or an API error it
  exits non-zero with the blocker rather than printing `0`. "0 referring domains" claims a fact;
  "I could not look" is the truth. Never conflate them.
- **Stop-line:** any metered or paid API call. Log the need and continue with whatever is free.

---

## 7. Sequencing, and what unlocks what

Take them in BACKLOG order: **12 → 14 → 17 → 19 → 21 → 23 → 24 → 26 → 27.**

Row 21 unlocks rows 22 and 28, so landing 21 cleanly grows the queue by two. Rows 15 and 18 wait
on founder-side work in rows 4 and 5 and stay out of reach. Rows 13, 16, 20, 25 and 31 are blocked
on a decision or a budget — do not attempt them, and do not re-litigate the block.

---

## 8. Ending a session

Per GOAL rule 6 and ENGINE's session rules:

1. Update every touched `BACKLOG.md` status with numbers and what is unproven.
2. Add any founder-blocked item to `DECISIONS.md` with a default and a deadline.
3. Update GOAL current-state with the RWR delta or the named blocker.
4. One line: the customer-visible delta.

**Do not push.** The release gate requires an independent cross-vendor review and Codex is rate-
limited until 2026-08-31; the founder parked the push thread until then. Four branches and their
commits sit local and complete. Committing locally is required every time; pushing is not.

---

## 9. The failure modes that actually happened here

Kept because each one cost real time or nearly shipped something false.

- A row marked `ready` that was already built and running. **Audit first.**
- A workflow green for 8 days while the thing it triggers could not report whether it worked.
  **Read the body.**
- `dispatched: 0` filed as a bug that was correct idempotency. **Check the history before
  claiming a defect.**
- `emailed: 0` quoted as evidence when `recipients: 0` meant the branch never ran. **Prove the
  instrument can return non-null.**
- A test asserting only "did not throw" on a renderer that could silently drop text. **Assert
  content.**
- A positive control aimed at CEC logic while the fix was in the font path. **Aim it at the
  defect.**
- A claim that "tomorrow's run will settle it". **A future event is not evidence.**
- An agent creating a production account because a brief said to. **The prohibition outranks the
  brief.**
