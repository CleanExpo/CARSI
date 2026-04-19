# Implementation summary (local branch — handoff)

This document summarizes **what was built on the current local `main`** (recent commits), **which areas of the codebase it touches**, and **the product goals** each cluster serves. Use it to decide later whether to **`git pull`** (merge remote) or **`git push --force-with-lease`** / reconcile history — it does **not** run `git pull`.

---

## 1. One source of truth for catalogue numbers (marketing trust)

**Goal (strategy):** Homepage, About, and SEO should not claim course or discipline counts that disagree with the live catalogue.

**Commits (examples):** `b09e2c5`, `b21c6be`, `adec54b`, `8d8b618`, `a8e0ece`

**What was implemented**

| Piece | Role |
|--------|------|
| `lmsPublishedCourseWhere` export | Same Prisma filter as published `/courses` for reuse. |
| `getPublicCatalogueFacts` + helpers | DB → WP export → API fallback; cached per request; counts + distinct discipline codes. |
| `deriveCatalogueFactsFromCourseItems` | Same numbers as a listing array (e.g. `/courses` grid + meta). |
| `iicrc-discipline-display.ts` | Shared labels / ordering for pills and About rows. |
| `/courses` | `generateMetadata` + body copy use live counts. |
| `/about` | Stats, discipline list, mission copy, meta from facts (with sensible fallbacks). |
| `/` (home) | Stats strip, FAQ JSON-LD, discipline pills, GEO/NRPG/CTA copy driven by facts. |

**Key files:** `src/lib/server/public-courses-list.ts`, `src/lib/server/public-catalogue-facts.ts`, `src/lib/iicrc-discipline-display.ts`, `app/page.tsx`, `app/(public)/courses/page.tsx`, `app/(public)/about/page.tsx`

---

## 2. Student profile hub, settings, LMS navigation

**Goal:** Coursera-style account area: IICRC + renewal fields, sectioned profile, rail/context navigation to profile and settings.

**Commits (examples):** `7679486`, `189f658`, `e05adaf`, `057a25d`, `aa7fd7b` (and related earlier IICRC API work)

**What was implemented**

- Expanded **`/dashboard/student/profile`** (overview, account, IICRC & renewal).
- **`/dashboard/settings`** hub (simplified to profile link after later refactor).
- **`LMSIconRail` / `LMSContextPanel`:** Profile entry, avatar menu, active states.
- **`refreshUser`** after saves; **`/api/auth/me`** and **`/api/lms/auth/me`** aligned with DB fields where applicable.
- Onboarding wizard completion redirect adjusted toward profile flow in `057a25d`.

**Key files:** `app/(dashboard)/dashboard/student/profile/page.tsx`, `app/(dashboard)/dashboard/settings/page.tsx`, `src/components/layout/LMSIconRail.tsx`, `src/components/layout/LMSContextPanel.tsx`, `src/lib/dashboard-nav-active.ts`, `src/components/auth/auth-provider.tsx`, `app/api/lms/auth/me/route.ts`, `app/api/auth/me/route.ts`

---

## 3. IICRC renewal cockpit and recommendations (earlier foundation)

**Goal:** Renewal tracking, CEC-oriented UI, next-course suggestions from gap logic.

**Commits (examples):** `1e55605` … `9f8460c`, `9c4feaa`, `cc86d98`

**What was implemented**

- DB: IICRC-related fields on `lms_users`; renewal summary + next-course API; **`RenewalCockpit`** on student dashboard; types and parsers for certifications JSON.

**Key files:** `prisma/schema.prisma`, `src/lib/server/renewal-summary.ts`, `src/components/lms/RenewalCockpit.tsx`, `app/api/lms/gamification/me/renewal-summary`, `app/api/lms/recommendations/next-course`, `app/api/lms/[[...path]]` (stub cleanup)

---

## 4. First-session onboarding + “Popular for you” + continue learning

**Goal (strategy §3–4):** Short onboarding (industry, disciplines, renewal context, reminders) → better pathway + personalised suggestions; primary CTA to resume last lesson; store reminder preference for future email/SMS.

**Commits:** `047a416` → `c72c1fd` (seven commits in sequence)

**What was implemented**

| Layer | Details |
|--------|---------|
| **DB** | `onboarding_completed_at`, `onboarding` JSON, `resume_reminder_opt_in` on `lms_users`. |
| **Lib** | `onboarding-pathway.ts` — pathway code, label, description, suggested dashboard catalogue URL. |
| **POST `/api/lms/auth/onboarding`** | Persists answers, optional renewal date → profile expiry, sets cookie; returns pathway metadata. |
| **GET `/api/lms/learner/resume`** | Best incomplete enrolment by latest lesson activity → deep link to `/dashboard/learn/[slug]?lesson=`. |
| **Renewal scoring** | Uses `disciplines_held` from stored onboarding JSON to boost suggested courses. |
| **GET/PATCH `/api/lms/auth/me`** | `onboarding_completed` from DB or cookie; `resume_reminder_opt_in` readable/updatable. |
| **UI** | `OnboardingWizard` — multi-step including disciplines, renewal, reminder opt-in; **`ContinueLearningBanner`**, **`PopularForYouStrip`** on student dashboard. |

**Key files:** `prisma/migrations/20260419190000_lms_user_onboarding_resume/`, `src/lib/server/onboarding-pathway.ts`, `app/api/lms/auth/onboarding/route.ts`, `app/api/lms/learner/resume/route.ts`, `src/lib/server/learner-dashboard-data.ts` (resume snapshot), `src/components/lms/OnboardingWizard.tsx`, `src/components/lms/ContinueLearningBanner.tsx`, `src/components/lms/PopularForYouStrip.tsx`, `app/(dashboard)/dashboard/student/page.tsx`, `src/lib/api/auth.ts`

**Note:** Reminder **delivery** (cron/email/SMS) is not fully implemented; preference is stored for future use.

---

## 5. Other recent items (context only)

- Homepage featured courses / `force-dynamic`, FloatingChat, AI chat API — separate UX/AI tracks.
- Seed script registrations in `package.json` for content imports — data/ops.

---

## How to use this before pull vs force-push

1. **Compare your local `main` to `origin/main`** (`git log origin/main..HEAD` / `git fetch` then log) to see if remote has commits you lack or vice versa.
2. If **remote has work you need**, you’ll want **`git pull`** (or rebase) and resolve conflicts — this doc lists **touch points** (API routes, Prisma, dashboard pages).
3. If **your branch is the source of truth** and you intend to **overwrite** remote history, you’d use a **force push with lease** only after confirming no one else depends on the old tip — **this doc does not recommend either path**; it only records what was implemented locally.

---

*Generated as a handoff aid; update after you merge or push.*
