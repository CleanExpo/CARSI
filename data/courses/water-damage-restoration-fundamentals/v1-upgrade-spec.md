# v1 upgrade blueprint — CARSI Water Restoration Practitioner

**Course:** `water-damage-restoration-fundamentals` · title "CARSI Water Restoration Practitioner"
**Designation:** CARSI Water Restoration Practitioner (`meta.designation` already set;
`iicrcDiscipline: null`; `cecHours: 0`). **Standard:** `docs/content/COURSE_STANDARD.md`.
**Audit today:** 3/14 floors (passes `finalQuiz`, `australian`, `licence`).

> This is a build spec, not authored content. It maps the course's existing structure to the v1
> target and lists the work per floor. Authoring, SME review and media are the gated next steps.
> Set `meta.standard: "v1"` **last** — an incomplete v1 course fails `check:course-standard --ci`.

## 1. Target metadata (floor 5.1 `metadata`)

Add to the catalogue entry's `meta`:

```json
"standard": "v1",
"standardLevel": "L2-practitioner",
"rolePaths": ["water-and-drying", "new-technician"]
```

- **L2-practitioner** because it earns a designation and will carry a practical task.
- `durationHours` is **4** today but evidenced content is only ~10% of that. Set `durationHours` to
  match the authored volume (see §4) — **do not inflate hours**, that fails the `depth` floor.
- `shortDescription` is already set — keep it.

## 2. Structure (floor 5.2 `structure`): 6 modules, each ≥3 lessons

Today 5 of 6 modules have only 2 lessons. Target: **2–3 teaching lessons + 1 module-check quiz per
module.** The existing lesson topics are sound — keep them, deepen them, and add the checks.

| Module | Current (teaching) | v1 target |
| --- | --- | --- |
| M1 Course objectives & mindset | 2 | 2 teaching + **module check** |
| M2 Water categories & classes | 2 | **3** teaching (split Cat 1/2/3 ↔ classes) + module check |
| M3 Safety & PPE by hazard | 2 | 2 teaching + module check |
| M4 Moisture assessment | 2 | 2 teaching + module check |
| M5 Drying principles & equipment | 2 | **3** teaching (add psychrometry worked example) + module check |
| M6 Documentation & AU insurance | 2 + final quiz | 2 teaching + module check + **keep the final quiz** |

Result ≈ **13 teaching lessons + 6 module checks + 1 final** (final already passes: 10 Q / 80%).

## 3. Per-floor work (from the audit gap list)

- **`lessonPattern` (5.8):** every teaching lesson gets the seven headings in order — **On the job ·
  The idea · See it · Do it in metric · Field download · Check yourself · Takeaway.** Existing prose
  maps mostly into *The idea*; the other six parts are new (see the Module-1 worked scaffold at
  `./scaffold/module-1-water-restoration.md`).
- **`lessonWords` (5.9):** each teaching lesson to **≥400 words** (target 450–600). Today they are
  129–230.
- **`visual` (5.10):** each teaching lesson carries **one** visual — a hand-drawn SVG diagram under
  `public/courses/water-damage-restoration-fundamentals/diagrams/` (follow the Level-2 Mould diagram
  rules in the production skill: viewBox `0 0 800 H`, CARSI wordmark top-right, `check:course-diagrams`
  green), a field photo, or a 2–4 min lesson video.
- **`metricExample` (5.11):** each teaching lesson has **one worked example in metric** — e.g. a
  230 V / 10 A power budget for dehumidifiers + air movers, a g/kg humidity-ratio drying target, an
  m²/m³ affected-area calc. 6/12 lessons already contain a metric quantity; the rest need one.
- **`fieldDownloads` (5.7):** **one field tool per module** as a `.md`/PDF under
  `public/courses/water-damage-restoration-fundamentals/field-tools/` referenced in a lesson's
  `resources[]` with a download `kind`. Suggested set: M1 restoration-mindset one-pager; M2 water
  category/class decision card; M3 hazard→PPE selection card; M4 moisture-map + dry-goal sheet;
  M5 drying-equipment power-budget calculator; M6 defensible job-file checklist.
- **`moduleChecks` (5.4) + `explanations` (5.5):** each module check pools **≥3 questions per
  teaching lesson** in that module; **every** question has a practitioner-written "why" of ≥20
  chars. Put them in `data/seed/water-damage-restoration-fundamentals-quiz.json` and link via
  `meta.quizFile` (mirror `data/seed/level-2-mould-remediation-30ee3492-quiz.json`).
- **`practical` (5.12):** add `data/seed/water-damage-restoration-fundamentals-assessment.json`
  (matches `LmsPracticalAssessment`): instructions + **≥3 rubric criteria**. Link via
  `meta.practicalAssessment`. A skeleton is at `./assessment-skeleton.json` (criteria left empty for
  SME authoring — no invented rubric). Suggested criteria axes: correct category/class call;
  hazard-led PPE; moisture map + defensible dry goal; job-file completeness.
- **`finalQuiz` (5.6):** already passes — leave it.
- **`depth` (5.3):** clears once §4 content volume is authored.

## 4. Depth math (floor 5.3 — evidenced ≥ 50% of stated minutes)

Evidenced minutes = words ÷ 230 + lesson-video minutes + (quiz questions × 1.5).

Worked target for L2 at **`durationHours: 6`** (360 stated min; need ≥180 evidenced):

| Source | Volume | Evidenced min |
| --- | --- | --- |
| 13 teaching lessons × ~500 words | ~6,500 words | ~28 |
| Lesson videos (13 × ~3 min, `durationMinutes` recorded) | — | ~39 |
| Module checks (6 × ~6 Q) + final (10 Q) ≈ 46 Q | — | ~69 |
| Practical (not counted by the audit) | — | 0 |
| **Total** | | **~136 → set `durationHours` to ~4.5, or add video, to clear 50%** |

**Honest conclusion:** to hold L2 at 6 h and pass `depth`, the course needs either richer lesson
videos or more lesson text than the 500-word floor. Author the content first, then set
`durationHours` to the evidenced reality (≈ evidenced ÷ 0.5 ÷ 60, rounded down). The audit's
evidenced % is an internal measure only — never shown to learners.

## 5. Asset inventory to create

| Path | What | Floor |
| --- | --- | --- |
| catalogue entry `meta` | v1 markers (§1) | metadata |
| catalogue `modules[].lessons[].contentBody` | 13 lessons rewritten to the 7-part pattern | pattern, words, metric |
| `public/courses/water-damage-restoration-fundamentals/field-tools/*.md` | 6 field tools (1/module) | fieldDownloads |
| `public/courses/water-damage-restoration-fundamentals/diagrams/*.svg` | ≥1 visual per lesson (where not video) | visual |
| `data/seed/water-damage-restoration-fundamentals-quiz.json` | 6 module checks (≥3 Q/teaching lesson, explanations) | moduleChecks, explanations |
| `data/seed/water-damage-restoration-fundamentals-assessment.json` | practical rubric (≥3 criteria) | practical |

## 6. Order of operations

1. Author lesson prose + metric examples (SME) → 2. Build field tools + diagrams → 3. Author module
checks + explanations + practical rubric → 4. `npm run audit:course-depth` (report) until 14/14 →
5. Add the `meta.standard`/`standardLevel`/`rolePaths` markers → 6. `npm run check:course-standard`
(--ci) green → 7. AU/IICRC/CEC/standards/diagram guards green → 8. SME + founder sign-off →
9. media generation (briefs already staged) → 10. seed + publish (founder). Steps 8–10 are gated.

## 7. Guards that must stay green on every edit

`check:au-english`, `check:iicrc-terminology`, `check:iicrc-compliance`, `check:cec`,
`verify:standards-claim -- "<any line naming a standard>"`, `check:course-diagrams`. `cecHours`
stays **0** until the founder records an IICRC approval in `data/seed/cec-approvals.json`.
Reference IICRC S-standards **nominatively only** — never paste standard text (IICRC AI-use policy).
