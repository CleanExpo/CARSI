# IICRC CEC renewal packs — 16 approvals expiring 18/01/2027

**Prepared:** 02/11/2026 (77 days before expiry) · **Decision:** DECISIONS #33 · **Generator:**
`scripts/generate-cec-submission.ts`, which now writes a *renewal* pack for any course already
approved in `data/seed/cec-approvals.json`.

**Nothing here has been sent.** Submitting to `CECCourse@iicrcnet.org` is founder-only. If a
renewal is not approved by 18/01/2027, the site stops showing CEC hours for that course
automatically (`npm run check:cec` is fail-closed on `expiresAt`). Nothing has to be switched off
by hand.

## What is filled, and what still needs you

The repo holds no lesson content for these 16 courses; only the live database has it. So each
pack's summary and curriculum outline were copied from the course's **live page on
carsi.com.au** (CARSI's own published wording) on 02/11/2026.

| Packs | State | What you need to do |
| --- | --- | --- |
| 12 | Summary and module outline filled from the live page | Instructor is named (Phill McGurk, DECISIONS #36). Review the flags below. |
| 4 | **The live page returned "Course Not Found"**: `introduction-to-drying-techniques-and-equipment`, `introduction-to-mould-identification-and-remediation`, `introduction-to-porous-materials-drying`, `introduction-to-psychrometry-and-the-drying-process` | First check these courses still exist and are published. They hold a CEC approval but may be unpublished or renamed. If they are live, supply the summary and outline (or ask Rana for an LMS export). If they are retired, don't renew them. **Phill decided 2 November 2026 to renew all 4 (DECISIONS #37):** Rana locates them in the production database (preflight query below) so their summaries and outlines can be filled. |

## Flags to review before you send

- **`introduction-to-odour-control-and-removal-techniques`:** the live course lists a module
  called "SECTION 2: SMOKE AND SOOT DAMAGE COURSES". That looks like a CMS error on the live site.
  Fix it in the live course or delete that line from the pack.
- **`introduction-to-structural-drying-concepts`:** the live page lists "What you learnt" twice.
  The pack keeps it once.
- **`introduction-to-applied-structural-drying`:** the summary says records "meet IICRC and
  insurance requirements". That is a loose IICRC reference you may want to reword.
- Several summaries say the content is "aligned with the IICRC S500 standard". Citing a standard
  nominatively like this is allowed.
- **Instructor:** Phill McGurk in every pack (DECISIONS #36).

## Send checklist (per course)

- [x] Instructor named (section 5)
- [ ] Summary and outline read and correct
- [ ] Sent to `CECCourse@iicrcnet.org` (date: ____)
- [ ] IICRC renewal confirmed, then a new `expiresAt` recorded in `data/seed/cec-approvals.json`
      (ask an agent; `npm run check:cec` validates it)

## For Rana: locate the 4 courses not found on the live site (read-only)

```sql
SELECT slug, title, status, is_published
FROM lms_courses
WHERE slug ILIKE '%drying-techniques%' OR slug ILIKE '%mould-identification%'
   OR slug ILIKE '%porous-materials%' OR slug ILIKE '%psychrometry%'
   OR title ILIKE '%psychrometry%' OR title ILIKE '%porous%';
```

Send Phill the rows (slug, title, status). If a course exists but is unpublished, its curriculum can be
exported for the pack; do not publish it as part of the renewal.
