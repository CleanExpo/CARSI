# CARSI — Customer-First Product Strategy Review

**Audience:** Product, engineering, and leadership  
**Perspective:** Senior product strategist — practical, scalable ideas tied to learner and business outcomes  
**Sources:** `docs/` (gamification/CEC design, student credentials/notes design, LMS rebuild/enhancements plans, site audit), and current implementation (student dashboard, enrol/checkout, gamification/CEC UI, public catalogue, Claire chat).

---

## What success looks like for customers

Documentation frames learners as **time-poor Australian restoration technicians** whose outcomes are **IICRC renewal, employer credibility, and NRPG-aligned access** — not “fun learning” for its own sake.

The highest-impact work **tightens that loop**: clarity → progress → proof → renewal.

---

## High-impact opportunities (practical & scalable)

### 1. Make the IICRC renewal job obvious in one place

**Idea:** A single “renewal cockpit” on the student home surface: **CECs earned this cycle vs required**, **renewal/expiry date**, **discipline mix**, and **3 suggested next courses** (gaps first). Gamification design materials already describe the CEC ring, identity card, and discipline-based recommendations — fully wiring this beats adding more peripheral features.

**Why it matters:** For this audience, the product is not “courses”; it’s **staying certified without surprises**. Reducing mental load here directly supports retention and referrals.

---

### 2. One source of truth for catalogue size and claims

**Idea:** Drive **homepage stats, about copy, and SEO** from the same query the catalogue uses (published course counts, disciplines). Automate or gate marketing claims behind what’s in the database.

**Why it matters:** Site audit flagged **mismatch between claimed course counts and what visitors see** — that erodes trust instantly. This is **low glamour, high conversion** and scales as you add content.

---

### 3. First-session onboarding that sets industry + renewal context

**Idea:** After registration (or first dashboard visit), a **short path**: role/industry, current IICRC disciplines held, optional renewal date → then a **default learning path** and filtered “Popular for you”.

**Why it matters:** The public site spans **many industries**; without this, users face **choice overload**. Personalization here is cheaper than rebuilding the catalogue and lifts completion rates.

---

### 4. “Continue where you left off” as the primary CTA

**Idea:** Above the fold on the student dashboard: **last lesson / last course** with one-click resume; optional **email or SMS** for abandoned sessions (templated, opt-in).

**Why it matters:** Techs learn **between jobs**. Frictionless resume + light reminders attack the main dropout mode without requiring heavy product surface area.

---

### 5. Employer-ready proof pack (transcript + CEC summary)

**Idea:** One-click **PDF or share link**: completed courses, dates, CEC hours by discipline, credential IDs — suitable for HR or insurer evidence.

**Why it matters:** Positioning mixes **individual pros and organisational buyers**. This unlocks **B2B justification** and supports industry-page narrative without a full LMS-for-teams build on day one.

---

### 6. Evolve Claire from “catalogue bot” to “contextual guide”

**Idea:** Keep database-grounded answers, but add **light context**: on a course page, Claire knows **that course’s outcomes, CEC value, and prerequisites**; in-lesson, scoped to **that module** (even before full RAG over every paragraph).

**Why it matters:** Assistant UX is already invested in; **scoping reduces wrong answers** and support load. It scales by reusing structured metadata already stored rather than indexing all media immediately.

---

### 7. Reliability mode for real-world connectivity

**Idea:** Prioritise **PWA/offline-friendly lesson assets** and clear “downloaded for offline” states where video/PDF allows (enhancement docs reference PWA/offline ambition).

**Why it matters:** Field techs often have **patchy connectivity**. This is a **differentiator** vs generic course platforms and aligns with “learn between jobs.”

---

### 8. Professional gamification with strict privacy defaults

**Idea:** Implement the leaderboard **as designed**: **anonymous by default**, opt-in display name, monthly reset, discipline filters — so it reads as **industry recognition**, not a game.

**Why it matters:** Gamification is framed as **professional pride**. Getting the social layer wrong **hurts adoption** among senior techs; getting it right **reinforces community** without cringe.

---

## Hygiene (still customer-facing)

- **Legal/trust pages** and **post-payment landings:** Audit historically flagged gaps; keep **checkout → confirmation → clear next step** polished for paid flows.
- **Credentials + notes:** Student credentials/notes design describes a **wallet + per-lesson notes** experience — finishing any remaining gaps is high **perceived value** for serious learners.

---

## Suggested sequencing (impact vs effort)

| Priority | Theme | Rationale |
|----------|--------|-----------|
| P0 | Truth in numbers + copy | Fast trust win; unblocks marketing and SEO credibility |
| P0 | Renewal cockpit + continue learning | Core job-to-be-done + habit formation |
| P1 | Onboarding + contextual assistant | Conversion and support deflection |
| P1 | Employer proof pack | Unlocks org and compliance narratives |
| P2 | Offline/PWA depth + leaderboard polish | Segment differentiator + community |

---

## Optional next step

Turn this into a **one-page roadmap** (epics, success metrics, dependencies) with either:

- **Learner metrics** (completion, renewal-related actions), or  
- **Business metrics** (subscription, ARPU)  

as the north star — depending on organisational priority.

---

*Last updated: 2026-04-16*
