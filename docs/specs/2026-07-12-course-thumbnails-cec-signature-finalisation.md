# Finalisation Spec — Course Thumbnails & CEC-Accredited Visual Signature

**Status:** Complete (delivery) — Founder closeout items outstanding
**Date:** 12/07/2026
**Locale:** en-AU · Australia/Brisbane · dates DD/MM/YYYY
**Owner:** CARSI course-production
**Related PRs:** #563 (CEC signature), #564 (briefs + course drafts), #565 (thumbnails → main)

---

## 1. Vision

**Problem.** CARSI's course catalogue shipped with 15 of 37 courses carrying no
thumbnail (`thumbnailUrl: null`), leaving gaps in the LMS grid and marketing surfaces.
Separately, there was no visual language to distinguish courses that carry **IICRC CEC
Accredited** standing from those that do not — a distinction that must be legible to
students at a glance without ever misrepresenting CARSI's accreditation scope.

**Beneficiaries.** Prospective students (clear, complete, professional catalogue);
CARSI marketing (consistent, brand-fit imagery); the founder (a licence-safe mechanism
that makes accredited courses recognisable only once genuinely approved).

**Success.** Every course has a brand-consistent, text-free thumbnail on the estate's
shared Cloudinary; a single, recognisable "accreditation signature" look is defined and
wired to render **automatically and only** for courses the IICRC has approved for CEC —
absent by default, added by explicit approval.

**Why now.** The catalogue is being finalised for release; the thumbnail gaps and the
missing accreditation cue were the last visible content blockers.

---

## 2. Users

- **Student browsing the catalogue** — needs each course to look complete and
  trustworthy; needs to tell an accredited course from a non-accredited one without
  reading fine print.
- **Founder / course administrator** — needs to add CEC-accredited styling only after a
  real IICRC approval, with zero risk of a course *implying* accreditation it does not
  hold (a licence-critical failure mode).
- **Content/marketing operator** — needs to regenerate or add thumbnails later without
  bespoke credentials hunting.

**Key story.** *As the founder, when I register a course's genuine IICRC CEC approval, its
thumbnail should automatically adopt the shared accredited look — and until I do, it must
carry the ordinary course look.*

---

## 3. Technical

**Thumbnail pipeline.** `scripts/generate-course-thumbnails.ts` — OpenAI `gpt-image-1`
renders a text-free 1536×1024 background from a per-course brief, uploads to Cloudinary,
and writes `thumbnailUrl` into `data/seed/courses-catalog.json` (`--persist=seed`). Briefs
live in `data/thumbnails/course-thumbnail-briefs.json`; the idempotency ledger
`data/thumbnails/course-thumbnail-results.json` is gitignored (local only).

**Credentials (verified 12/07/2026).** The estate shares **one Cloudinary account —
`dmaulkthb`** (all 54 catalogue thumbnail URLs use it). Its credential is stored on the
**restoreassist** Vercel project as `CLOUDINARY_URL` (Encrypted → readable via
`vercel env pull`). `OPENAI_API_KEY` is present in `~/CARSI/.env` and declared on the
DigitalOcean app (`app.yaml`). The `carsi-web` Vercel project holds **no** `OPENAI_*` /
`CLOUDINARY_*` vars in any environment.

**CEC signature (fail-closed).** `scripts/generate-course-thumbnails.ts` reads the CEC
approvals SSOT `data/seed/cec-approvals.json` and applies a unified "accreditation
signature" prompt (deep navy + brushed-gold, premium rim-light, **no seals/badges/crests**)
**only** to slugs with a `status: 'approved'` entry. An empty registry yields zero
accredited styling. This mirrors the licence guard's own logic — absence of approval →
no CEC cue, never a derived one.

**Constraints.** Every course sets `iicrcDiscipline: null` (CARSI Southern Hemisphere
Restoration Designations, never IICRC discipline acronyms); no IICRC logos/marks; CEC
hours only via the approvals registry. Enforced by `check:iicrc-terminology`,
`check:iicrc-compliance`, `check:cec`.

---

## 4. Design

- **Non-accredited thumbnails.** Photoreal, Australian-produced scenes (230 V/RCD, metric,
  AS/NZS context), text-free (no words/logos/faces/UI), calm upper-left for title overlay,
  subject lower-right. Palette per course discipline.
- **Accredited signature (dormant).** A single shared look across every approved course:
  deep authoritative navy/midnight blue, brushed-gold and warm-amber accents, soft golden
  rim-light and radial gold glow — prestigious and credentialed, with an explicit ban on
  seals, badges, medallions, crests, emblems, ribbons, stamps, shields.
- **Australian context.** en-AU spelling (colour, mould, licence), AUD pricing, WCAG 2.1 AA
  for the surfaces that render these images. Custom SVG only — no Lucide icons.

---

## 5. Business

**Priority.** Release-blocking (catalogue completeness) — resolved.

**Scope delivered.** 15 missing thumbnails generated + all 37 verified; CEC signature
defined and wired fail-closed.

**Out of scope (by design).** Asserting any CEC accreditation — the registry stays empty
until the founder confirms per-course IICRC approval. No IICRC marks introduced.

**Risk & mitigation.**
- *Licence risk (implying unearned accreditation)* → fail-closed CEC, guards green, all
  courses `iicrcDiscipline: null`.
- *Data-integrity risk (seed writer re-serialises the whole catalogue)* → commits reduced
  to surgical thumbnail-only diffs; verified 0 non-thumbnail and 0 `cecHours` changes.
- *Credential risk* → shared cred used in-memory only, no `.env` file, pull shredded.

---

## 6. Implementation — delivered & verified (this session)

| # | Step | Verification | State |
|---|------|--------------|-------|
| 1 | Author 37 course briefs (text-free, AU, `iicrcDiscipline: null`) | 37/37 courses have a brief | ✅ merged #564 |
| 2 | Define fail-closed CEC signature in generator | temp-approved slug → navy/gold + mark-ban; empty registry → 0 accredited | ✅ merged #563 (`f208c8c7`) |
| 3 | Generate 15 missing thumbnails (gpt-image-1 → `dmaulkthb`) | log "14/14 generated" + 1 prior; ledger 15 done | ✅ |
| 4 | Write thumbnails into catalogue (surgical) | 15-line diff, 0 non-thumbnail, 0 `cecHours` change | ✅ |
| 5 | Land on `main` after #564 merge-race | fix-forward branch off `origin/main` | ⏳ PR #565 (auto-merge on green) |
| 6 | Guards + type-check | `iicrc-terminology`, `iicrc-compliance`, `cec`, `type-check` all pass | ✅ |
| 7 | Live-check images | sample thumbnails return HTTP 200 | ✅ |

**Acceptance criteria — met.**
- [x] 37/37 courses carry a `dmaulkthb` `thumbnailUrl`.
- [x] All thumbnails text-free and brand-consistent.
- [x] CEC signature renders **only** for approved slugs; registry empty → none styled.
- [x] Zero IICRC discipline acronyms / marks; all `iicrcDiscipline: null`.
- [x] `check:iicrc-terminology`, `check:iicrc-compliance`, `check:cec`, `type-check` green.
- [x] Every catalogue commit is thumbnail-only (no course-data drift).

---

## 7. What remains (founder-only — cannot be done by the agent)

1. **Confirm PR #565 has merged to `main`** (in flight; auto-merges on green). After merge,
   `origin/main` catalogue must show 15 populated `thumbnailUrl`s. DigitalOcean deploys
   `main` on push, so this ships to production automatically.
2. **Restore automated generation (CI).** `.github/workflows/generate-course-media.yml`
   still points at the empty `carsi-web` Vercel project and its `VERCEL_TOKEN` repo secret
   (last updated 25/06/2026) lost access (`Project not found`). Fix: add `OPENAI_API_KEY` +
   `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` to `carsi-web` production (or repoint the
   workflow at `restoreassist`), and refresh `VERCEL_TOKEN`. Until then, generation runs
   locally via the runbook below.
3. **Activate the accredited look (per course).** For each course the IICRC has genuinely
   approved for CEC, add a `status: 'approved'` entry (slug + hours) to
   `data/seed/cec-approvals.json`, then re-run the generator with `--force` for that slug —
   it will regenerate with the navy/gold signature. **Never** add an approval a course does
   not actually hold (licence-critical).

---

## 8. Operational runbook — regenerate / add a thumbnail

```bash
# 1. Source the shared Cloudinary cred (in-memory; do NOT write it to a file)
vercel link --project restoreassist --scope unite-group --yes
vercel env pull /tmp/.env.ra --environment=production --yes
#    split CLOUDINARY_URL (cloudinary://KEY:SECRET@dmaulkthb) → the three CLOUDINARY_* vars
#    take OPENAI_API_KEY from ~/CARSI/.env ; then: shred -u /tmp/.env.ra

# 2. Dry-run (no spend) to confirm the queue
npx tsx scripts/generate-course-thumbnails.ts --generate --dry-run --yes

# 3. Generate (writes thumbnailUrl into the seed catalogue)
npx tsx scripts/generate-course-thumbnails.ts --generate --yes --persist=seed
```

**Surgical-commit note.** `--persist=seed` re-serialises the catalogue at 2-space indent
while the committed file uses **1-space**, producing a ~14k-line diff. Reduce it to the
changed `thumbnailUrl` values only: restore the original and set each value in place with
`json.dumps(indent=1, ensure_ascii=False)`. The target courses already carry
`"thumbnailUrl": null`, so assign in place — a full dict rebuild silently re-copies the
`null` and reverts the write.

---

## 9. Assumptions & constraints

- `dmaulkthb` is the correct, live Cloudinary cloud (100% of catalogue URLs; the workflow's
  "`dsppmoo9z` active" note is stale).
- `--persist=seed` writes only the JSON catalogue; no database write required.
- CARSI production is served from **DigitalOcean** (deploy-on-push `main`); the `carsi-web`
  Vercel project is not the live host.

---

## 10. Approval & sign-off

| Role | Name | Decision | Date |
|------|------|----------|------|
| Delivery | Agent (Fable 5) | Delivered; acceptance criteria met | 12/07/2026 |
| Founder | Phill | Confirm #565 merge · CI restore · CEC approvals | _pending_ |

**Definition of done:** PR #565 merged to `main`, `origin/main` catalogue shows 37/37
populated thumbnails, and this spec's Section 7 items are actioned or explicitly deferred by
the founder.
