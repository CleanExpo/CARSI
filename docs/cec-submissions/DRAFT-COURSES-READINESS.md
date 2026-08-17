# The 13 unpublished draft courses — publish readiness

Assessed 2026-08-18. These are the CEC **second batch**: the strongest candidates by depth
(3–6 educational hours each, 195 lessons between them), held out of the first submission only
because they are not in the live sitemap and a course that cannot be enrolled in invites an
avoidable rejection. Publishing them is founder-gated; nothing here has been published, and no
`status` or `isPublished` field was touched.

## Verdict

**The content is Australian-produced and holds up.** 366,000 characters of course copy were
scanned for the whole Australian-production standard — US voltages, 60 Hz mains, NEMA plugs,
Fahrenheit, feet, inches, square feet, gallons, PSI, CFM, US spellings, "metre" written as
"meter", US regulators presented as authoritative, US-centric framing, IICRC discipline
acronyms, and bare "IICRC accredited".

Every check was first proven capable of firing against a positive control, because a clean sweep
from a broken regex looks exactly like a clean sweep from clean content. All 17 fire.

**Not a single genuine Australianisation defect was found.** Every US reference in the corpus is
a deliberate contrast that teaches the Australian difference, which is the standard working as
intended rather than failing:

- `whs-fundamentals` carries a full AU-vs-US comparison table — "US 120 V / 60 Hz → **230 V /
  50 Hz**", "OSHA 1910.134 (respirators) → **AS/NZS 1715**", "GFCI → **RCD / safety switch**",
  "OSHA 6 ft fall trigger → **Managing the risk of falls** COP", "MSDS → **SDS** (GHS)" — and
  states plainly that "Australia has **no OSHA**" and that there is no "OSHA 300 log" here.
- `category-3-sewage-black-water-remediation` tells technicians not to rely on a US EPA
  registration as if it applied here, and routes therapeutic claims to the TGA.

Metric units, 230 V / 10 A power, AS/NZS standards, Safe Work Australia, state regulators and
AUD pricing are used throughout. `iicrcDiscipline` is null on all 13 and `cecHours` is 0 on all
13, so nothing claims a credit it does not hold.

## Fixed in this pass

Three places branded a CARSI course with an IICRC discipline name spelled out — the same act the
designation rule bans in acronym form, and inconsistent with the courses' own titles:

| Course | Was | Now |
|---|---|---|
| `mould-remediation-fundamentals` | lesson 1 welcomed the learner to "**Applied Microbial Remediation: Mould Fundamentals**" | "**CARSI Mould Remediation Practitioner**" — its actual catalogue title |
| `structural-drying-fundamentals` | lesson 1 welcomed the learner to "**Applied Structural Drying Fundamentals**" | "**CARSI Structural Drying Practitioner**" |
| `structural-drying-fundamentals` | module 2 titled "What Applied Structural Drying Is…" | "What Structural Drying Is…" |

Both were leftovers from before the de-IICRC pass: the catalogue titles were already correct
CARSI designations while lesson one still greeted the learner with the IICRC discipline name.

Seven remaining uses of "applied structural drying" are lowercase prose describing the technique
("this drying discipline sits within the broader applied structural drying principles") and are
left alone — that is ordinary industry language, not branding, and removing it would damage the
teaching for no licence benefit.

## Blocking the founder, not the agent

**24 instances of "CEC-accredited training leading to the CARSI … Practitioner designation"**
across all 13 courses. This is the same phrasing raised as **DECISIONS #16**, and it is
deliberately untouched: whether it is permitted is genuinely arguable, the exposure is the
licence, and rewriting it on an agent's reading is not an overnight call. Every one of these
courses carries `cecHours: 0` against an empty approvals registry, so the words and the data
currently disagree.

Answering #16 unblocks all 24 at once. If the answer is "not permitted", the fix is one pass;
if it is "permitted", nothing changes.

One typo rides along with that decision and should be fixed at the same time:
`trauma-crime-scene-decontamination-fundamentals` reads "CEC-accredited **CEC** awareness
training" — a doubled word inside the disputed phrase.

## What is missing before these can sell

| Gap | State | Owner |
|---|---|---|
| Intro videos | absent on all 13 (and on all 37 catalogue courses) | founder — external render spend |
| DECISIONS #16 | open; 24 instances hinge on it | founder |
| Publish flip | not done, deliberately — beyond agent autonomy | founder |
| CEC submission | second batch, prepared the day they publish | founder sends |

Designation metadata is present on 9 of 13; `commercial-floor-care-schools-childcare`,
`whs-fundamentals`, `psychrometry-building-science-for-drying` and
`asbestos-awareness-for-restoration-technicians` have no `meta.designation`. For the first two
that may be correct — company onboarding and general WHS are not restoration designations — but
psychrometry and asbestos awareness look like oversights worth a decision.

## Reproducing this

The sweep and its positive control were run as throwaway scripts rather than added to the repo:
GOAL rule 4 says no new machinery, and a standing Australian-units checker is a queue decision,
not something to introduce at the end of a session. It is logged to BACKLOG Discoveries instead.
