# Product excellence smoke (Phase 0)

**When:** After deploy to staging or production, or before a founder/partner demo.

## Automated gate (local or CI-shaped)

```bash
npm run verify:product-excellence
```

This runs unit tests on conversion/coaching summary helpers, coaching visual shell, marketing pack view, registration confirm, and live buy-path guard scripts. It does **not** replace a human pass in the browser.

## Manual checklist (30–45 min)

### Money paths

1. **Free course stranger** — register from a free course CTA → complete confirm flow if shown → land on lesson 1 (`confirmFreeEnrolment` path).
2. **Paid course stranger** — catalogue → checkout → open lesson 1 (covered by `paid-course-buy-walk` PG test on CI when DB available).
3. **Membership / coaching** — `/ccw-training` shows checkout or honest disabled state; portal locked home matches.

### Role guides (GP-661)

4. Open `/role-guides` → one guide → **Start here** band shows up to three live courses.
5. **Employer trust** band: WHS + pricing links render without licence-breaking copy.

### Business Coaching (GP-634)

6. Active subscriber home — quick links, month summary, marketing spotlight.
7. Build or open marketing pack → downloads → proposed fix on admin queue → approve → member actions.
8. Sessions — book CTA uses `CARSI_COACHING_BOOKING_URL` when set (else support mailto).
9. Analytics — click a role-guide **Start here** course card; confirm `course_cta` in GA4 DebugView / PostHog live (when keys are set). Marketing pack **Build** should emit `marketing_pack_build`.

### Trust

9. Email confirm — opening link alone does not verify; button POST verifies (GP-699).
10. `GET /api/health` healthy; coaching routes `noindex` in tab title.

### Record

- Note pass/fail + environment URL in Linear or weekly digest template (`docs/product/weekly-founder-digest-template.md`).
