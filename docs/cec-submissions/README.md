# IICRC CEC submission packs — outbox

Generated 2026-08-18 for BACKLOG #2. **Nothing here has been sent.** Sending is founder-only
(DECISIONS #1, deadline 2026-08-20) — agents never make an external send.

Regenerate any pack with:

```
npx tsx scripts/generate-cec-submission.ts <course-slug> --out docs/cec-submissions/<course-slug>.md
```

## What is in this batch

Ten packs, requesting **11 CECs** in total. Send `COVER-EMAIL.md` to CECCourse@iicrcnet.org with
the ten pack files attached (or pasted, if the IICRC prefers inline).

| # | Course | Educational hours | CECs requested |
|---|---|---|---|
| 1 | Water Damage Restoration — Essentials | 2 | 2 |
| 2 | Air Quality and Odour: Identification and Deodorisation Essentials | 1.2 | 1 |
| 3 | HVAC Systems and Indoor Air Quality | 1.2 | 1 |
| 4 | Using Air Scrubbers and AFDs to Improve Job Site Air Quality | 1.2 | 1 |
| 5 | Dust and Particulates in Indoor Air | 1.1 | 1 |
| 6 | Moisture, Mould, and Indoor Air Quality: Understanding the Link | 1.1 | 1 |
| 7 | Introduction to Drying Educational and Institutional Sites | 1.1 | 1 |
| 8 | Introduction to Drying Health Care Facilities | 1.1 | 1 |
| 9 | Introduction to Drying Industrial and Manufacturing Sites | 1.0 | 1 |
| 10 | Introduction to Drying Transportation and Vehicles | 1.0 | 1 |

## How these ten were chosen

Three filters, in order. Each one removed courses that would have weakened the submission.

1. **Live and sellable.** Every course above is in the production sitemap today, so an approval
   converts into a CEC badge on a page that already takes money. The catalogue seed holds 37
   courses and the live site 80; 24 appear in both, and the ten come from that overlap.
   Thirteen substantive drafts (4–5 hours each: mould remediation, structural drying, category 3,
   psychrometry, fire and smoke, trauma, carpet cleaning, timber floor, WHS, asbestos) are
   deliberately **excluded** — they are the strongest CEC candidates by depth, but they are not
   published, and submitting a course that cannot be enrolled in invites a rejection that is
   avoidable by waiting. They are the obvious second batch, the day they go live.

2. **At least one educational hour.** IICRC CEC arithmetic is 1 CEC per educational hour, so a
   sub-hour course earns nothing on its own. Fourteen live courses run 0.5–0.7 hours and are held
   back; several could be bundled into a single submission of combined hours, which is a founder
   decision, not an agent one.

3. **Genuinely within an IICRC subject area.** Three live courses with the most hours are
   excluded on purpose, because CLAUDE.md makes IICRC framing opt-in per course and these are not
   IICRC subject matter:
   - `floor-care-onboarding-operational-readiness` (8 h) — company onboarding and floor care
   - `ccw-carsi-truckmount-operations` (6 h) — equipment operation; the exact course CLAUDE.md
     cites as the incident that made CEC framing fail-closed
   - `avian-influenza-awareness-restoration-iaq-facilities` (1 h) — biosecurity awareness

## Two things to look at before sending

- **`wrt-water-damage-essentials` shows an IICRC discipline acronym in its public URL.** The
  pack prints `https://www.carsi.com.au/courses/wrt-water-damage-essentials`, so the submission
  itself displays a CARSI course branded with an IICRC Registered-Training-School acronym —
  against CLAUDE.md's CARSI designation rule, and in front of the body that owns the mark. Three
  more live courses have the same problem (`asd-structural-drying-core`,
  `cct-commercial-carpet-core`, `fsrt-fire-smoke-restoration-core`). A rename is public URL
  surface and needs redirects, so it is raised as DECISIONS #15 rather than done unilaterally.
- **No course displays a CEC hour today, and none may until approval lands here.**
  `data/seed/cec-approvals.json` is empty and is the only source `resolveCecHours` reads. On
  approval, the founder adds `{slug, status: "approved", approvedHours, approvedAt,
  iicrcReference, evidence}` to it; `npm run check:cec` validates the entry.

## Note on the generator

`scripts/generate-cec-submission.ts` used to request 1 CEC for any course, however short —
`Math.max(1, Math.floor(hours))` turned a 0.5-hour course into a 1 CEC request on the same line
that states "1 CEC per educational hour". That is a 2x overstatement in a document addressed to
the IICRC, and it was fixed alongside this batch: a course under one educational hour now
requests none and says so.
