# Pricing model + 5 new Business & AI courses (staged proposal)

**Drafted:** 2026-07-12 · for founder review before any DB/Stripe apply · Live DB is source of truth; never seed on deploy.
**Scope:** (1) answer the Stripe "same numbers / no 100 new prices" question with what the code actually does; (2) put a price on every course using shared price points; (3) propose 5 high-appeal $49 courses for SMB owners.

---

## 1 · The Stripe question — answered (good news: it's already solved)

**You do not need — and the code never creates — a Stripe Price object per course.** Verified in this repo:

- **Single-course checkout builds the price *inline* from the course's `priceAud` number.** `src/lib/server/local-course-checkout.ts:99-112` passes Stripe `line_items[].price_data` (`currency: 'aud'`, `unit_amount` derived from `course.price_aud`) — an **ad-hoc price created at checkout time**. There is no stored `stripePriceId` on a course anywhere in the catalogue (`data/seed/courses-catalog.json` has `priceAud` / `isFree`, no price-id field).
- **Consequence:** adding 5 courses — or 500 — at $49 needs **zero** new Stripe prices and zero new Stripe "connections". You set `priceAud: 49` on the course and checkout does the rest. Courses that share a number ($49) are, to Stripe, identical ad-hoc prices. That is exactly the "same numbers so we don't make 100 prices" outcome — the architecture already delivers it.
- **The only fixed Stripe Price IDs in the system are the subscriptions** (env: `STRIPE_PRICE_PRO_ANNUAL`, `STRIPE_PRICE_TEAMS_STARTER/GROWTH/FULL_LIBRARY`, `STRIPE_PRICE_ORG_MONTHLY`). Those are recurring plans, a handful total, already wired.
- **Subscription = whole-library access, already built.** `src/lib/server/entitlements.ts` + the `full_library` plan (`carsi_teams_full_library`) + `app/api/lms/subscription/enroll` (enrols an active member in *any* published course) + the "Full library access is ready" email confirm it: an **active monthly/yearly subscription opens every course at no extra charge** — no per-course purchase, no matter how many courses exist. New courses are covered automatically the moment they're published.

**Net:** put a number on each course; publish; subscribers get everything; single-buyers pay the course's `priceAud` through one shared inline-price path. Nothing to build on the Stripe side.

---

## 2 · Pricing model — by course duration (founder rule, 2026-07-12) — APPLIED

**The rule (founder GO 2026-07-12):** price is set by course length. Three numbers only:

| Tier | Price (AUD) | Duration rule | Subscription |
|---|---|---|---|
| **Essentials** | **$29** | **≤ 1 hour** | included |
| **Professional** | **$49** | **> 1 hour to 2 hours** | included |
| **Build** | **$99** | **> 2 hours** | included |
| **Subscription** | monthly / yearly (existing plans) | **unlocks all courses, all tiers** — already built (`full_library`) | — |

Three "numbers" total ($29 / $49 / $99) plus the subscription plans. Every course maps to one by its
`durationHours` — **no per-course Stripe object at any tier** (single-purchase uses inline `price_data` keyed on
the number; §1). Boundary reading: exactly 1h = $29; exactly 2h = $49; anything over 2h = $99.

**Applied to `data/seed/courses-catalog.json` (staged; not seeded on deploy):** `priceAud` set + `isFree: false`
on all 37 courses. Odd-cent legacy prices ($28.97 / $28.98) normalised to $29.

### Result — all 37 courses ($29×14 · $49×8 · $99×15)

The 17 courses with an authored `durationHours` are priced deterministically. The **20 that were
`durationHours: null` are now CONFIRMED** by measuring each course's actual content: **duration = (words ÷ 140
wpm comprehension reading) + (5 min/lesson engagement)**, calibrated against CARSI's own authored courses. The
computed `durationHours` is now written into the seed for every course, so each price is traceable. *(EST) marks
a content-computed duration; (SET) marks a pre-authored one.*

**→ $99 Build — > 2h (15, all durations SET):**
`water-damage-restoration-fundamentals` (4h) · `mould-remediation-fundamentals` (5h) · `structural-drying-fundamentals` (4h) · `category-3-sewage-black-water-remediation` (4h) · `psychrometry-building-science-for-drying` (4h) · `fire-smoke-damage-restoration-fundamentals` (4h) · `trauma-crime-scene-decontamination-fundamentals` (4h) · `carpet-cleaning-technician-fundamentals` (4h) · `timber-floor-assessment-restoration` (4h) · `assessing-indoor-environment-conditions` (4h) · `asbestos-awareness-for-restoration-technicians` (3h) · `whs-fundamentals-for-restoration-and-cleaning-professionals` (3h) · `ccw-carsi-truckmount-operations` (6h) · `commercial-floor-care-schools-childcare` (6h) · `floor-care-onboarding-operational-readiness` (8h)

**→ $49 Professional — > 1h to 2h (8):**
`wrt-water-damage-essentials` (2h SET) · `introduction-to-drying-health-care-facilities` (1.1h EST) · `introduction-to-drying-educational-and-institutional-sites` (1.1h EST) · `air-quality-and-odour-identification-and-deodorisation-essentials` (1.2h EST) · `hvac-systems-and-indoor-air-quality-what-every-technician-should-know` (1.2h EST) · `using-air-scrubbers-and-afds-to-improve-job-site-air-quality` (1.2h EST) · `moisture-mould-and-indoor-air-quality-understanding-the-link` (1.1h EST) · `dust-and-particulates-in-indoor-air-control-and-cleaning-strategies` (1.1h EST)

**→ $29 Essentials — ≤ 1h (14):**
`avian-influenza-awareness-restoration-iaq-facilities` (1h SET) · `introduction-to-drying-industrial-and-manufacturing-sites` (1.0h EST) · `introduction-to-drying-transportation-and-vehicles` (1.0h EST) · `introduction-to-creating-a-clean-air-environment-…-final-clearance` (0.7h EST) · `introduction-to-air-quality-fundamentals` (0.7h EST) · `introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment` (0.6h EST) · `documenting-and-reporting-air-quality-improvements` (0.6h EST) · `introduction-to-improving-indoor-air-quality-after-water-damage` (0.6h EST) · `introduction-to-infrared-thermography-for-drying` (0.5h EST) · `introduction-to-restoration-of-antiques-and-fine-furnishings` (0.5h EST) · `introduction-to-recovery-of-submerged-items-and-contents` (0.5h EST) · `introduction-to-water-damage-litigation-support` (0.5h EST) · `introduction-to-ultraviolet-light-and-fluorescence` (0.5h EST) · `introduction-to-drying-hospitality-and-lodging-sites` (0.5h EST)

**One assumption to confirm:** the 20 EST durations reflect each course **as currently authored (text-only)**. The
17 authored courses run longer because they carry video/practical/assessment the text export can't measure — if
any of these 20 gain that media (matching the fundamentals' depth), it lengthens and can move up a tier. Prices
above are for the current content; adjust `durationHours`/`priceAud` if a course is slated for media expansion.
The two content-heaviest drying courses (health-care 6,022 words, educational 5,520) already crossed 1h and sit
at $49.

### One commercially-weighty call, flagged (not blocking)
32 courses were **free**; the rule makes them **paid**. The subscription still gives them to members, and standalone
pricing ends the "everything's free" leak. Applied in the staged file — **flip any course back to `isFree: true` at
review if it's meant to stay a lead magnet.**

---

## 3 · Five new $49 courses for SMB owners — Business & AI track

A new **"Grow Your Business"** category, deliberately **outside the IICRC/restoration technical track**: these are business-skills courses, so per CARSI policy they carry **`iicrcDiscipline: null`, `cecHours: 0`, and no IICRC/S-standard/CEC framing whatsoever.** Each value prop below is grounded in current (2025–2026) data — the promotional hooks are real numbers, not claims.

| # | Course | Slug | Price | The promotional hook (sourced) |
|---|---|---|---|---|
| N1 | **AI for Service Businesses: Practical Tools That Win More Jobs** | `ai-for-service-businesses-practical-tools` | $49 | 52% of trade/service owners now use AI day-to-day; **88% of high-confidence businesses use AI vs just 27% of low-confidence ones.** The course = the practical starting kit (quoting, invoicing, comms) for the owner who's been meaning to start. |
| N2 | **Speed to Lead: Turn Enquiries into Booked Jobs** | `speed-to-lead-job-conversion` | $49 | Respond in 5 minutes and you're **21× more likely to qualify** the lead; **78% of buyers hire the first business that responds** — yet the industry average first response is **47 hours.** The single highest-leverage conversion lever, taught as a system. |
| N3 | **The Google Business Profile Playbook: Get Found, Get Called** | `google-business-profile-playbook` | $49 | GBP drives **30–50% of a contractor's calls**; a *complete* profile gets **7× the clicks**, 100+ photos = **520% more calls**, and **4.7★ + 30 reviews** wins a top-3 Local Pack spot 60% of the time. |
| N4 | **The 5-Star Reputation Engine: Reviews, Referrals & Retention** | `reputation-engine-reviews-referrals` | $49 | **47% of consumers won't use a business with fewer than 20 reviews**; asking within 2 hours of the job gets a **42% review rate vs 6%** after two days; retaining a customer costs **5–7× less** than winning a new one. |
| N5 | **AI-Powered Customer Communication & Follow-Up** | `ai-customer-communication-followup` | $49 | Multi-touch follow-up pulls an **89.9% response vs 8.6%** for single-touch; AI-drafted review replies lift satisfaction **23%**; WhatsApp business messages open at **90%+ vs ~20% email.** Automate the follow-up that owners never get to. |

**Funnel logic of the five:** N3 *get found* → N2 *respond & convert* → N1/N5 *win and communicate with AI* → N4 *retain & multiply.* Sold individually at $49 or bundled/subscription. High appeal because every hook maps to money an SMB owner is visibly leaving on the table.

Each new course, when built, gets a full nexus-copywriter content draft (like the 27 restoration drafts in this folder) with the Exa sources cited inline. Sources for the hooks above are in §5. **All five now drafted:** [28](28-ai-for-service-businesses-practical-tools.md)–[32](32-ai-customer-communication-followup.md).

**Plus a 6th new course — the $99 "Build" capstone:** [33 · Modern Websites & AI Websites: Rank, Convert, Automate](33-modern-and-ai-websites.md). It teaches modern-website ranking + the "AI Website" model (landing page + admin CRM back end holding the n8n-style flows/triggers) with a guided build session, and introduces the third price point. Aligned to the estate's own `ai-website` pipeline and "positioning flip" framing.

---

## 4 · Apply notes (staged — founder applies; not seeded on deploy)

- **Existing courses:** set `priceAud` to 29 or 49 per the §2 map and `isFree: false` (or keep/restore `true` for any deliberate lead magnet). No other field changes. **No Stripe changes.**
- **New courses:** add to `data/seed/courses-catalog.json` **as a scaffold record only** with:
  ```json
  { "slug": "ai-for-service-businesses-practical-tools", "title": "AI for Service Businesses: Practical Tools That Win More Jobs",
    "priceAud": 49, "isFree": false, "cecHours": 0, "iicrcDiscipline": null,
    "category": "Grow Your Business", "status": "draft", "isPublished": false }
  ```
  `cecHours: 0` is mandatory (fail-closed, CLAUDE.md); `iicrcDiscipline: null` and **no** IICRC/S-standard/CEC content (business courses are non-IICRC). Publish only after the content draft + `brand-guardian`.
- **Stripe:** nothing to create. Single-purchase uses the existing inline `price_data` path; subscription already grants library-wide access, new courses included automatically on publish.
- **Guards:** these are business courses — keep them clear of IICRC framing so `check:iicrc-terminology` / `check:iicrc-compliance` stay green (a non-IICRC course carrying S-standard/CEC text is exactly the fail-OPEN defect the guards exist to catch).

---

## 5 · Sources (Exa-retrieved 2026-07-12)
- [T2] Jobber — *2026 Home Service Trends Report* (AI adoption 52%; 88% vs 27% high/low-confidence; response-speed data): https://www.getjobber.com/home-service-trends-report/
- [T2] CustomerFlows — *Home Service Business Statistics 2026* (5-min = 21× qualify; 78% hire first responder; retention 5–7× cheaper): https://customerflows.com/resources/home-service-business-statistics/
- [T1/2] BrightLocal — *Local Consumer Review Survey 2026* (97% read reviews; 47% avoid <20 reviews; response expectations): https://www.brightlocal.com/research/local-consumer-review-survey/
- [T2] FlashCrafter — *State of Local Search 2026* (AI review responses +23% satisfaction; GBP posts 12% of local-pack weight): https://www.flashcrafter.ai/research/state-of-local-search-2026
- [T2] Elev8 Operations — *Contractor Marketing Statistics 2026* (GBP 30–50% of calls; complete profile 7× clicks; 100+ photos 520% more calls; 4.7★+30 reviews → top-3): https://www.elev8operations.com/guides/contractor-marketing-statistics-2026
- [T2] PipelineOn — *2026 Home Service Marketing Benchmarks* (multi-touch 89.9% vs 8.6%; ask-within-2h 42% vs 6%; 47-hour avg response): https://pipelineon.com/blog/home-service-marketing-benchmarks-2026/
