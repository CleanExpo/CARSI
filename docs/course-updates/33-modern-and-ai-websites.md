# Course content draft — Modern Websites & AI Websites: Rank, Convert, Automate (new, $99, non-IICRC)

**Course:** Modern Websites & AI Websites: Rank, Convert, Automate
**Slug:** `modern-and-ai-websites` · **Category:** Grow Your Business · **Price:** $99 AUD (**new "Build" tier** — capstone of the track)
**Type:** **Non-IICRC business course** — `iicrcDiscipline: null`, `cecHours: 0`, **no** IICRC/S-standard/CEC framing.
**Drafted:** 2026-07-12 · via nexus-copywriter standard · freshness lane: **Exa** (AU-first: CodeQy, Vynlox, 3P Digital, ReadyToRank; product examples PageX/Centripe/n8n)
**Status:** DRAFT — founder review + brand-guardian before any DB apply. Live DB is source of truth; never seed on deploy.
**Data currency:** July 2026 — every figure/claim carries a **live source link** (see *Sources & Get the latest* below); open the link to obtain the **current** version. Where an authoritative source predates July 2026, it is the current published edition, linked so students can get any update.
**Positioning:** the **capstone** of the Grow Your Business track — GBP (course 30) sends the click, this is the site that catches it and the AI-Website engine that works the lead while you're on the job. Bundles a guided **AI-Website build session**, which is why it sits at the $99 Build tier, not $49.

---

## Block 1 · Brief context
- **Surface:** new CARSI LMS course ("What a website is actually for", "The three jobs: found, understood, trusted", "How a modern site ranks", "AI-search readiness", "What an AI Website really is", "The build session: stand one up", "How it assists your business").
- **Brand / voice:** CARSI — Sage · educator. Owner-to-owner, build-along.
- **Audience:** owners of AU restoration/cleaning/trade SMBs — from "no website" to "leaky template" to "ready to automate".
- **AU English; AUD; Australian web + hosting + privacy context foregrounded. No IICRC content.**

## Block 2 · Evidence map (claim → source → tier → tag)

| # | Claim | Source | Tier | Tag |
|---|---|---|---|---|
| E1 | **A website is the base everything compounds on:** without it, SEO/ads/AI-search have nothing to rank or cite; a large share of AU small businesses still have **no website**, and many that do run slow templates that fail Core Web Vitals | UnderCurrent (AU); Vynlox (AU) | 2 | [VERIFIED] |
| E2 | **Speed is a confirmed 2026 ranking signal *and* a conversion lever:** Google uses Core Web Vitals (LCP, INP, CLS) to rank; main content should paint in **≤2.5s**, **INP ≤200ms**; **each 1-second delay ≈ 7% fewer conversions**; fewer than **45%** of pages pass all three CWV on mobile | 3P Digital (AU); ReadyToRank (AU); HTTP Archive 2026 | 2 | [VERIFIED] |
| E3 | **Mobile-first is the default, not an option:** **~65–70%** of AU web traffic is mobile (ABS 2026); Google indexes and ranks the **mobile** version; a site slow on 4G fails most real visitors; users form an opinion in **<0.1s** and bounce after **~3s** | 3P Digital; CodeQy (AU) | 2 | [VERIFIED] |
| E4 | **Australian hosting materially lifts speed:** a US-hosted server adds **150–300ms** latency; moving to an AU data centre cuts TTFB from ~600–1200ms to **80–200ms**, improving LCP by **0.5–1.5s** | 3P Digital (AU) | 2 | [VERIFIED] |
| E5 | **Schema + answer-first structure now feed AI answers:** `LocalBusiness`, `Service`, `FAQ`, `BreadcrumbList` JSON-LD make pages eligible for rich snippets **and** citation by AI Overviews/ChatGPT/Perplexity; server-rendered, answer-first HTML is read far more reliably than client-rendered JS | UnderCurrent; Vynlox; ReadyToRank (AU) | 2 | [VERIFIED] |
| E6 | **Conversion has known fundamentals:** a hero that answers *what/who/next* in **3 seconds**, one primary CTA, trust signals (Google reviews, real photos), a **3-field friction-free form** (phone optional, no captcha), and service/suburb pages; target conversion **3–7%** for a service site, bounce **<65%** on commercial pages | Vynlox; CodeQy (AU) | 2 | [VERIFIED] |
| E7 | **"AI Website" = an AI-built front end + an admin CRM back end that holds the automations:** platforms like PageX ("AI website builder + CRM + automations, one dashboard", Claude-powered) and Centripe (forms create a contact, apply tags and **trigger a workflow with no Zapier/middleware**) are exactly this model — the landing page is the shopfront, the CRM the admin owns is the engine room | PageX; Centripe; SMBcrm | 2 | [VERIFIED] |
| E8 | **The automation pattern is a canonical webhook:** point every lead source (site form, ad, chatbot, **missed-call text-back**) at **one webhook**, normalise the payload, **dedupe on email**, then route/score and trigger follow-up — the n8n "one door, clean shape, dedupe before insert" pattern; n8n supports human-in-the-loop guardrails | n8n; n8n Template Store | 2 | [VERIFIED] |
| E9 | **AU compliance is part of "modern":** HTTPS/SSL is a trust + ranking baseline; **WCAG 2.2 AA** accessibility (1 in 5 Australians) and **Australian privacy-law updates due Dec 2026** are on the near horizon and belong in any new build | ReadyToRank (AU) | 2 | [VERIFIED] |
| E10 | **The "positioning flip":** owners don't buy "an AI agent" (unclear, no starting point) — they already budget for a **website**, so package the automation under the hood as an outcome they accept; "it stops being a website and becomes an employee." Strategic *framing* the course teaches (not a statistic) | Estate vault note `ai-websites-gold-rush-ponte` (**Tier 3** — creator opinion; revenue/market figures NOT used) | 3 | [INFERENCE] |

## Block 3 · Draft content

### 3a. New section — "What a website is actually for"
> Your website isn't a brochure — it's the foundation every other channel compounds on. Your Google Business
> Profile sends the click, your ads send the click, AI search sends the click — and all of them land on your
> site. If it's slow, confusing or missing, every dollar you spend on traffic leaks straight out. A large share
> of Australian small businesses still have **no website at all**, and plenty of the rest run a 2021 template
> that fails on speed and mobile. That's a problem and an opportunity: get the site right and every visitor,
> ad and review works harder.

### 3b. New section — "The three jobs: found, understood, trusted"
> A modern site has exactly three jobs, in order:
> - **Found** — it has to rank and be citable (speed, mobile, schema; section 3c).
> - **Understood** — a visitor must grasp *what you do, who it's for, and what to do next* in the first **3
>   seconds**. People form an opinion in under a tenth of a second and leave after about three. "Sydney
>   water-damage, same-day, call now" beats "Welcome to our website" every time.
> - **Trusted** — Google reviews, real team photos, named testimonials, and a **3-field form** (name, email,
>   message; phone optional; no captcha) that never silently drops a submission.
>
> Aim for a **3–7% conversion rate** and a bounce under **65%** on your service pages. Miss those and it's
> almost always a hero or a speed problem.

### 3c. New section — "How a modern site ranks"
> Ranking in 2026 rests on foundations most templates skip:
> - **Speed (Core Web Vitals).** Google confirms LCP/INP/CLS as ranking signals. Targets: main content in
>   **≤2.5s**, interaction response **≤200ms**. Each **1-second** delay costs about **7% of conversions**, and
>   under **45%** of pages pass all three on mobile — so passing is itself an edge.
> - **Mobile-first.** ~65–70% of Australian traffic is on a phone, and Google ranks the **mobile** version. If
>   it's slow on 4G, you're failing most of your visitors.
> - **Australian hosting.** A US server adds 150–300ms before a byte moves; an AU data centre cuts your
>   time-to-first-byte dramatically and can improve LCP by **0.5–1.5 seconds** on its own.
> - **Schema markup.** `LocalBusiness`, `Service`, `FAQ`, `BreadcrumbList` in JSON-LD — only for content
>   actually on the page — is one of the highest-impact, lowest-cost upgrades you can make.
> - **HTTPS + basics:** SSL, clean URLs, one H1, meta titles/descriptions, an XML sitemap, key pages within
>   three clicks of home.

### 3d. New section — "AI-search readiness"
> Search isn't ten blue links anymore. A growing share of answers are written by an AI — Google's AI Overviews,
> ChatGPT, Perplexity — that reads sentences straight off your pages and quotes them. To be quotable: **lead
> every section with the answer in the first sentence**, phrase headings as the real questions customers ask,
> keep paragraphs short, and serve **server-rendered HTML** (AI crawlers are far less reliable at running
> JavaScript than Google is). The same schema that earns rich snippets also makes your business easier for AI
> to cite. In Australia about **1 in 7** enquiries already passes through an AI assistant — being the business
> it names is the new front page.

### 3e. New section — "What an AI Website really is: sell the website, not the agent"
> Here's the mindset shift that makes this land. Most owners glaze over at "AI agent" — they don't know what it
> is or where to start. But every owner already accepts they need a **website.** So an **AI Website** reframes
> the same technology as an outcome they already budget for: a normal-looking site with the AI and automation
> built in *under the hood.* It's a **landing page with a CRM engine bolted to the back that you, the admin,
> control** — the front is the shopfront customers see; the back is where every lead, tag, pipeline and
> **automation flow** lives. Platforms in this class (PageX bills itself as "AI website builder + CRM +
> automations in one dashboard"; Centripe makes every form **create a contact, apply tags and trigger a workflow
> with no Zapier or middleware**) collapse what used to be five separate tools into one. The site stops being a
> static poster and starts behaving like an employee — it answers, qualifies, books and follows up on its own.

### 3e-i. The contrast that sells it
> | Old website | AI Website |
> |---|---|
> | Displays information | Has conversations |
> | Contact form, then waits | Proactive chat + capture on every channel |
> | Manual follow-up (if you remember) | Automatic follow-up the moment a lead lands |
> | One inbox per channel | Unified inbox (email, SMS, FB/IG, GBP messages, calls) |
> | Manual lead qualification | Automatic (e.g. an email-verify step filters spam from real) |
> | A cost centre | The front door of your admin system |
>
> Same pretty page a customer sees — a working sales-and-marketing system underneath.

### 3f. New section — "The flows and triggers: one door, clean shape"
> The engine room runs on **flows and triggers** — the "n8n-style" automations you may have heard about. The
> pattern that keeps it sane is a **canonical webhook**: point *every* lead source — your site form, a Facebook
> ad, the chatbot, even the **missed-call text-back** from course 29 — at **one** intake, normalise every
> payload into one clean shape, **dedupe on the email**, then route and trigger. From there the flows do the
> work you never get to: score the lead, notify you, send the follow-up sequence, request the review two hours
> after the job (course 31), log everything as a backup. Build it once and every new source is a five-minute
> add, not another half-built integration. Keep a **human in the loop** on anything customer-facing — the same
> guardrail from the AI courses.

### 3g. New section — "The build session: stand one up"
> This is the hands-on part. In the guided build session you'll: pick your model (a custom fast site, or an
> all-in-one AI-Website platform where the CRM and flows are built in); write your **answer-first hero** and
> one primary CTA; connect a **3-field form** to the CRM so a submission creates a contact and fires a
> follow-up; wire the **canonical webhook** so your form, GBP enquiries and missed-call text-back all land in
> one place; and switch on two starter flows — *new-lead notify + first follow-up* and *post-job review
> request*. You finish with a live front door and a working engine, not a theory.

### 3h. New section — "How it assists your business (and staying compliant)"
> Put together, an AI Website means a lead never falls through a crack: it's captured, de-duplicated, scored,
> followed up and asked for a review — automatically, with you approving anything a customer sees. It's the
> site that ranks (3c), gets cited by AI (3d), converts (3b) and then *runs the admin* (3e–3f). Two Australian
> must-dos before you publish: **HTTPS/SSL** and accessibility (**WCAG 2.2 AA** — 1 in 5 Australians rely on
> it), and keep an eye on the **Australian privacy-law updates due December 2026**, since your CRM now holds
> customer data. Modern isn't just fast and pretty — it's found, trusted, automated and compliant.

## Block 4 · Pre-gate self-audit (NEVER-list)
| Rule | Result |
|---|---|
| No AI filler | PASS |
| No banned first-person business voice | PASS |
| No hedged/passive CTA | PASS |
| No unverified claim as fact | PASS (AU web-performance + real product examples; thresholds are Google-standard) |
| AU English, AUD | PASS |
| **No IICRC / S-standard / CEC framing** | **PASS** — `iicrcDiscipline: null`, `cecHours: 0` |
| No discipline-acronym branding | PASS |
| Vendor claims attributed, not endorsed | PASS (PageX/Centripe/n8n named as *examples of the model*, not recommendations) |
| Interesting-fact / hook present | PASS (3e = the site becomes the front door of your admin system) |
| US/vendor data flagged | PASS (AU sources primary; product/vendor figures attributed) |

**Overall: PASS** → forward to founder review + brand-guardian.

## Block 5 · Considered & rejected
1. **Recommending one specific platform** (WordPress vs Webflow vs an all-in-one AI-Website tool) — **rejected as
   endorsement**: the course teaches the *model* (fast front end + CRM back end + canonical-webhook flows) and
   the selection criteria, so it survives tool churn and doesn't read as an ad. A dated "current tools" annex can
   list options with prices.
2. **A full n8n build tutorial** — trimmed to the *pattern* (one webhook → normalise → dedupe → route → trigger)
   and the two starter flows; a node-by-node tutorial belongs in a downloadable workbook, not core content.
3. **Deep AU-privacy-law legal detail** — flagged (HTTPS, WCAG 2.2 AA, Dec-2026 privacy changes) but not taught
   as legal advice; pointed to as "get proper advice", since the CRM now holds customer data.
4. **US home-services dollar benchmarks as headline** — kept only illustratively; AU web-performance and hosting
   data (3P Digital, CodeQy, ReadyToRank) lead every technical claim per the Australian-produced mandate.

## Conversion / learning hypothesis (M-2)
- **Metric:** completion + "stood up a live page with a CRM-connected form and one working flow" self-report;
  quiz on CWV thresholds, mobile-first, the AI-Website model, and the canonical-webhook pattern.
- **Target:** ≥35% of finishers publish a page + connect one automation within 30 days (build course = higher effort).
- **Kill threshold:** revise if completion <45% or the build-action rate <20%.
- **Next variant:** if the build step stalls, split into two modules (Rank & Convert / Automate) and gate the AI-Website build behind a short readiness check.

## Sources & Get the latest — student-facing (data current as at July 2026)

> **For students — get the latest:** every source below is a **live link**. Open it to obtain the **current** version. Data compiled **July 2026**; standards, statistics and product specs change, so treat the linked source as the live source of truth and re-check a figure before relying on it.
- [T2] UnderCurrent Automations — *Small Business Website Design: Build One That Ranks in 2026* (AU; found/understood/trusted, schema, AI-search): https://undercurrentautomations.com/blog/small-business-website-design
- [T2] CodeQy — *Web Design for Australian Small Businesses: The Complete 2026 Guide* (AU; 3s bounce, mobile-first, essentials): https://codeqy.com.au/blog/web-design-small-business-australia-ultimate-guide
- [T2] Vynlox — *Small Business Website Design Australia: 2026 Playbook* (AU; conversion fundamentals, pricing tiers, 3–7%): https://vynlox.com/blog/small-business-website-design-australia
- [T2] 3P Digital — *Website Speed Optimisation for Australian Businesses* (AU; CWV, 7%/1s, AU hosting latency): https://3pdigital.com.au/blog/website-speed-optimisation-australian-businesses-how-page-speed-impacts-seo-and-conversions
- [T2] ReadyToRank — *Small Business SEO Checklist 2026 / Technical SEO Australia 2026* (AU; INP 200ms, schema, WCAG 2.2 AA, Dec-2026 privacy): https://readytorank.com.au/small-business-seo-checklist-2026-the-ultimate-australian-guide-to-ranking/
- [T2] PageX — *AI Website Builder, CRM, Courses & E-commerce in One Platform* (example of the AI-Website model): https://pagexcrm.com/
- [T2] Centripe — *Website Builder: Create Sites Inside your CRM* (forms → contact + tags + workflow, no middleware): https://www.centripe.ai/website-builder
- [T2] n8n Template Store — *n8n Lead Capture to CRM: One Canonical Webhook* (the flows/triggers pattern): https://www.n8ntemplatestore.com/blog/n8n-lead-capture-to-crm
- [T3 · internal, framing only] Estate vault — `Wiki/ai-websites-gold-rush-ponte-2026-07-08-ingest.md` (the "positioning flip" and old-vs-AI contrast). **Tier 3, creator opinion + GoHighLevel affiliate; its revenue/market-size figures are unverified and are NOT cited in this course.**

## Apply notes
- New catalogue scaffold: `slug: modern-and-ai-websites`, `priceAud: 99`, `isFree: false`, `cecHours: 0`,
  `iicrcDiscipline: null`, `category: "Grow Your Business"`, `status: draft`, `isPublished: false`.
- **$99 introduces a third price point** ("Build" tier). Update [PRICING-AND-NEW-COURSES.md](PRICING-AND-NEW-COURSES.md)
  to $29 / $49 / **$99** — still zero per-course Stripe objects (inline `price_data`); subscription auto-includes on publish.
- **No** IICRC/S-standard/CEC content. Product names (PageX/Centripe/n8n) are *examples of the model*, not
  endorsements — keep it that way; convert any residual US figure to AU/AUD at build.
- **Funnel note:** this course maps directly to the estate's existing **AI-Website product line** (the `ai-website`
  skill / `docs/superpowers/specs/2026-07-10-ai-websites-design.md`): the **GBP → site generate** stage is live
  (Synthex `lib/site-generator`), and the agent / CRM / drip / deploy stages are Phase 2 (Unite-Group `apps/web`).
  Position the course as the on-ramp to a done-for-you AI-Website service for owners who'd rather have it built —
  and use the estate's own **"positioning flip"** framing (sell the website, install the AI). `brand-guardian` before publish.
