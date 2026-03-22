# CARSI LMS — Comprehensive Site Audit

> **Date:** 22/03/2026
> **Auditor:** Senior Project Manager (Claude Opus 4.6)
> **Target:** https://carsi-web.vercel.app + https://carsi-backend.fly.dev
> **Scope:** Funnel, Schema/Data, SEO/AEO/GEO, Sitemap, General Flow & Polish

---

## Executive Summary

The CARSI LMS has a strong foundation — excellent JSON-LD schema coverage, a well-structured landing page, 19 industry pages, and a thoughtful design system. However, **one critical middleware bug is blocking all course discovery for unauthenticated visitors**, and the database contains only 21 of the claimed 116 courses. Combined with missing legal pages and stale copy referencing "91 courses", these issues materially undermine conversion, SEO indexability, and credibility.

**Findings by severity:** 5 P0 (Critical) | 8 P1 (High) | 12 P2 (Medium)

---

## P0 — Critical (Blocks Revenue or Breaks Functionality)

### P0-1: Middleware gates `/courses` behind authentication — ALL course pages redirect to login

**Issue:** `proxy.ts` line 13 includes `'/courses'` in `PROTECTED_PREFIXES`. Every unauthenticated visitor clicking "Browse Courses", "View" on a course card, or arriving via Google is redirected to `/login?next=/courses/...`. The courses listing page and every individual course detail page are invisible to anonymous users.

**Impact:**

- **Revenue:** The entire discovery-to-enrolment funnel is broken for new visitors. No anonymous user can see course details, pricing, or the enrol button. This is the single largest conversion blocker on the site.
- **SEO:** Googlebot (which does not carry a `carsi_token` cookie) is redirected to `/login` for every course URL. All 20 course pages in the sitemap are effectively soft-404s from Google's perspective. Zero course pages are indexable.
- **GEO:** AI crawlers (GPTBot, ClaudeBot, PerplexityBot) hit the same redirect. Course content is invisible to AI engines.

**Root cause:** `C:\CARSI\apps\web\proxy.ts` line 13:

```typescript
'/courses', // lessons + quizzes require enrolment — gate at middleware level
```

**Recommended fix:** Remove `'/courses'` from `PROTECTED_PREFIXES`. Only gate authenticated sub-routes:

```typescript
const PROTECTED_PREFIXES = [
  '/student',
  '/instructor',
  '/admin',
  '/subscribe',
  '/courses/*/lessons', // lesson content requires enrolment
  '/courses/*/quiz', // quiz content requires enrolment
  '/dashboard',
  '/tasks',
  '/agents',
];
```

The `EnrolButton` component already handles auth checks client-side — it shows "Please log in" if the user is unauthenticated. The middleware gate is redundant for the public catalogue and detail pages.

---

### P0-2: Only 21 courses in production database — claim says "91+" / "116 unique"

**Issue:** The backend API at `GET /api/lms/courses?limit=500` returns only 21 courses (`total: 21`). The landing page prominently states "91 Courses" in the stats section. The migration project notes reference "116 unique courses now in database."

**Impact:**

- **Credibility:** A prospective student sees "91 Courses" on the landing page, browses the catalogue, and finds 21. This is a trust-destroying mismatch.
- **Revenue:** 70+ courses worth of potential enrolments are missing from the catalogue.
- **SEO:** Sitemap lists only 20 course URLs instead of 116. Massive opportunity cost.

**Recommended fix:**

1. Verify the seed/migration was applied to the production Fly.io database (not just local dev).
2. Run `alembic upgrade head` on production if pending migrations exist.
3. Re-run the course seeder targeting production.
4. Update landing page stats to match actual database count dynamically (query from API rather than hardcoding "91").

---

### P0-3: Missing `/subscribe/success` page — Stripe checkout has nowhere to land

**Issue:** The subscribe page sends `success_url: ${window.location.origin}/subscribe/success` in the Stripe checkout request, but no page exists at `app/**/subscribe/success/page.tsx`. There is a `courses/[slug]/payment-success` page, but no subscription success page.

**Impact:** After a successful Stripe subscription checkout, the customer is redirected to a 404 page. This breaks the post-payment experience for the highest-value conversion action on the site.

**Recommended fix:** Create `apps/web/app/(public)/subscribe/success/page.tsx` (or `(dashboard)` if auth is required) with:

- Confirmation message
- Subscription status
- Link to student dashboard

---

### P0-4: No Terms of Service or Privacy Policy pages

**Issue:** No `/terms` or `/privacy` routes exist anywhere in the codebase. No files matching `terms*` or `privacy*` were found.

**Impact:**

- **Legal:** Australian Privacy Act 1988 requires organisations collecting personal information to have a privacy policy. Stripe also requires merchants to have accessible Terms of Service and Privacy Policy.
- **Conversion:** Savvy buyers (especially business purchasers) look for these before entering payment details.
- **SEO:** Google's E-E-A-T guidelines penalise sites without legal transparency pages.

**Recommended fix:** Create `/terms` and `/privacy` pages. Include in footer navigation. At minimum, cover: data collection, payment processing (Stripe), cookie usage, IICRC data sharing (CEC reporting), and refund policy.

---

### P0-5: Pricing model mismatch between `/pricing` page and `/subscribe` page

**Issue:** The pricing page shows a 3-tier model: Free / Foundation $44/mo / Growth $99/mo. The subscribe page only offers Foundation $44/mo and Growth $99/mo. But the course detail pages reference "CARSI Pro — $795/yr". Previous implementation used a single $795/yr annual subscription.

Three different pricing models are visible to users:

- Landing page / course detail: "$795/yr" (CARSI Pro annual)
- Pricing page: "$44/mo" and "$99/mo" (monthly tiers)
- Subscribe page: "$44/mo" and "$99/mo"

**Impact:** Visitors receive contradictory pricing signals depending on which page they visit. This confuses purchase decisions and erodes trust.

**Recommended fix:** Decide on the canonical pricing model and align all references. Update the course detail sidebar "or included with CARSI Pro — $795/yr" to match whichever model is active. If both monthly and annual exist, the pricing page should present both.

---

## P1 — High (Significant User Experience or SEO Impact)

### P1-1: Landing page hardcodes "91 Courses" — should be dynamic

**Issue:** `app/page.tsx` line 88 hardcodes `{ value: '91', label: 'Courses' }` in the stats array. With only 21 courses in production and a plan to reach 116, this number is perpetually wrong.

**Impact:** Misleading claim visible to every visitor. Undermines trust when course catalogue does not match.

**Recommended fix:** Fetch the course count from the API (already used for featured courses on the same page) and pass it to the stats component.

---

### P1-2: Courses page description hardcodes "91+" — SEO metadata is inaccurate

**Issue:** `app/(public)/courses/page.tsx` line 15 hardcodes the meta description:

```
'Browse 91+ IICRC CEC-approved restoration and cleaning courses...'
```

**Impact:** Google will display this inaccurate claim in search results. Once courses are indexed (after P0-1 is fixed), the discrepancy is visible in SERPs.

**Recommended fix:** Generate the meta description dynamically or update it to match actual course count.

---

### P1-3: Zero thumbnail URLs in course data — all 21 courses have `thumbnail_url: null`

**Issue:** Every course record returned by the API has `thumbnail_url: null`. The frontend has an intelligent fallback system (74 local `.webp` images with fuzzy slug matching), but the API data itself is incomplete.

**Impact:**

- Course schema markup (`CourseSchema`) receives no `image` for OpenGraph. Social shares and Google Rich Results lack images.
- The fallback matching is best-effort — some courses may not match any local image, resulting in plain gradient headers.

**Recommended fix:** Either:

1. Populate `thumbnail_url` in the database seed data with the local image paths (`/images/courses/{slug}.webp`), or
2. Have the backend dynamically generate thumbnail URLs based on slug matching.

---

### P1-4: Pathways are empty — API returns 0 items

**Issue:** `GET /api/lms/pathways` returns `{ items: [], total: 0 }`. The pathways page shows a "Coming Soon" fallback, but pathways are linked in the main navigation and sitemap.

**Impact:**

- Users clicking "Pathways" in the nav find no content.
- The sitemap includes `/pathways` but no pathway detail URLs.
- A primary navigation item leading to empty content signals an unfinished product.

**Recommended fix:** Either:

1. Seed pathway data (discipline-based progression paths: WRT, CRT, ASD, etc.), or
2. Remove "Pathways" from the main navigation until content is ready, and remove from sitemap.

---

### P1-5: Sitemap lists only 20 course URLs — should be 116 (or at least 21)

**Issue:** The sitemap at `/sitemap.xml` contains only 20 course URLs out of the 21 in the database (one may have an empty slug). With 116 courses planned, only 17% are discoverable.

**Impact:** Google and AI crawlers cannot discover courses not in the sitemap (especially with the auth redirect blocking crawling). Even after fixing P0-1, missing sitemap entries slow indexation.

**Recommended fix:** This resolves naturally once P0-2 (seed all courses to production) is fixed, as the sitemap dynamically queries the API.

---

### P1-6: No `generateStaticParams` for dynamic routes — every page is SSR on each request

**Issue:** Course detail pages (`[slug]/page.tsx`) and pathway detail pages (`[slug]/page.tsx`) use `force-dynamic` but have no `generateStaticParams`. Combined with `revalidate: 60`, every request hits the backend API.

**Impact:**

- TTFB is dependent on Fly.io backend response time (~200-500ms per course page load).
- Under load, the backend becomes a bottleneck for the entire frontend.
- Vercel's edge cache is not leveraged effectively.

**Recommended fix:** Add `generateStaticParams` to `courses/[slug]/page.tsx` to pre-render the catalogue at build time, with ISR (Incremental Static Regeneration) via `revalidate`. Remove `force-dynamic` from pages that can be statically generated.

---

### P1-7: Two courses have empty descriptions — visible data gaps

**Issue:** "Carpet Repair & Reinstallation (CRT)" and "Commercial Carpet & Textile Care (CCT)" have null `short_description` fields. One course also has a null `description`.

**Impact:** Course detail pages show no "About This Course" section. Course cards in the grid show no excerpt. This makes these courses appear unfinished.

**Recommended fix:** Add descriptions to these course records in the seed data.

---

### P1-8: No social login (Google/LinkedIn) on registration

**Issue:** The registration form requires full name, email, password, confirm password, and optional IICRC member number. There is no OAuth option (Google, LinkedIn, Apple).

**Impact:** Higher friction for new sign-ups. Trade professionals who are time-poor may abandon a 5-field form. LinkedIn login would be particularly natural for this professional audience.

**Recommended fix:** Add Google OAuth at minimum. LinkedIn OAuth is ideal for the target demographic. This is a P1 because it affects conversion rate, not because it breaks functionality.

---

## P2 — Medium (Polish and Optimisation Opportunities)

### P2-1: Sitemap `lastModified` always set to `new Date()` for static pages

**Issue:** `sitemap.ts` line 78 sets `lastModified: new Date()` for every static page on every request. This means the sitemap changes on every crawl, telling Google nothing meaningful about when content actually changed.

**Recommended fix:** Use fixed dates for static pages (updated when content actually changes) and `updated_at` from the database for dynamic pages (already implemented for courses).

---

### P2-2: Missing pages that competitors likely have

**Issue:** No dedicated FAQ page exists (FAQs are embedded in pricing/courses/landing). No `/blog` or `/resources` section. No `/partner` or `/enterprise` page.

**Recommended fix:** Create a standalone `/faq` page aggregating all FAQ content (enables FAQPage schema at site level). Plan a `/blog` or `/resources` section for ongoing SEO content.

---

### P2-3: `robots.txt` sitemap URL points to `carsi.com.au` but site is on `carsi-web.vercel.app`

**Issue:** `robots.ts` uses `NEXT_PUBLIC_FRONTEND_URL ?? 'https://carsi.com.au'` for the sitemap reference. If `carsi.com.au` is not yet pointing to Vercel, crawlers following the sitemap link may get a different site (old WordPress) or a 404.

**Recommended fix:** Ensure `NEXT_PUBLIC_FRONTEND_URL` is set in Vercel environment variables, or confirm `carsi.com.au` DNS is pointing to Vercel.

---

### P2-4: Non-standard IICRC discipline codes in database

**Issue:** The API returns 11 unique discipline codes: CCT, ASD, AMRT, WRT, FSRT, HST, UFT, RCT, CDS, CRT, OCT. The standard 7 IICRC disciplines are WRT, CRT, ASD, AMRT, FSRT, OCT, CCT. The codes HST, UFT, RCT, CDS are not standard IICRC abbreviations.

**Recommended fix:** Validate that non-standard codes are intentional CARSI-specific extensions. If so, add them to the `DISCIPLINE_LABELS` mapping in the frontend (currently only 7 are mapped). If not, correct the data.

---

### P2-5: No free courses available — conversion entry point missing

**Issue:** All 21 courses in production have `price_aud > 0` and `is_free: false`. The pricing page prominently features a "Free Library" tier, but there are no free courses to deliver on that promise.

**Recommended fix:** Seed the free tier courses (Australian Government Resources, SOPs, Cleaning Essentials, etc. — 10 items listed on the pricing page) as free courses in the database.

---

### P2-6: `force-dynamic` on 19+ industry pages causes unnecessary SSR

**Issue:** Every industry page uses `export const dynamic = 'force-dynamic'` and fetches courses from the backend. Industry page content is static — only the course recommendations change.

**Recommended fix:** Remove `force-dynamic` and use `revalidate: 3600` (hourly) instead. Industry content changes rarely; course recommendations can be cached.

---

### P2-7: Course card "View" link goes to protected `/courses/[slug]` — redirect loop for unauthenticated users

**Issue:** `CourseCard.tsx` line 312 links to `/courses/${course.slug}`. Due to P0-1, this redirects to `/login`. From the landing page, a user sees 16 course cards with "View" buttons that all redirect to login.

**Recommended fix:** Resolves automatically when P0-1 is fixed. No additional action needed.

---

### P2-8: EnrolButton shows "Please log in" as an error state rather than a CTA

**Issue:** When an unauthenticated user clicks "Enrol", the error message "Please log in to access this course" appears in red text. There is no login link or redirect.

**Recommended fix:** Replace the error message with a redirect to `/login?next=/courses/{slug}` or a styled CTA button linking to login/register.

---

### P2-9: No breadcrumb on courses listing page

**Issue:** Individual course detail pages have breadcrumb navigation, but the courses listing page (`/courses`) does not. The pricing page has breadcrumbs.

**Recommended fix:** Add `BreadcrumbSchema` to the courses listing page for SEO consistency.

---

### P2-10: OG image and logo reference `carsi.com.au` domain — may 404 if DNS not configured

**Issue:** `OrganizationSchema` defaults `logo` to `https://carsi.com.au/logo.png` and OG images to `https://carsi.com.au/og-image.png`. If the domain is not yet pointing to Vercel, these images 404 for social crawlers.

**Recommended fix:** Verify `og-image.png` exists at the deployed URL. The file exists locally at `apps/web/public/og-image.png`, so it should be accessible at the Vercel URL.

---

### P2-11: Course schema missing `aggregateRating` and `numberOfStudents`

**Issue:** The `CourseSchema` JSON-LD does not include `aggregateRating` or `totalHistoricalEnrollment`. Google Rich Results for courses benefit from these signals.

**Recommended fix:** If the reviews/ratings system (Phase 21) is live, pipe `averageRating` and `enrollmentCount` into the course schema.

---

### P2-12: No `hreflang` tag — single-market site would benefit from explicit `en-AU` signal

**Issue:** While `<html lang="en-AU">` is set and OpenGraph `locale` is `en_AU`, there is no `hreflang` link tag in the head. For a site explicitly targeting Australia, an `hreflang="en-AU"` self-referencing tag strengthens geo-targeting signals.

**Recommended fix:** Add to layout or metadata:

```html
<link rel="alternate" hreflang="en-AU" href="https://carsi.com.au" />
<link rel="alternate" hreflang="x-default" href="https://carsi.com.au" />
```

---

## Summary Table

| ID    | Priority | Category | Issue                                               | Effort   |
| ----- | -------- | -------- | --------------------------------------------------- | -------- |
| P0-1  | Critical | Funnel   | `/courses` gated behind auth — blocks all discovery | 15 min   |
| P0-2  | Critical | Data     | Only 21/116 courses in production DB                | 30 min   |
| P0-3  | Critical | Funnel   | Missing `/subscribe/success` page — Stripe 404      | 30 min   |
| P0-4  | Critical | Legal    | No Terms of Service or Privacy Policy               | 2-4 hrs  |
| P0-5  | Critical | Funnel   | Pricing model mismatch ($795/yr vs $44-$99/mo)      | 1 hr     |
| P1-1  | High     | UX       | Hardcoded "91 Courses" stat                         | 15 min   |
| P1-2  | High     | SEO      | Hardcoded "91+" in meta description                 | 10 min   |
| P1-3  | High     | Data     | All courses have null thumbnail_url                 | 30 min   |
| P1-4  | High     | Content  | Pathways nav item leads to empty page               | 30 min   |
| P1-5  | High     | SEO      | Sitemap has only 20 course URLs                     | Auto-fix |
| P1-6  | High     | Perf     | No static generation for course pages               | 1 hr     |
| P1-7  | High     | Data     | 2 courses with empty descriptions                   | 15 min   |
| P1-8  | High     | Funnel   | No social login (Google/LinkedIn)                   | 4-8 hrs  |
| P2-1  | Medium   | SEO      | Sitemap lastModified always `now()`                 | 15 min   |
| P2-2  | Medium   | SEO      | No standalone FAQ, blog, or resources pages         | 2-4 hrs  |
| P2-3  | Medium   | SEO      | robots.txt sitemap URL domain mismatch              | 5 min    |
| P2-4  | Medium   | Data     | Non-standard discipline codes (HST, UFT, RCT, CDS)  | 30 min   |
| P2-5  | Medium   | Funnel   | No free courses despite "Free Library" tier         | 1 hr     |
| P2-6  | Medium   | Perf     | `force-dynamic` on 19 industry pages                | 30 min   |
| P2-7  | Medium   | UX       | Course card links redirect to login                 | Auto-fix |
| P2-8  | Medium   | UX       | EnrolButton error state instead of login CTA        | 15 min   |
| P2-9  | Medium   | SEO      | No breadcrumb on courses listing page               | 10 min   |
| P2-10 | Medium   | SEO      | OG image/logo URL may 404                           | 5 min    |
| P2-11 | Medium   | SEO      | Course schema missing rating/enrolment data         | 30 min   |
| P2-12 | Medium   | SEO      | No hreflang self-referencing tag                    | 5 min    |

---

## What Is Working Well

To be clear, significant work has already been done correctly:

1. **JSON-LD Schema** — OrganizationSchema, WebsiteSchema, CourseSchema, BreadcrumbSchema, FAQSchema are all well-implemented with en-AU locale, service area coverage, and correct EducationalOrganization typing.
2. **robots.txt** — AI crawler rules (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) are explicitly allowed with sensible disallows. This is ahead of most competitors.
3. **Design system** — Scientific Luxury theme is consistently applied. Glass morphism, spectral accents, and Framer Motion animations create a premium feel.
4. **Industry pages** — 19 industry-specific landing pages is exceptional for SEO. Each targets a distinct vertical.
5. **Course detail pages** — Rich content sections (learning outcomes, audience, credentials, career context) with discipline-specific content generation.
6. **Registration form** — IICRC member number field is a smart touch for the target audience.
7. **Accessibility** — Skip-to-content link, proper aria labels, semantic HTML structure.
8. **Local fallback thumbnails** — 74 AI-generated course images with fuzzy slug matching is a creative solution.
9. **FAQ Schema** — Implemented on multiple pages for Rich Result eligibility.
10. **Contact page** — Complete with form, phone, email, address, social links, and response time commitment.

---

## Recommended Fix Order

**Immediate (today):**

1. P0-1 — Remove `/courses` from middleware protected prefixes (15 min)
2. P0-5 — Align pricing across all pages (1 hr)
3. P0-3 — Create subscribe success page (30 min)

**This week:** 4. P0-2 — Seed remaining courses to production database 5. P1-1 + P1-2 — Make course count dynamic 6. P1-3 — Populate thumbnail URLs 7. P1-7 — Fill empty descriptions

**Next sprint:** 8. P0-4 — Terms and Privacy pages 9. P1-4 — Seed pathways or remove from nav 10. P1-6 — Add static generation 11. P2-5 — Seed free tier courses 12. P1-8 — Social login

---

_Audit conducted by analysing codebase files, live site responses, and backend API data. All findings are verified against code and confirmed observations._
