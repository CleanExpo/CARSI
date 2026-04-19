# Renewal cockpit — strategy & implementation

**Goal:** One obvious place on the student home surface for the **IICRC renewal job**: CECs vs requirement, renewal date, discipline mix, and **three suggested next courses** (gap-first).

**Primary surface:** `/dashboard/student` (`app/(dashboard)/dashboard/student/page.tsx`).

---

## 1. Strategy (brief)

### North star

Learners are buying **certainty about certification**, not “more UI.” The cockpit should answer, in under five seconds:

1. **Am I on track** for my next IICRC renewal?
2. **When** do I need to act by?
3. **Where** are my gaps (disciplines / CEC shortfall)?
4. **What should I do next** (concrete course actions)?

### Information hierarchy

| Layer | Content |
|--------|--------|
| **Status** | CECs earned *in the current renewal window* vs required (e.g. 8 in a 3-year cycle — confirm against your IICRC rules of use). |
| **Time** | Renewal / expiry date from profile (`iicrc_expiry_date`), with a subtle urgency state (e.g. &gt;90 days vs &lt;90 days). |
| **Shape** | Per-discipline CEC totals or a simple breakdown (bars or list) so users see *mix*, not only a single number. |
| **Action** | Three course cards: prioritise disciplines where the learner is short, exclude completed courses, prefer published catalogue with `cec_hours` &amp; `iicrc_discipline`. |

### Design principles

- **One module, above “My courses”** so renewal is the first work-related block after the hero (or integrated into the hero on small screens — team choice).
- **Honest empty states:** no member number → explain why CEC totals may be incomplete and link to profile/settings.
- **Server-derived numbers:** avoid client-only math on partial data; one API returns everything the cockpit needs so it stays consistent and testable.

---

## 2. How to implement

### Phase A — Data &amp; API (foundation)

**A1. Define the renewal window**

- Use **`iicrc_expiry_date`** from the learner profile (already expected by the student dashboard types: `iicrc_expiry_date`, `iicrc_certifications`).
- **Window:** e.g. current cycle = from `(expiry_date − 3 years)` to `expiry_date` (align with your gamification doc’s 3-year / 8 CEC framing; validate against IICRC’s current rules).
- If expiry is missing, fall back to **lifetime CECs** with a clear label (“Add your renewal date for cycle tracking”) — still useful.

**A2. Compute CECs in-cycle from existing LMS data**

From Prisma (`prisma/schema.prisma`):

- **`LmsEnrollment`:** `status`, `completed_at`, `certificate_issued_at`
- **`LmsCourse`:** `cec_hours`, `iicrc_discipline`

**Rule (example):** For each enrollment where the course is **completed** (and/or certificate issued), attribute `cec_hours` to the course’s discipline if `certificate_issued_at` or `completed_at` falls inside the renewal window. Sum by discipline and total.

If you need precision later, add a dedicated `cec_transactions` ledger (as in older enhancement docs); **v1 can aggregate from enrollments + course metadata** to ship faster.

**A3. New API route (recommended)**

Add something like:

- `GET /api/lms/gamification/me/cec-summary`  
  **or**  
- `GET /api/lms/me/renewal-summary`

Response shape (illustrative):

```json
{
  "renewal_expiry_date": "2028-03-15",
  "cycle_start": "2025-03-15",
  "cec_required": 8,
  "cec_earned_in_cycle": 5.5,
  "by_discipline": { "WRT": 2, "OCT": 1.5, "AMRT": 2 },
  "iicrc_member_number": "…",
  "profile_complete": true
}
```

Implement with Prisma in a **route handler** under `app/api/lms/...` (not only the catch-all stub in `app/api/lms/[[...path]]/route.ts`, which currently returns stubs for `gamification/me/level` and empty recommendations).

**A4. Suggested courses (gap-first)**

Add logic (same handler or `GET /api/lms/recommendations/renewal`):

- Input: `by_discipline`, completed course IDs, optional subscription flags.
- Query **published** courses with `cec_hours` &amp; `iicrc_discipline`.
- **Score:** prioritise disciplines with the largest gap vs a target (e.g. optional per-discipline minimums later); deprioritise or exclude already completed slugs.
- Return **3** items with title, slug, thumbnail, `cec_hours`, `iicrc_discipline`, and a short `reason` string (“Top up OCT credits this cycle”).

Today `localStub` returns `[]` for `recommendations/next-course` — replace with real data when the handler exists.

---

### Phase B — UI (compose existing building blocks)

**B1. New presentational component**

e.g. `src/components/lms/RenewalCockpit.tsx`:

- Uses **`CECProgressRing`** (`src/components/lms/CECProgressRing.tsx`) for **total CEC vs required** in-cycle.
- Uses **`IICRCIdentityCard`** (`src/components/lms/IICRCIdentityCard.tsx`) or a slimmer row for **member number + renewal date** (avoid duplicating the full card if it’s heavy).
- **Discipline mix:** simple list or horizontal bars from `by_discipline`.
- **Three courses:** reuse patterns from **`RecommendationWidget`** / `RecommendationCard` (`src/components/lms/RecommendationWidget.tsx`) or extract a shared small card.

**B2. Wire into the student dashboard**

In `app/(dashboard)/dashboard/student/page.tsx`:

- Fetch the new renewal summary (and recommendations) alongside existing `fetchLevel`, `fetchProfile`, `fetchEnrollments`.
- Render **`<RenewalCockpit />` immediately after the hero** and **before** “My courses,” so the renewal job is impossible to miss.
- Keep **`RecommendationWidget`** at the bottom **or** fold it into the cockpit if it becomes redundant — avoid three competing “next steps” sections.

**B3. Loading &amp; errors**

- Skeleton state matching current dashboard patterns.
- If API fails, show a compact `ErrorBanner` with retry (same pattern as enrollments).

---

### Phase C — Profile &amp; edge cases

- **Edit renewal / member number:** link from the cockpit to the existing profile/settings flow (wherever `iicrc_*` fields are edited — align with `onEdit` on `IICRCIdentityCard` if used).
- **No enrolments / no completions:** cockpit still shows expiry + zeros + three generic high-value courses in weak disciplines (or catalogue highlights).
- **Copy:** Use **en-AU** dates and plain language (“Renewal due”, “CECs this cycle”).

---

### Phase D — Quality bar

- **Unit tests** for CEC window math (edge: completion exactly on boundary; missing expiry).
- **E2E** (optional): student dashboard shows cockpit and three links when seeded data exists.

---

## 3. File map (quick reference)

| Area | Location |
|------|-----------|
| Student home | `app/(dashboard)/dashboard/student/page.tsx` |
| CEC ring (UI) | `src/components/lms/CECProgressRing.tsx` |
| IICRC card (UI) | `src/components/lms/IICRCIdentityCard.tsx` |
| Recommendations UI | `src/components/lms/RecommendationWidget.tsx` |
| Course &amp; enrollment data | `prisma/schema.prisma` — `LmsCourse`, `LmsEnrollment` |
| Stub LMS routes (to supersede for real data) | `app/api/lms/[[...path]]/route.ts` |

---

## 4. Success criteria

- Learner sees **CEC progress vs requirement** and **renewal date** without scrolling past “My courses.”
- **Discipline mix** is visible at a glance.
- **Three suggested courses** are explainable (gap-based reason strings).
- Numbers match **server-side** aggregation from the database for completed work in the defined window.

---

*Document version: 2026-04-16*
