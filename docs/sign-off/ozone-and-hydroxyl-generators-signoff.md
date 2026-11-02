# Sign-off sheet — free course "Ozone and Hydroxyl Generators on Restoration Jobs: What the Evidence Says (Australia)"

**For:** Phill (founder, SME), DECISIONS #29 · **Prepared:** 02/11/2026 · **Slug:**
`ozone-and-hydroxyl-generators-what-the-evidence-says`

This is CARSI's free sign-in course (DECISIONS #21): free, `cecHours: 0`, no designation and no
IICRC framing. It is marked `noAiRewrite`, so agents have not changed a word. Only you can clear it.

## What to read (about 20 minutes)

1. **The course itself:** `docs/sign-off/ozone-and-hydroxyl-generators-reading-copy.md`. It
   reproduces all 4 teaching lessons and the knowledge-check module (about 3,400 words) word for
   word. Only the formatting differs.
2. **Where each claim comes from:**
   `docs/courses/ozone-and-hydroxyl-generators-what-the-evidence-says/source-register.md`. It lists
   11 primary public sources, each read on 14/10/2026, and maps every claim to its source.
3. **The quiz:** `data/seed/ozone-and-hydroxyl-generators-what-the-evidence-says-quiz.json`.

## What the course claims, and on what

| Lesson | Main claims | Basis |
| --- | --- | --- |
| 1 · Show me the page, not the vibe | The July 2026 near miss (an absence claim about a standard, caught before publishing). The rule "ask for the page". | CARSI's own incident. The lesson does **not** say what any standard contains. |
| 2 · Ozone: the Australian exposure limit | The peak limitation is 0.1 ppm (0.2 mg/m³), never to be exceeded. The health effects. What ozone does and does not do at safe levels. | Safe Work Australia WEL list (July 2025), WorkSafe Victoria safety alert (Feb 2025), US EPA and CARB (labelled overseas), and one peer-reviewed study (Franke 2021) of an automated ozone system in a sealed test room. |
| 3 · Hydroxyl generators | What is known (by-products, particles, the research gaps) and what is not. Hydroxyl is **not** claimed to be safe in occupied rooms, and **not** claimed to fail. | Three peer-reviewed papers (Joo 2021, Collins & Farmer 2021, Weschler & Nazaroff 2026), cited from their abstracts only. |
| 4 · On an Australian job | Claims, controls and records. What the TGA does and does not assess. ACCC rules on misleading advertising. 230 V supply, RCD-protected GPO, test-and-tag. | TGA borderline-products guidance, AER (230 V), Safe Work Australia. CARSI practice is labelled as CARSI's recommendation, not as law. |

**No re-entry threshold is stated.** No primary source gives a general concentration at which
occupants can safely return, so the course teaches re-entry as a site decision based on readings.

## Check these four things

- [ ] **Date-sensitive:** the course says workplace exposure *standards* apply until 30/11/2026 and
      workplace exposure *limits* from 01/12/2026. Ozone is unchanged at 0.1 ppm. That is four weeks
      away, and the wording already covers both regimes. Confirm you're happy with it.
- [ ] **Lesson 1** tells CARSI's own near miss openly. Confirm you want that story in a public free
      course.
- [ ] **No product is named.** No Australian 240 V unit could be verified, so none is named. Confirm
      that's acceptable.
- [ ] **US sources** (EPA, CARB) are labelled as overseas and used for the science only, never for
      Australian law.

## To sign off

Reply **"Ozone course approved"**, or list the changes you want. On approval, agents will:

1. Record `humanSignOff: "Phill, <date>"` and set `status: published` / `isPublished: true` in a PR.
2. Merge it once CI is green.
3. Give you a forwardable message for Rana, with the preflight and the seed command
   (`docs/runbooks/course-go-live.md`).

The quiz needs the catalogue-wide quiz seeder, which has no per-course option. Rana's message will
flag that separately (see the runbook, step 3).
