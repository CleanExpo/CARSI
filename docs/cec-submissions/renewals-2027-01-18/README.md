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

Resolved in the packs on 26/11/2026 (the live course pages still carry the original text; fix them
in the live database so the page and the pack agree):

- **`introduction-to-odour-control-and-removal-techniques`:** the stray live-site heading
  "SECTION 2: SMOKE AND SOOT DAMAGE COURSES" is removed from the pack's module list.
- **`introduction-to-structural-drying-concepts`:** a stray "WHAT YOU WILL LEARN" heading is
  removed from the module list ("What you learnt" was already kept once).
- **`introduction-to-applied-structural-drying`:** the summary no longer says records "meet IICRC
  and insurance requirements"; it now says "meet insurer and client reporting requirements".

Still open:

- **`introduction-to-psychrometry-and-the-drying-process`:** no summary or outline ("TBC — founder
  to supply learning objectives"). It is one of the 4 courses not found on the live site; see below.
- **Supporting documentation (section 7 of every pack)** lists a curriculum export, a sample
  certificate and an assessment outline. None is attached yet. Attach them, or remove the lines,
  before sending.
- **Provider name does not match the IICRC's record (decide before sending).** Checked on
  26/11/2026 against the IICRC CEC Provider Directory (https://iicrccecevents.org/, "CEC
  provider directory search"). The IICRC lists CARSI as **"CLEANING AND RESTORATION SCIENCE
  INSTITUTE (CARSI)"**, contact Phill McGurk, support@carsi.com.au, websites
  `carsi.com.au/courses` and `carsi.com.au/restoration-courses`, divisions Hard Surface, Textile,
  Restoration, Inspection and Business Skills. Every pack names the provider "Centre for
  Australian Restoration and Standards Information", the name the founder confirmed on
  26/08/2026. A renewal under a name the IICRC does not hold may not be matched to the existing
  approvals. Founder's choice: send under the registered name, or name both ("registered with the
  IICRC as Cleaning and Restoration Science Institute (CARSI)") and ask the IICRC to update the
  record. Also check that `carsi.com.au/restoration-courses`, the website on the IICRC's record,
  still resolves.
- **The directory listing is now verified.** The packs dropped "listed in the IICRC CEC Provider
  Directory" in August as unverifiable. The listing exists (see above), so it can be restored.
- **Not yet checked against the IICRC's published renewal requirements.** Neither iicrc.org nor
  iicrccecevents.org publishes the course approval or renewal rules for providers (read
  26/11/2026). Ask the IICRC (`IICRC4U@iicrcnet.org`, the instructors and schools helpdesk on
  iicrc.org) what a renewal must contain and whether `CECCourse@iicrcnet.org` is still the
  address.
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
