# Evidence-layer template (BACKLOG #21 — Evidence Engine, TEACH stage)

The evidence layer is how a CARSI course proves what it teaches. It is the founder's 2026-08-16
Evidence Engine spec (2nd Brain `Plans/carsi-engine/CARSI-EVIDENCE-ENGINE-SPEC.md`) made
concrete for one course at a time. Rule zero is **cite-or-cut: no graded source, no claim.**

It reuses what already exists and adds no new machinery:

| Need | Reused from |
| --- | --- |
| Claim statuses (VERIFIED / JUSTIFIED / GAP) | `course-truth` skill |
| Record schema + validator + negative control | `scripts/audit/validate-ledger.mjs`, `scripts/audit/check-mutants.mjs` |
| Evidence grades (A1–C3) | 2nd Brain vault grades (Admiralty style) |
| Public per-lesson source list | the existing `<h3>Sources for this lesson</h3>` block (ozone/hydroxyl course) |
| Standards rules | `CLAUDE.md` "Standards claims" + "IICRC standards IP + AI use" |

---

## 1. The four parts of every substantive point

A **substantive point** is anything a technician could act on or be challenged on: a number, a
threshold, a safety step, a regulatory duty, a standards reference, a product or availability
statement, a price, a duration, an outcome. (`course-truth` Stage 1: a sentence with a number in
it is a claim.)

| Part | What it holds | Where it lives |
| --- | --- | --- |
| 1. **Governing requirement** | Nominative citation with edition, e.g. ANSI/IICRC S500:2025, Model WHS Regulations r 487 or AS/NZS 3760:2022. We do not reproduce the standard's text. | Lesson copy + ledger `part: "requirement"` |
| 2. **Why it works** | The mechanism in plain Australian English, in CARSI's own words. | Lesson copy ("The idea") + ledger `part: "mechanism"` when it carries a checkable fact |
| 3. **What the evidence shows** | The graded source(s) behind the point. | Ledger `part: "evidence"` with `evidence_grade` |
| 4. **References** | Public, linkable list for the lesson. | `<h3>Sources for this lesson</h3>` block, generated from the ledger |

Parts 1–3 are recorded in the course's ledger. Part 4 is the public face of that ledger and must
never list a source the ledger does not hold.

## 2. Evidence grades — Admiralty style, as the 2nd Brain vault sets them

Reliability letter × credibility number, set once per source and applied to how it was read.

| Grade | Means | Typical CARSI source |
| --- | --- | --- |
| **A1–A3** | Regulator, legislation, standards body, university, peer-reviewed or standard physics, read in full. A3 = a regulator's plain-language page whose figures carry no method. **A vendor is never A.** | Safe Work Australia, legislation.gov.au, Standards Australia catalogue page, Bureau of Meteorology, ACCC, CSIRO, a journal paper |
| **B1–B3** | Practitioner or reputable secondary source, or a partial read. B3 = opinion-led or no data shown. | Industry association guidance, trade body technical note, manufacturer manual read in full |
| **C1–C3** | Individual or commercial source. | Vendor product page, blog, forum, a single practitioner's video |
| *(below C3 / ungraded)* | **Not usable.** Cite-or-cut: rewrite, remove, or find a graded source. | — |

A discovery tool (Google Scholar, a search engine, an AI summary) is never the source — grade the
underlying paper, page or regulator record you actually read.

**Availability exception (DECISIONS #54, founder 03/11/2026).** An Australian distributor's or
stockist's own product page is sufficient evidence that a product is **sold in Australia** — for
**availability only**. Such a row may be `VERIFIED` at grade **C1**, and must carry
`claim_type: "availability"` so the exception is explicit on the row. It is never evidence for a
performance or specification claim (output, efficacy, accuracy, power draw, battery life,
certification): those still need an A or B source, or stay `JUSTIFIED` / `GAP`. A claim that
bundles availability with a specification ("sold in Australia and runs on batteries") should be
split so the C1 row carries the availability half only. No other C-grade source may support
`VERIFIED`.

## 3. Which status each point gets

| Situation | Status | Grade | Required fields (validator-enforced) |
| --- | --- | --- | --- |
| A primary source was opened and says this | `VERIFIED` | A or B | `source_url`, `access_date` (ISO), `quote` (≤ 25 words) |
| An Australian distributor's or stockist's own product page shows the product is sold here (availability only, DECISIONS #54) | `VERIFIED` | C1 | as above, plus `claim_type: "availability"` |
| Our own arithmetic from a graded method (e.g. psychrometric humidity ratio), or a labelled illustrative teaching number | `JUSTIFIED` | grade of the method's source | `confidence` (high/medium/low), `reasoning`, `best_available_source` |
| Not yet verifiable here (licensed standard wording, stale product check, a figure with no source) | `GAP` | — | `reason`, `recommended_action` (`rewrite` / `remove` / `substantiate`) |

**A `GAP` is non-passing** (Designation Vetting Standard, stage 2). A course carrying an open
`GAP` on a substantive point does not go live: the point is rewritten, removed, or substantiated
first. Drafts may carry GAPs — that is what makes the SME's job visible.

Standards wording is a special case. The IICRC prohibits entering its standards into any AI tool,
and the licensed section index is not in this repository (CLAUDE.md: mirrored in RestoreAssist).
So an agent may record **that** a lesson is aligned to "ANSI/IICRC S500:2025", but any statement of
**what a section requires** is a `GAP` / `substantiate` until the licence holder (SME) confirms it
against the licensed copy. Cite a `§` only if it exists in the licensed index. **Absence claims
about a standard are banned outright.** An unversioned citation is a `GAP` (`course-truth`
Stage 5; the estate ruling is S500:2025).

## 4. Where the record lives

One ledger per course, in the existing schema, beside the course's other data:

```
data/courses/<slug>/evidence/evidence-ledger.jsonl        # a course still in a staging folder:
data/courses/<slug>/<stage-folder>/evidence/evidence-ledger.jsonl
```

Point to it from the catalogue entry, alongside any existing `meta.sourceRegister`:

```json
"meta": { "evidenceLedger": "data/courses/<slug>/evidence/evidence-ledger.jsonl" }
```

Site-level and catalogue claims stay in `docs/audit/evidence-ledger.jsonl` as `course-truth`
describes. A course ledger holds that course's content claims only.

### Entry shape

Every entry carries the six fields `validate-ledger.mjs` requires — `id`, `claim`, `claim_class`,
`surface`, `status`, `feeds` — plus the status's own fields. The evidence layer adds four fields
the validator accepts and ignores, so the existing negative control still covers every rule:

| Field | Value |
| --- | --- |
| `id` | `<COURSE-CODE>-<NNN>`, stable once written (e.g. `WRP-014`) |
| `claim_class` | one of: `regulatory-duty`, `standards-citation`, `electrical`, `psychrometric`, `measurement`, `safety-threshold`, `product-availability`, `price`, `consumer-law`, `method` |
| `surface` | `course:<slug>#<lessonId>` (or `#quiz:<quizId>` / `#assessment`) |
| `feeds` | `["course:<slug>"]` |
| `lesson_id` | the lesson UUID the claim appears in |
| `part` | `requirement` / `mechanism` / `evidence` |
| `evidence_grade` | `A1`…`C3` (VERIFIED and JUSTIFIED entries) |
| `claim_type` | `"availability"` on a `VERIFIED` C1 row resting on an Australian distributor/stockist page (DECISIONS #54). Omit otherwise. |
| `check_by` | ISO date the source must be re-read (drift-prone facts: 3–6 months) |
| `also_in` | optional array of other `course:<slug>#<lessonId>` (or `#quiz:…`, `#assessment`, `#description`) surfaces where the same claim is taught. Record a repeated claim once, at its first lesson, and list the repeats here — never duplicate the entry. A lesson's Sources block covers entries whose `lesson_id` is that lesson **or** whose `also_in` names it. |

Worked examples that pass the validator: `evidence-layer-template.example.jsonl` beside this file.

## 5. The public block in each lesson

Last element of every teaching lesson, after "Takeaway". Same markup as the ozone/hydroxyl course,
so Row 22's course-page References block can read one shape:

```html
<h3>Sources for this lesson</h3>
<ul>
  <li><a href="https://www.safeworkaustralia.gov.au/..." target="_blank" rel="noopener noreferrer">Safe Work Australia, Page title</a>. Read 02/11/2026.</li>
  <li>ANSI/IICRC S500:2025, Standard and Reference Guide for Professional Water Damage Restoration (cited by name; no text reproduced).</li>
</ul>
```

- One `<li>` per ledger source for that lesson (`VERIFIED` `source_url`, or a `JUSTIFIED`
  `best_available_source` that is a public URL), counting entries whose `lesson_id` is the lesson
  or whose `also_in` names it. Australian date order in copy; ISO in the ledger.
- A lesson whose claims are all open `GAP`s says so in its block rather than listing nothing
  silently (the pilot uses "No external source is cited for this lesson yet").
- A standard is listed by name and edition only, never linked to pasted text.
- Never list a source the ledger does not hold, and never list a `GAP` as a source.

## 6. Checklist before the layer counts as done

- [ ] Every substantive point in every teaching lesson, quiz explanation and the assessment has a
      ledger entry. Silence is a `GAP`, not a pass.
- [ ] `node scripts/audit/validate-ledger.mjs <ledger>` exits 0, **and** you planted one bad entry
      (e.g. a `GAP` with `recommended_action: "launder"`) and watched it exit 1 — a guard's
      silence is not a pass.
- [ ] `node scripts/audit/check-mutants.mjs` exits 0 in the same session.
- [ ] Every standards citation names its edition; no `§` outside the licensed index; no standard
      text; no absence claim. Each line naming a standard passes
      `npm run verify:standards-claim -- "<line>"`.
- [ ] Each lesson's "Sources for this lesson" matches its ledger entries.
- [ ] `npm run check:course-standard` (or `--seed-dir=<staging>` for a staging folder),
      `check:au-english`, `check:iicrc-terminology`, `check:iicrc-compliance`, `check:cec`,
      `check:standards-claims` all exit 0.
- [ ] Open `GAP`s are listed for the SME, each with its `recommended_action`.

## 7. Known limits (state them, don't hide them)

- **Not CI-enforced yet.** Course ledgers are validated by running the validator by hand. Wiring
  every course ledger into CI is BACKLOG row 28 ("guards on"). Until then a ledger nobody runs is
  unchecked.
- The validator proves shape, not truth. It cannot tell whether a quote is really on the page — a
  human spot-checks a sample of `VERIFIED` entries before publish.
- Licensed standards wording cannot be verified from this repository at all (see §3).
