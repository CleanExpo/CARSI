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

## 2 · Proposed pricing model — two shared price points

Today's catalogue is inconsistent: **32 free, 3 × $29, 1 × $28.98, 1 × $28.97.** The odd cents and the mostly-free state mean there's no coherent single-purchase price. Proposal — **two numbers only**, so "same numbers" holds and the value ladder is obvious:

| Tier | Price (AUD) | What sits here | Rationale |
|---|---|---|---|
| **Essentials** | **$29** | short *"Introduction to…"* / single-topic awareness micro-courses | matches the existing clean $29 point; normalises the $28.97/$28.98 oddities |
| **Professional** | **$49** | credential-bearing *"CARSI … Practitioner"* / Fundamentals courses, specialised operational courses, **and the 5 new Business & AI courses** | the $49 the new courses need; higher value = a real credential or business outcome |
| **Subscription** | monthly / yearly (existing plans) | **all courses, both tiers** | already built (`full_library`); the all-you-can-learn unlock |

Three "numbers" total ($29, $49, + the subscription plans). Every course maps to $29 or $49 — **no per-course Stripe object either way.**

### One commercially-weighty call, flagged (not blocking)
32 courses are currently **free**; "all courses need a price" makes them **paid** ($29 or $49 per the tier map below). That converts free intro courses into paid + subscription-included. Recommended and applied in this proposal, because the subscription still gives them away to members and standalone pricing ends the "everything's free" leak. **This is the one line to consciously confirm at review** — flip any course back to `isFree: true` if it's meant to stay a lead magnet.

### Full tier map (current → proposed) — all 37 existing courses

**→ $49 Professional (16):**
`wrt-water-damage-essentials` · `water-damage-restoration-fundamentals` · `mould-remediation-fundamentals` · `structural-drying-fundamentals` · `category-3-sewage-black-water-remediation` · `psychrometry-building-science-for-drying` · `fire-smoke-damage-restoration-fundamentals` · `trauma-crime-scene-decontamination-fundamentals` · `carpet-cleaning-technician-fundamentals` · `timber-floor-assessment-restoration` · `assessing-indoor-environment-conditions` · `asbestos-awareness-for-restoration-technicians` · `whs-fundamentals-for-restoration-and-cleaning-professionals` · `ccw-carsi-truckmount-operations` · `commercial-floor-care-schools-childcare` · `floor-care-onboarding-operational-readiness`

**→ $29 Essentials (21):**
`air-quality-and-odour-identification-and-deodorisation-essentials` · `documenting-and-reporting-air-quality-improvements` · `dust-and-particulates-in-indoor-air-control-and-cleaning-strategies` · `hvac-systems-and-indoor-air-quality-what-every-technician-should-know` · `introduction-to-air-quality-fundamentals` · `introduction-to-creating-a-clean-air-environment-best-practices-for-final-clearance` · `introduction-to-drying-educational-and-institutional-sites` · `introduction-to-drying-health-care-facilities` · `introduction-to-drying-hospitality-and-lodging-sites` · `introduction-to-drying-industrial-and-manufacturing-sites` · `introduction-to-drying-transportation-and-vehicles` · `introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment` · `introduction-to-improving-indoor-air-quality-after-water-damage` · `introduction-to-infrared-thermography-for-drying` · `introduction-to-recovery-of-submerged-items-and-contents` · `introduction-to-restoration-of-antiques-and-fine-furnishings` · `introduction-to-ultraviolet-light-and-fluorescence` · `introduction-to-water-damage-litigation-support` · `moisture-mould-and-indoor-air-quality-understanding-the-link` · `using-air-scrubbers-and-afds-to-improve-job-site-air-quality` · `avian-influenza-awareness-restoration-iaq-facilities`

*(Tier calls are eyeball-adjustable — move any slug between the two lists at review; the price is just the number.)*

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

Each new course, when built, gets a full nexus-copywriter content draft (like the 27 restoration drafts in this folder) with the Exa sources cited inline. Sources for the hooks above are in §5.

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
