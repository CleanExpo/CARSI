# Current State

> Updated: 17/03/2026 18:30 AEST

## Active Task

Session complete — Stripe 3-tier pricing + Linear updates done.

## Recent Architectural Choices

See architectural-decisions.md for logged decisions.

## In-Progress Work

All session work committed. Nothing in flight.

## Completed This Session

- Stripe: Foundation ($44/mo, price_1TBs6jDOMULuvIJbVtU9VrT1) + Growth ($99/mo, price_1TBs8ODOMULuvIJbfRvbOqgo) created
- Price IDs wired into .env.local (STRIPE_FOUNDATION_PRICE_ID, STRIPE_GROWTH_PRICE_ID)
- Snapshot webhook verified has customer.subscription.updated
- 4 template test files skipped (NullStateStore/pact-python infra absent)
- Test suite: 593 passed / 99 skipped / 0 failed
- Linear: GP-255 → Done, GP-268 → comment added

## Next Steps

- P0: Replace localStorage auth with real JWT email+password login/signup
- Profile fields on signup: full name + optional IICRC number
- Exam pass chain: quiz ≥80% → PDF cert + email + CEC report
- Lesson access gate: check subscription on lesson load
- Course import: WP API + Drive DISCOVER pipeline (~91 courses)
- GP-207: Fly.io custom domain (api.carsi.com.au) still In Progress

## Last Updated

17/03/2026 18:30 AEST (manual)
