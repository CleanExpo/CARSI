# GP-567 — Run 1 record

**Date:** 2026-09-07 · **Base:** `origin/main` @ `2aa6b9a2` ·
**Branch:** `phillmcgurk/gp-567-goal-carsi-full-catalogue-audit-100-true-or-justified`
**Mode:** audit + research only. No live copy changed, no guard modified, no course edited.

## Ledger counts

| Status | Count |
| --- | ---: |
| VERIFIED | 12 |
| JUSTIFIED | 1 |
| GAP | 13 |
| CONFLICT sidecars | 1 |
| **Total entries** | **26** |

One cross-engine conflict IS recorded, on GP567-025 — see "Round 3" below. The
sidecar exists so a disagreement sits *beside* the original claim instead of
replacing it; this is its first use.

## Independent review and what it changed

Reviewed by the **cursor** lane at `6e92de9b` (codex was quota-exhausted until
2026-09-12; a shell-capable lane was required because only those can execute a
mutation control). Verdict **FAIL, 4 × P1**. All four were accepted as real; three
were adopted as stated and one had a correct premise with an incorrect conclusion.

**P1-1, matcher false negative — adopted.** The token matcher dropped tokens of
length ≤ 3, deleting the level digits, then scored `inter / min(|A|,|B|)`, which
rates a strict subset as a perfect 1.0. `level-2-` and `level-3-mould-remediation`
were both being matched to live `level-1-mould-remediation-2cc96b85`. Fixed:
numeric tokens are always retained, a hard gate rejects any match whose numeric
tokens differ, and scoring is Jaccard. New criterion **c10** pins the property, and
was proven to fire by reintroducing the defect — it names the exact case
(`level-3 → level-1 (3 vs 1)`).

**P1-2, "18 is not defensible" — premise accepted, conclusion corrected.** The
review inferred that fixing P1-1 "yields at least 20 gaps". It does not. All three
levels exist live under hash-suffixed slugs — `level-1-…-2cc96b85`,
`level-2-…-30ee3492`, `level-3-…-c5797369`, verified directly in `sitemap.xml`. The
defect mis-*targeted* those matches; it did not hide them. **The gap count remains
18**, now produced by a matcher that maps each level to its own counterpart. The
review's own re-derivation of every other figure (80 / 95 / 71 / 182 / 38 / 274 /
20 / 233 / 4) reproduced, which is useful corroboration.

**P1-3, criterion c8 drift — adopted, and the most serious of the four.** Criterion
c8 requires the meta/og claims filed as **GAP**. The verifier instead asserted that
the accreditation entry was JUSTIFIED and never checked GAP at all — it tested what
had been built rather than what the criterion demanded. The implementation was
changed to meet the criterion; the criterion was not rewritten to match the
implementation, which would have been self-certification.

**P1-4, the JUSTIFIED filing was a rationalisation — adopted.** Two errors, one
inside the other. First, `JUSTIFIED` means 100% verification is *unavailable*, not
merely *not attempted*, and unavailability had never been established. It has now
been: a search for a public IICRC register of approved CEC providers found none —
IICRC manages approval by submission to `CECCourse@iicrcnet.org` (the address this
repo already scripts against) and directs enquirers to contact IICRC, which is
founder-gated. Second and more important, the entry **conflated two different
claims**. "CARSI holds 38 approved CEC *courses*" is evidenced by the registry.
"CARSI is an IICRC CEC **Accredited provider**" is what the live marketing copy
actually says, and nothing located establishes it. These are now separate entries:
the per-course claim is JUSTIFIED with evidenced unavailability; the provider-level
claim is a **GAP**, as are both live surfaces asserting it.

### Round 3 — `56b96871`, cursor, FAIL / 3 P1 (all eight checklist items PASS)

**P1-1 — the round-2 fix failed its own claim, and the reviewer proved it by
running it.** Round 2's coverage assertion derived its obligation from four
exported field lists and matched mutant *name strings* with a regex. Two attacks
defeated it: deleting the real "quote over 25 words" mutant left the suite
printing OK on 26 mutants, because the quote / ISO-date / sidecar / feeds rules
are not reachable from any of those lists — uncovered **by construction**; and a
mutant kept under the name "missing status" while planting a dropped `id` also
passed, because the check read the name.

Both holes have one root: **coverage was inferred from names.** The validator now
emits a machine-checkable rule id beside every violation and exports the complete
`RULES` registry. `check-mutants.mjs` derives its obligation from that registry
and discharges it only when a rule is **observed firing** during the run. A rule
with no mutant is named; a mutant that does not trigger the rule it declares is
named. Neither is satisfiable by naming. Rebuilding this way immediately exposed
a rule that had never had a mutant — `conflict-not-object` — plus four
file-level rules that were never covered at all. Suite went 27 mutants to 28
entry + 4 file mutants across 31 registry rules.

**P1-2 — criterion-vs-recipe drift, the same class as round 1's c8.** c5 requires
every S500 citation flagged with the edition asserted AND the contamination count
reproducible. The verifier compared exactly one number. The reviewer planted
Total=1, 2025=99, unversioned=1, left the 2021 row intact, and it still exited 0 —
five sixths of the table was unenforced decoration that a green criterion vouched
for. All seven measures are now re-derived and compared, and the recorded classes
must sum to the recorded total.

That sum is what surfaced **the finding below**, which no amount of checking the
2021 row alone would ever have reached.

**P1-3 — the licence classification. REJECTED on the merits, and recorded as a
conflict rather than argued away.** The reviewer held that GP567-025 should be
JUSTIFIED, since GP567-013 treats the same absent public IICRC register as grounds
for JUSTIFIED, making the pair incoherent. The premise does not hold: GP567-013
has a **primary artefact** (`cec-approvals.json`, citing a founder-supplied PDF)
and lacks only independent public re-verification, which is the JUSTIFIED
condition exactly. GP567-025 concerns a **different object** — provider standing,
not course approvals — and has no artefact at all; its own reason already records
that the PDF is a class list, not a provider credential. JUSTIFIED requires a
`best_available_source` and there is none to name. The two bases offered were
CLAUDE.md's identity SSOT — repository prose, which per the estate done-gate
proves only that the documentation makes the claim — and the inference that 38
course approvals are incoherent without provider standing, which is an inference,
not a source. Deciding a licence-critical public accreditation claim on an
inference is the specific risk CLAUDE.md names as able to cost the licence to sell
courses.

The reviewer did expose a real defect underneath: the two entries **read** as
identical, because the distinction sat buried in both. Both now state it
explicitly, and the disagreement is preserved verbatim in the `conflict` sidecar
on GP567-025 — the first use of a mechanism the ledger has defined since day one.

## Finding #7 — 21 lines assert an S500 **2026** edition, and no check could see them

The currency sweep published 274 total citation lines while its named classes —
2021, 2025, unversioned — summed to **253**. The 21-line difference asserted an
S500 **2026** edition, a class the sweep named nowhere and no criterion counted.
The table looked complete, and the criterion was green, because nothing ever added
the rows up. This is the sharpest instance in the run of a measurement that reads
as exhaustive while carrying a blind spot the size of its own gap.

The affected lines sit across **6 files** in the `docs/course-updates/` staging area:
five course-update drafts, each carrying `Status: DRAFT — founder review before any
DB apply`, plus that folder's `README.md` index, which itself states *"Staging only.
These are DRAFTS for founder review."* So nothing is live today. The exposure is on
apply: they become published course copy the moment a draft is applied.

**Correction — this said "one draft" until the gemini lane caught it at `0968bcdc`.**
The count came from eyeballing the first four lines of a 21-line sample, which all
happened to come from the same file, and generalising. The sweep's own generated
file list said 6 the whole time. A sample is not a census, and the number was
asserted in the run record, the ledger entry and the PR body before anyone checked
it against the artefact that was already sitting there.

**No ruling is made on whether an S500 2026 edition exists.** CARSI's licensed
section index is mirrored in RestoreAssist per CLAUDE.md and is **not present in
this repository**, so no licensed source is reachable from this checkout, and
CLAUDE.md forbids a scrape or trade-press paraphrase as the basis for any published
claim about a standard — and bans absence claims outright. Filed as **GP567-026,
GAP, `substantiate`**: verify against the licensed index before this draft is
applied.

## What this run established

**The catalogue, measured.** 80 live course URLs (sitemap and JSON-LD agree), 95
WordPress legacy records (84 published), 71 seed courses on `origin/main`. 182
distinct slugs across all three sources.

**The parity-gap number was wrong in both directions.** Naive slug matching reports
78 legacy-only courses. Three matchers — exact slug, normalised title, token
overlap ≥0.6 — reduce that to **18 genuine gaps** (17 published, 1 draft). The
60 records in between are matched, not missing: **48** by normalised seed title and
**12** by token overlap, so 18 + 60 = 78. The card's figure of 31 is not reproduced
by any matcher setting tried, and is filed as a GAP against the card itself.
Reproduce: `node scripts/audit/parity-analysis.mjs`.

**Two card figures are not reproducible.** "93 planned / 5 seeded" does not match
the 71 seed courses on `origin/main`. Both are recorded as UNOBSERVED rather than
quietly reconciled.

**GP-525 changed shape but did not go away.** It was filed when the CEC approvals
registry held zero entries. The registry now holds **38 approved entries** (batch
dated 2024-01-18, evidence `CARSI_courses.pdf` supplied by the founder 2026-08-27).
But `carpet-cleaning` and `carpet-cleaning-basics` — the two courses GP-525 names —
are **still not among the 38**. Do not close GP-525 on the grounds that the
registry is no longer empty.

**Finding #1: the live copy claims provider accreditation that nothing supports.**
The `/courses` meta description calls CARSI "an IICRC CEC Accredited provider" and
the og:description adds "Earn continuing education credits". Both are filed **GAP**.
The registry evidences 38 approved *courses*; it does not evidence *provider*
accreditation, and no public IICRC provider register exists to check against. Only
38 of 80 live courses carry an approval, so "Earn continuing education credits" is
also unsubstantiated for most of the catalogue. Separately, the wording is in the
prohibited public-language class per GP-560 — but the reason it is a GAP is that
the claim itself has no established basis, not merely that it is unsayable.

**Every repo guard passes while the live site serves prohibited language.** Five
guards exit 0. They scan repo source; the strings are served from live page
metadata. The blind spot is structural, not a missing rule — no amount of guard
tuning reaches it.

**GP-526 has a live residual.** Four live course URLs still lead with IICRC
discipline acronyms: `cct-commercial-carpet-core`, `wrt-water-damage-essentials`,
`fsrt-fire-smoke-restoration-core`, `asd-structural-drying-core`. GP-526 fixed the
render boundary and was closed Done; URLs were not in that fix.

**The currency picture is worse than 2021-vs-2025.** 274 S500 citation lines across
49 files. 20 lines assert the 2021 edition; **zero assert 2025**, against the estate
ruling. **233 lines cite S500 with no edition at all** — the quiet majority, and the
one no future sweep can detect as stale. A further **21 lines assert a 2026 edition**
no licensed source in this checkout can confirm or deny; all 21 sit in course-update
drafts, and they are filed as GP567-026. The four classes account for every line:
20 + 0 + 233 + 21 = 274. Reproduce: `node scripts/audit/check-currency-sweep.mjs`.

**A verified negative, recorded so nobody chases it.** `cppp40421_unit_code` exists
in the legacy schema but is populated on zero records. There is no live AQF
unit-code exposure.

## Deferred — explicitly not done this run

| Deliverable | State | Why |
| --- | --- | --- |
| D5 role × market matrix | **not started** | Needs per-course content analysis across 182 slugs; a run of its own |
| D6 benchmark matrix vs AQF/ISO | **not started** | Depends on D5; also the highest-risk deliverable to get wrong, so it should not be rushed at the end of a run |
| D8 fresh-context citation audit | **not started** | Should run against a larger ledger than 26 entries to be worth the pass |
| Cross-engine verification | **not exercised** | No contested claim arose that a second engine would settle |
| `check:cec-surfaces` | **not run** | Imports `typescript`; a git worktree has no `node_modules`. Environment limit, not a repo defect |
| D2 full-catalogue coverage | **batch 1 only** | 26 entries covers catalogue-level and licence-critical claims, not per-lesson content |

## Second engine

The founder directed `perplexity/sonar-deep-research` via OpenRouter. **OpenRouter is
exhausted**: HTTP 200, `total_credits` 2619.31043075 against `total_usage`
2619.308990219 — **$0.00144 remaining**, against a deep-research call costing dollars.
`PERPLEXITY_API_KEY` does exist in `~/.hermes/.env`, so a direct lane is available
without placing any new key. It was still not used, but the original reason — that
no claim was contested — stopped being true in round 3, so it is restated rather
than left standing: **two claims are now contested and neither is settleable by a
web research call.** GP567-025 (provider accreditation) is founder-gated by IICRC's
own process, which directs enquirers to contact IICRC directly. GP567-026 (the
S500 2026 edition) must be checked against the owner's **licensed** store, and
CLAUDE.md explicitly forbids a scrape or trade-press paraphrase as the basis for
any published claim about a standard — so a research call could only produce
evidence this project is not permitted to rely on. Recorded as a founder spend
decision, not topped up.

## Next run — first batch named

**Batch 2: the 18 genuine parity-gap courses**, `docs/audit/parity-analysis.json`
→ `parity_gaps[]`, the 17 published ones first. For each: resolve the CEC-hours
claim against the 38-entry registry, the discipline-acronym exposure, and the
standards citations. This batch is chosen because every one of these courses is
published in the legacy platform while absent from the live catalogue, so each is
both a content-truth question and a live-exposure question at once.

Then batch 3: the 12 token-overlap matches, whose slug identity is a heuristic
judgement and should be confirmed or overturned individually before any inventory
number built on them is cited.
