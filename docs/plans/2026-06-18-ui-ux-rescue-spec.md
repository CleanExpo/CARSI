# CARSI UI/UX Rescue Spec

Updated: 18/06/2026

## Objective

Make CARSI easier to navigate, read, and trust while the site remains live. The upgrade must improve the public learning journey first without changing payment, enrolment, authentication, certificate, or admin business logic.

## Current Evidence

Manual browser audit on `http://localhost:3000` found:

- Homepage first viewport is too dark on mobile; core copy and CTAs are visually buried.
- Homepage length is excessive: roughly 10,500px desktop and 15,700px mobile.
- Primary navigation promotes too many equal-weight concepts and includes `Pathways`, which currently says "Pathways Coming Soon".
- Course cards repeat title and description inside the thumbnail and again in the card body.
- Public pages can render two skip links because root layout and public layout both include skip-to-main affordances.
- Admin/dashboard unauthenticated routes land on sign-in; local admin render also exposed a Prisma `P1001` when the database was unavailable.
- Browser logs report logo image sizing/LCP warnings.

## Upgrade Principles

1. Readability beats atmosphere. Use dark surfaces only where contrast remains strong.
2. Navigation must answer "what can I do here?" before exposing secondary brand/authority content.
3. Course browsing is the primary product workflow. It must be clean, scannable, and mobile-first.
4. Unfinished features should not sit in the primary nav.
5. AI/chat is supporting help, not the main navigation or CTA.
6. No business logic changes in the first rescue pass.

## Information Architecture

### Public Nav

Primary:

- Courses
- Start Smart
- Industries
- Pricing

Secondary/menu:

- Authority
- About
- Contact
- Pathways, only once it becomes a real chooser rather than a coming-soon page

Primary CTA:

- Browse Courses

### Homepage Decision Flow

First screen:

- Clear H1 and short description.
- Two CTAs maximum: Browse Courses, Start Smart.
- Three proof points maximum.
- No below-fold dependency for the primary CTA on mobile.

Next sections:

1. Popular starting points.
2. Course/pathway map.
3. How certificates and CEC tracking work.
4. Industries served.
5. FAQ.

Move long authority/SEO blocks lower or into dedicated pages.

## Phase 1: Safe UI Rescue

Scope:

- `src/components/landing/PublicNavbar.tsx`
- `src/components/landing/MobileNav.tsx`
- `src/components/lms/CourseCard.tsx`
- `src/components/lms/CourseGrid.tsx`
- `src/components/lms/FloatingChat.tsx`
- `app/(public)/layout.tsx`
- `app/page.tsx` or its hero components, only for readability and first-viewport CTA placement

Changes:

- Increase mobile hero readability and bring CTAs above the fold.
- Reduce public nav to the core decision path.
- Move unfinished `Pathways` out of the primary nav.
- Remove duplicate course title/description in catalogue cards.
- Make course cards more list-like and scannable on mobile.
- Avoid duplicate skip links on public pages.
- Make chat less intrusive on mobile.

Verification:

- `npm run type-check`
- `npm run lint`
- Browser screenshots at 390x844 and desktop.
- Confirm `/`, `/courses`, `/pricing`, `/login` render without layout overflow.

Rollback:

- Revert only the files in Phase 1.
- No database migration or data mutation is involved.

## Phase 2: Product Navigation Redesign

Scope:

- Public shell/navigation.
- Footer.
- Homepage section order.
- Dedicated learner/business/admin entrypoints.

Changes:

- Add task-based navigation labels.
- Add "For individuals" and "For teams/businesses" routing.
- Replace vague terms with user outcomes.
- Add active nav state and clearer mobile menu grouping.

Verification:

- Browser walkthrough of public routes.
- Mobile menu keyboard and touch target checks.

## Phase 3: Visual System Reset

Scope:

- `app/globals.css`
- shared UI/card/input/button components
- dashboard/admin shells

Changes:

- Introduce a high-contrast dark-on-light or hybrid learning-platform palette.
- Reserve cinematic dark panels for hero accents only.
- Standardise text opacity: core body copy should not use `white/35` or `white/40`.
- Standardise card density, radius, borders, and section spacing.

Verification:

- Contrast checks for nav, body text, form labels, filters, and course cards.
- Desktop/mobile screenshots.

## Phase 4: Dashboard/Admin Rescue

Scope:

- dashboard shell and learner dashboard
- admin shell and admin error states

Changes:

- Replace icon-only dashboard navigation with labelled navigation on tablet/desktop.
- Add clear empty states for no enrolments and unavailable database/admin data.
- Keep admin actions dense but readable.

Verification:

- Authenticated browser walkthrough once test credentials/database are available.
- Graceful unauthenticated and database-unavailable checks.

## Acceptance Criteria

- Mobile homepage primary message and CTAs are readable in the first viewport.
- Primary nav has fewer, clearer choices.
- `/courses` cards do not repeat the same title/description.
- No unfinished feature is promoted as a primary nav destination.
- Public pages do not render duplicate skip links.
- Floating chat does not block primary mobile CTAs.
- No payment/auth/enrolment/certificate logic is changed in Phase 1.
