# Client demo — product evolution (beyond original scope)

**Audience:** Phill McGurk (founder)  
**Duration:** ~20 minutes live browser + 5 minutes summary  
**Branches/commits:** local `main` product-excellence series (push before demo)

## Narrative

We did not only “wire the tickets.” We tightened the **discover → trust → convert → deliver** loop on public role guides, Business Coaching, and measurement — with GP-731 consent, repeatable QA, and UI that explains what to do next without training.

---

## Demo script (before → after)

### 1. Role guides hub (`/role-guides`)

| Before                                              | After                                                             | Customer benefit                             |
| --------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------- |
| Hero + grid only; visitors scrolled to guess intent | **Choose your path** strip: courses / role guides / coaching      | First-time visitors pick a lane in one click |
| Grid anchor buried                                  | `#role-guides-audiences` scroll target from pathfinder            | Less hunting on long hub page                |
| Analytics opaque                                    | Clicks tagged (`course_cta`, `coaching_cta`) after cookie consent | Founder can see which lane converts          |

**Show:** Accept cookies → click “Run the business side” → land on `/ccw-training`.

### 2. Single role guide (e.g. `/role-guides/nsw-builders`)

| Before                  | After                                                             | Customer benefit                                  |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| Long catalogue first    | **Start here** live course cards + coaching cards + employer band | “What do I do this week?” answered above the fold |
| Thin employer links     | Trust cards with `employer_trust_cta` analytics                   | Employers see pricing / WHS / records path        |
| Empty bundle = dead end | **Browse courses** + **Contact** fallback CTAs                    | No silent failure while courses publish           |

**Show:** Click course card (analytics) → course page; scroll employer band → team pricing.

### 3. Business Coaching — active home

| Before                               | After                                                            | Customer benefit                       |
| ------------------------------------ | ---------------------------------------------------------------- | -------------------------------------- |
| Generic progress text                | **Month at a glance** with tone pill + progress bar + icons      | Monthly rhythm visible in 3 seconds    |
| Multiple cards to find “what’s next” | **Smart CTAs** on summary card (proposed fixes / pack / actions) | One tap to the highest-value task      |
| Marketing pack unclear               | First-win steps + polished **build panel** on marketing page     | First pack feels guided, not technical |

**Show (subscribed member):** Home → month card primary CTA → actions or marketing pack; marketing page build panel.

### 4. Trust & compliance (GP-731)

| Before                           | After                                      | Customer benefit                            |
| -------------------------------- | ------------------------------------------ | ------------------------------------------- |
| Analytics fired without choice   | Cookie banner; GA4/PostHog gated           | Privacy-safe default                        |
| Product events might drop params | Allow-listed `carsi_context` + `link_path` | Measurement works after consent without PII |

**Show:** Private window → banner → no network until Accept; DebugView after accept.

### 5. Engineering confidence (founder + ops)

| Asset            | Command                                     |
| ---------------- | ------------------------------------------- |
| Automated smoke  | `npm run verify:product-excellence`         |
| Manual checklist | `docs/runbooks/product-excellence-smoke.md` |
| Phase index      | `docs/product/PRODUCT_EXCELLENCE_PLAN.md`   |

**Show:** Terminal exit 0 on smoke (optional screen share).

---

## What we deliberately did _not_ claim as “done”

- **Premium Visual package** (`@cleanexpo/premium-visuals`) — not installed; marketing polish follows existing CARSI patterns.
- **AI in Business publication** — gated (`docs/product/ai-in-business-publication-gates.md`).
- **Production env** — `CARSI_COACHING_BOOKING_URL`, GA/PostHog keys, DB migrations on DO (founder/ops).
- **CCW-CRM Toby CSV** — out of scope (separate repo).

---

## Suggested closing line for the client

> “You asked for implementation; we shipped a **guided conversion layer** on role guides, a **coaching home that tells members what to do this month**, **consent-safe analytics** so we can improve paths without guessing, and a **smoke gate** we can run before every demo or deploy. The next step is your eyes on staging, then push + production env.”
