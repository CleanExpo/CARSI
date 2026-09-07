---
name: course-truth
description: Use before publishing, editing or refreshing ANY CARSI course, lesson, course description or course marketing copy. Resolves every factual claim to VERIFIED, JUSTIFIED or GAP with an evidence receipt, then applies the compliance-language gate separately. Fires on "new course", "update the course", "course copy", "publish this lesson", "course description", or any Course Builder run.
---

# Course Truth Pipeline

Every factual claim in a CARSI course resolves to exactly one status. There is no
fourth state, and silence is a `GAP`, not a pass.

**The pipeline's one non-obvious rule: truth and permission are different axes.**
A claim can be perfectly true and still be prohibited public language. Resolve
truth first (stages 1-3), then ask what may be said (stage 4). Collapsing the two
produces both failure modes — publishing a prohibited truth, and deleting a true
claim as though it were a lie.

## Stage 1 — Enumerate claims

Extract every factual assertion from the course: standards citations, hour counts,
CEC hours, accreditation statements, price, duration, prerequisites, outcome
claims, statistics. A sentence with a number in it is a claim. So is an implied
one — "industry standard practice" asserts that a standard exists and says that.

## Stage 2 — Resolve each claim

| Status | Requires | Meaning |
| --- | --- | --- |
| `VERIFIED` | `source_url` + `access_date` + `quote` (max 25 words) | A primary source says this |
| `JUSTIFIED` | `confidence` + `reasoning` + `best_available_source` | 100% verification is unavailable; the justification IS the product |
| `GAP` | `reason` + `recommended_action` | No defensible basis — flag for rewrite or removal |

Disagreement between two research engines is a `conflict` **sidecar** recorded
beside the original entry. It never overwrites the original and it is never a
fourth status: the original claim and the disagreement are both facts worth
keeping, and overwriting destroys the one the ledger exists to preserve.

## Stage 3 — Write the ledger

Append to `docs/audit/evidence-ledger.jsonl`. Required on every entry: `id`,
`claim`, `claim_class`, `surface`, `status`, `feeds`. Then:

```bash
node scripts/audit/validate-ledger.mjs docs/audit/evidence-ledger.jsonl
node scripts/audit/check-mutants.mjs   # the validator's own negative control
```

Never trust a green from the first command without the second having passed in
the same session. A validator that cannot fail turns every green into decoration.

## Stage 4 — The compliance-language gate

Applied to the WORDS, after truth is settled. The licence-critical class is
accreditation, qualification-equivalence, CEC and nationally-recognised-training
language. **Public copy may never claim these, regardless of the ledger status of
the underlying fact.**

The internal rigor bar may target exceeding a Cert IV or an ISO framework in
content depth. Public copy may never say so. The gate-passing formulation is
stronger anyway: *"every lesson cited to a primary source, receipt attached."*

Run the repo's existing guards — do not write a sixth:

```bash
npm run check:iicrc-compliance && npm run check:iicrc-terminology \
  && npm run check:cec && npm run check:standards-claims
```

**Known structural blind spot:** these scan repo source. Live page metadata,
URL slugs and anything rendered from the database are invisible to them. Check
those separately with a raw fetch — never a summariser, which has fabricated CEC
hours on these exact pages before (GP-519).

## Stage 5 — Currency

Every standards citation names its edition. The estate ruling is **S500:2025**.
An unversioned citation is worse than a stale one: it cannot be detected as stale
by any future sweep. Treat a missing edition as a `GAP`.

## Founder-gated — report, never attempt

Live copy changes · accreditation and RTO decisions · publication of any
benchmark-derived claim · CEC registry entries · contact with IICRC or any other
body. Finding one of these is a successful terminal state; write it up and stop.

## Wiring status

Intended as a mandatory Course Builder stage. The Course Builder is GP-560 runner
2 and **does not exist yet**, so this skill is not wired into it — stating
otherwise would be a false capability claim. When the Course Builder is built,
stages 1-3 run before content generation completes and stage 4 gates publish.

Related: `carsi-course-production` (Australian production standard),
`proof-discipline`, `control-design`.
