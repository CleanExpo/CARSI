# Current State

> Updated: 04/03/2026 11:52 AEST

## Active Task

Stripe + Google Cloud Console setup (development prep)

## Completed This Session

- GP-124/125/126/127/129/130 — all done and committed
- Stripe CARSI account created: acct_1T74VNDOMULuvIJb (test mode)
- Test keys added to both backend + frontend .env.local
- Stripe CLI downloaded to C:\Users\Phill\AppData\Local\stripe-cli\stripe.exe

## In-Progress Work

- Stripe CLI 2FA auth pending (user needs to enter TOTP code in browser)
- Once authenticated: run `stripe listen --forward-to localhost:8000/api/lms/webhooks/stripe` to get STRIPE_WEBHOOK_SECRET
- Google Cloud Console: needs OAuth2 project for Drive API

## Stripe Keys (CARSI test account)

- Account: acct_1T74VNDOMULuvIJb
- PK: pk_test_51T74VNDOMULuvIJb...RLXPgbTG
- SK: sk_test_51T74VNDOMULuvIJb...nUyE8z
- Webhook secret: PENDING (needs stripe listen)

## Next Steps

1. User enters TOTP → stripe login completes
2. Run: C:\Users\Phill\AppData\Local\stripe-cli\stripe.exe listen --forward-to http://localhost:8000/api/lms/webhooks/stripe
3. Copy whsec\_... into STRIPE_WEBHOOK_SECRET in both .env.local files
4. Google Cloud Console: create CARSI-LMS project, enable Drive API, create OAuth2 creds

## Branch

feature/gamification-subscription-iicrc
