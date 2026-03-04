# Current State

> Updated: 04/03/2026 12:20 AEST

## Active Task

Stripe CARSI setup — webhook signing secret still pending.

## Completed This Session

- Fixed OCR error in CARSI Stripe secret key (P00ahL9 → P0OahL9) in both .env.local files
- Added dev-mode webhook bypass when STRIPE_WEBHOOK_SECRET is empty (commit 71eb109)
- Stripe CARSI test account: acct_1T74VNDOMULuvIJb
- Keys stored in apps/backend/.env.local and apps/web/.env.local (gitignored)
- All webhook tests passing (2/2)

## In-Progress Work

- STRIPE_WEBHOOK_SECRET still empty — Stripe CLI "stripe listen" fails with
  "Invalid user agent" error (Claude Code sandbox modifies HTTP User-Agent headers)
- Google Cloud Console: OAuth2 project for Drive API not yet set up

## Next Steps

1. Get STRIPE*WEBHOOK_SECRET via one of:
   a) Open a regular Windows Terminal (outside Claude Code) and run:
   C:\Users\Phill\AppData\Local\stripe-cli\stripe.exe listen --forward-to http://localhost:8000/api/lms/webhooks/stripe
   b) Stripe Dashboard → CARSI test account → Developers → Webhooks → Add endpoint → copy whsec*\*
2. Paste whsec\_\* into STRIPE_WEBHOOK_SECRET in both apps/backend/.env.local and apps/web/.env.local
3. Google Cloud Console setup (Drive API + OAuth2)

## Branch

feature/gamification-subscription-iicrc

## Stripe Keys (CARSI test account — test mode only)

- Account: acct_1T74VNDOMULuvIJb
- PK: pk_test_51T74VNDOMULuvIJb...RLXPgbTG
- SK: sk_test_51T74VNDOMULuvIJb...nUyE8z (correct key has P0OahL9 near end)
- Webhook secret: PENDING
