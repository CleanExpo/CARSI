# IICRC CEC submission packs — batch of 9

BACKLOG row 2. Generated 26/08/2026 by `scripts/generate-cec-submission.ts` from
`data/seed/courses-catalog.json`.

**Nothing here has been sent.** Sending is DECISIONS row 1, founder-only, and it is an external
send to `CECCourse@iicrcnet.org`. These are drafts.

Nothing in this folder creates a CEC claim. Approval is recorded afterwards by the founder in
`data/seed/cec-approvals.json`, which is the single source of truth and is validated by
`npm run check:cec`. That file currently contains `"approvals": []`, which is why no CARSI course
displays CEC hours today.

---

## One thing to settle before any of these is sent

### The provider name — SETTLED 26/08/2026

The founder confirmed the organisation's name is **Centre for Australian Restoration and Standards
Information**. Every pack now carries it, and the packs were regenerated rather than edited, so
the name comes from the generator rather than from a find-and-replace over the output.

The wrong name — "Cleaning and Restoration Science Institute" — no longer appears anywhere in the
repository except in this sentence, which names it so a future sweep knows what to look for. It had
survived because the repo carried both spellings — five of the wrong one against four of the
right one — so neither looked like the odd one out. It was corrected in six places:

| file | what it was |
|---|---|
| `scripts/generate-cec-submission.ts:25` | the `PROVIDER_NAME` literal every pack is built from |
| `app/(public)/avian-influenza-readiness/page.tsx:112` | author role in page copy |
| `app/(public)/avian-influenza-readiness/page.tsx:192` | `alternateName` in structured data |
| `app/(public)/avian-influenza-readiness/page.tsx:594` | visible on the live page |
| `app/(public)/contact/page.tsx:68` | the contact page title |
| `data/media/ccw-workshop-media-manifest.json:8` | producer credit on workshop media |

Three of those render to the public site, and one of them is `alternateName` in structured data,
which is what search engines and AI answer engines read as the organisation's other name.

### The unverifiable standing claim — CUT 26/08/2026

Every pack used to assert that CARSI is listed in the IICRC CEC Provider Directory and Online CEC
Training list. **Founder decision: cut it.** No pack makes that claim now.

It could not be checked from here. The cited host resolves to 97.74.190.62 but returns no HTTP
response to this machine. **Positive control:** `https://www.iicrc.org` returned HTTP 200 in the
same run, so the checking method worked and the failure was specific to that host. It was recorded
as *unverified*, never as false — but it is a claim about CARSI's own standing, made to the body
that grants that standing, so an unverifiable version of it does not belong in a submission.

It was cut in **two** places in the generator, not one: the "Standing" line in section 1, and a
supporting-documents bullet further down that asserted the same listing. The packs were then
regenerated, so the removal comes from the source rather than from editing ten output files.

If the listing does exist, this is worth restoring by hand on the day it can be confirmed — it is
a genuine credential. It should not come back into the template unconfirmed.

---

## Which nine, and why

Ranked among the **24 published** courses by educational hours — the longer courses are the
stronger candidates — restricted to courses that genuinely map to an IICRC discipline area.
No credit quantity is stated or implied anywhere in this batch; the IICRC determines it.

| # | slug | hours | category |
|---|---|---|---|
| 1 | `air-quality-and-odour-identification-and-deodorisation-essentials` | 1.2 | Indoor Air Quality |
| 2 | `hvac-systems-and-indoor-air-quality-what-every-technician-should-know` | 1.2 | Indoor Air Quality |
| 3 | `using-air-scrubbers-and-afds-to-improve-job-site-air-quality` | 1.2 | Indoor Air Quality |
| 4 | `dust-and-particulates-in-indoor-air-control-and-cleaning-strategies` | 1.1 | Indoor Air Quality |
| 5 | `introduction-to-drying-educational-and-institutional-sites` | 1.1 | Water Damage Restoration |
| 6 | `introduction-to-drying-health-care-facilities` | 1.1 | Water Damage Restoration |
| 7 | `moisture-mould-and-indoor-air-quality-understanding-the-link` | 1.1 | Indoor Air Quality |
| 8 | `introduction-to-drying-industrial-and-manufacturing-sites` | 1.0 | Water Damage Restoration |
| 9 | `introduction-to-drying-transportation-and-vehicles` | 1.0 | Water Damage Restoration |

A tenth candidate, `wrt-water-damage-essentials` (2.0 h), is **held back** — see below.

### Two longer courses were deliberately left out

`ccw-carsi-truckmount-operations` (6 h) and `floor-care-onboarding-operational-readiness` (8 h)
are the two longest published courses, so a duration ranking alone would have put them first.
They are excluded because they are not restoration courses. `CLAUDE.md` names the truckmount
course as the exact incident where IICRC framing was wrongly templated onto a course that has no
IICRC discipline, and states that non-restoration courses carry no IICRC, S-standard or CEC
content at all. Submitting them would repeat that error to the IICRC directly.

`avian-influenza-awareness-restoration-iaq-facilities` (1 h) is a reasonable eleventh candidate —
it is indoor-air-quality work in facilities — but it is a campaign course, so it is held back
rather than included by default.

### Held back: `wrt-water-damage-essentials`

Moved to `held-back/` and **removed from the send batch**. Its slug carries an IICRC discipline
acronym, so the URL in the pack reads `.../courses/wrt-water-damage-essentials`. `CLAUDE.md`
bans using an IICRC discipline acronym to name or brand a CARSI course, and sending this pack
would hand that URL to the IICRC itself. The course page title is already clean; the slug is not.

Same live issue as DECISIONS row 16 and BACKLOG row 31. To release it: give the course a
CARSI-owned slug, add a 301 from the old URL so no live link breaks, regenerate the pack from the
corrected canonical URL, and move it back up into the table above.

Raised as P0-WRT-COURSE-BRANDING by the independent review of head `364b996e`, 2026-08-27.
