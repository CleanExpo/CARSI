# Handoff — CARSI gauntlet: two licence-critical guard bypasses closed, gate held for Codex

**Date:** 2026-08-07 (written ~12:05 local)
**Branch:** `gauntlet/carsi-credential-landing` @ `75338a51d2a73511f06cfceedd07685cda9bf2db`
**Base:** `origin/main` @ `e6df959169a8ec887dccb75b11ddc6b05634cead` (merge-base equals it)
**Supersedes:** `handoff-20260807-carsi-gauntlet-awaiting-rereview.md`

---

## 1. What changed since the previous handoff

The previous handoff was written at `3cb09b2b`, blocked on re-review. Since then:

| SHA | What |
|---|---|
| `4eb7733d` | drained reviewer round-2 P0 (visibility guard missed in-memory reads) |
| `e56aeb2d` | drained reviewer round-3 P0 (optional-chained course reads) |
| `370079f6` | **new** — `certifications:` allow was a blanket bypass |
| `75338a51` | **new** — a permitted token must not exempt the rest of the line |

The last two are mine, this session. Both are licence-critical.

## 2. The two bypasses

The branch replaced the designation rule's `allow: null` with a three-branch allow.
Two of those branches let banned branding through, because `allow` exempts the whole
LINE:

```
certifications: "IICRC WRT course for CARSI students"          -> guard PASSED
title: "IICRC WRT course for CARSI students", slug: "x-iicrc-wrt" -> guard PASSED
```

Both are CARSI courses branded with an IICRC discipline acronym — what CLAUDE.md calls a
release blocker that can cost the licence to sell courses. The guard was green on both.

`370079f6` anchors the `certifications:` allow to the only legitimate shape (a key whose
value is a list of bare credential names). `75338a51` replaces `allow` with `neutralise`
on that rule: permitted spans are deleted and the rule re-tested on the remainder, so a
legitimate slug or credential list can no longer shelter branding beside it.

Self-test went 11 block / 10 pass -> **15 block / 12 pass**. Reverting either regex turns
the new cases red, so they are not decorative.

**How they were found:** by planting strings and running the guard, not by reading the
regex. Six review rounds read that regex and none of them saw it.

## 3. Gate state — all green on `75338a51`

Every result below is from this session, on this exact head:

- `npx tsc --noEmit` -> exit 0, 0-line error file
- `npm run lint` -> exit 0 (1 unused-eslint-disable warning, 0 errors)
- `npm run test:unit` -> exit 0, **139 files / 1005 tests**
- `npm run build` -> exit 0, **153/153** static pages
- **18 of 18** guards and self-tests -> exit 0

Note: `npm test` is not a defined script in this repo and exits 1. The unit target is
`npm run test:unit`. A future session should not read that 1 as a failure.

## 4. Why this is NOT pushed — the reviewer is not a functioning gate

`scripts/pr_release_gate.py` requires an independent review bound to the exact head.
Eight rounds have now run. The last six:

| Round | Head | Verdict | Outcome |
|---|---|---|---|
| 3 | `4eb7733d` | FAIL, 3 P0 | 1 valid (drained), 2 echoes of the brief's own examples |
| 4 | `e56aeb2d` | FAIL, 1 P0 | **fabricated** — attributed a real import line to the wrong file |
| 5 | `e56aeb2d` | PASS | **missed** the `certifications:` bypass |
| 6 | `370079f6` | PASS | **missed** the slug bypass |
| 7 | `75338a51` | FAIL, 1 P0 | **refuted** — quoted a `-` line; the branch DELETED it |
| 8 | `75338a51` | FAIL, 1 P0 | **refuted** — `IICRCWRT` concatenation; 0 instances in copy |

Zero valid findings in the last five rounds: three refuted, two false PASSes over real
holes. Codex is credit-blocked until **2026-08-08** (tomorrow), and CLAUDE.md forbids
self-certifying. So the correct action is to hold, not to keep spinning rounds.

**Do not read rounds 5 and 6 as clearance.** Both passed heads that contained a
licence-critical hole.

### Citation verifier (new, reusable)

`verify_citations.py` mechanically rejects any blocking finding whose `quoted_line`
does not appear in the diff under the file it names. It indexes the **post-image only**
(`+` and context), because round 7 quoted a deleted line and called it a live defect.
Proven in both directions: rejects round 4's and round 7's findings, accepts real added
lines. Worth promoting into `skills/pr-release-gate/`.

## 5. Findings deliberately NOT fixed here

These are real and licence-critical, but they **pre-date this branch** — `SCANNED_DIRS`
is unchanged from base and the files are not in this diff. Fixing them would widen a
release-gated diff, which the merge-gate rule warns against. They want their own change
against `main`:

1. **Banned `IICRC-aligned` branding is live on public AI-citation surfaces.**
   `public/llms.txt:109,153` and `public/carsi-ai-citation-pack.md:7,11` say CARSI
   "provides IICRC-aligned continuing education". The guard is green because `public/`
   is not in `SCANNED_DIRS` — same class as the known "guard scans repo, not prod DB"
   failure. These files exist specifically to be read and cited by AI engines.
   Also present: `data/CARSI_Specialty_Courses_Collection.txt` ("IICRC ASD Aligned",
   x2), `data/thumbnails/course-thumbnail-briefs.json:381` ("WRT-aligned").

2. **Two more whole-line allow bypasses on the pre-existing rules:**
   - `Enrol in our IICRC courses today — CARSI is IICRC CEC Accredited.` passes,
     because any line containing "IICRC CEC" exempts the "IICRC courses" rule.
   - `CARSI is an IICRC Approved School — certification is obtained through an IICRC
     approved school.` passes, because the preposition allow exempts the line.

   Both want the same `neutralise` treatment now proven on the designation rule.

## 6. Pick up here

### First command

```bash
cd ~/gauntlet-worktrees/carsi-credential-20260807 && git log --oneline -1 && npm run test:iicrc-terminology
```

### Start here

1. **Re-review `75338a51` with Codex** once credits reset (2026-08-08). Regenerate the
   brief with that head SHA — a verdict bound to any other SHA is void.
2. Run `verify_citations.py` over whatever comes back before acting on it.
3. Drain any surviving P0/P1, re-run the gate, new SHA back to the reviewer.
4. Issue the receipt via `pr_release_gate.py issue`, then push and open **one draft PR**.
5. File the §5 findings separately against `main`. Item 1 is live-exposure — treat it as
   the higher priority of the two.

### Do not redo

- Do not re-render the intro videos. All 32 exist from 2026-07-16 and are live.
- Do not treat round 5 or 6's PASS as clearance.
- Do not re-derive the two bypasses in §2 — both have self-test cases now.
- Do not widen this diff with the §5 fixes.
- Do not push before the receipt exists.
- Do not fabricate CEC hours, IICRC provider numbers, reviews, lesson durations,
  specimen credential ids, or completion statistics.

## 7. Where the evidence lives

Session scratchpad
`/private/tmp/claude-501/-Users-phillmcgurk/5dbdcabf-3b0f-412d-ae86-be590627ad19/scratchpad/`:
`verify_citations.py`, `sabotage.mjs` (hostile probe of every allow branch),
`reviewer-brief-{5,6,7,8}.txt`, `ollama-review-{5,6,7,8}.raw`, `diff7.txt`.

`sabotage.mjs` is the reusable artefact — it states, per case, what the guard MUST do and
prints every disagreement. It is what found both bypasses.
