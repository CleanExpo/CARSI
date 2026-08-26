# Sealing (and first rotating) the `monkfish-app` secrets

**Written 2026-08-26.** Founder-only. An agent must not perform this: sealing requires submitting
the live values, and writing a live Stripe secret key into a field is prohibited regardless of
authorisation. Everything below is verified against DigitalOcean's own App Spec reference, not
assumed.

---

## 1. Rotate first. Sealing an exposed key does not un-expose it

`doctl apps spec get a9d718db-7961-4107-9477-96c72fcf620f` returns the env vars **in plaintext**,
including a live `sk_live_` Stripe secret key and the Mailtrap key. 43 of 44 unencrypted, only
`CRON_SECRET` sealed. Anything holding `doctl` on any machine can read them, and has been able to.

Encrypting a key that has already been readable protects it from **future** reads and does nothing
about the exposure that already happened. So the order is:

1. **Rotate** the exposed credentials at their source (Stripe dashboard, Mailtrap).
2. **Seal** the new values as `type: SECRET`.
3. Only then treat the environment as safe to run money through.

Doing step 2 without step 1 is security theatre. The Stripe key is the urgent one: it is a **live**
key, so it moves real money.

## 2. How DO actually handles `type: SECRET`

From the App Spec reference:

> If the type is `SECRET`, the value will be encrypted on first submission. On following
> submissions, the encrypted value should be used.

So a value is supplied **once in the clear**, DO encrypts it, and from then on the spec carries an
`EV[1:...]` blob instead. DigitalOcean's own guidance is that those encrypted blobs **are safe to
commit to git** — which is what makes step 4 below possible.

## 3. The trap: an omitted env var is a DELETED env var

Also from DigitalOcean, on why variables vanish after an update:

> when updating without the environment variables we take that to mean the current env vars
> should not be included

`app.yaml` in this repo declares **24 env keys with no values and `type: SECRET` on none of them**
— the comment on `DIRECT_URL` even says "Set as an encrypted env var in DO", so the intent was
known and never encoded. Combined with `deploy_on_push: true` on `main`, that is a live hazard: a
spec-driven deploy is capable of undoing sealing, or worse, blanking values.

**Do not test this theory on production.** Seal through the console first, then bring `app.yaml`
into line using the encrypted blobs.

## 4. The order that is safe

1. **Rotate** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MAILTRAP_API_KEY`, `JWT_SECRET`,
   `ADMIN_PASSWORD`, and the database credentials at source. Note that rotating `JWT_SECRET`
   signs every existing session out, so pick the hour deliberately.
2. In the DO console, App → Settings → App-Level Environment Variables, set each secret-bearing
   var to **Encrypted**. The console handles the value so it never passes through a file.
3. Redeploy and confirm the app is healthy — `https://carsi.com.au/api/health` returns
   `{"status":"healthy",...}`.
4. Re-fetch the spec. Secrets now read `EV[1:...]`. Copy those blobs and the `type: SECRET` lines
   into `app.yaml`, so a future `deploy_on_push` reinforces the sealing instead of fighting it.
   Only the encrypted blobs go into git — never a plaintext value, and this repo is public.
5. Re-run `npm run check:secrets -- --all` and confirm exit 0 before committing.

## 5. Why this blocks the revenue work

Two things are waiting on it, and both were the founder's explicit instruction:

- **The subscription flip** (DECISIONS #2, decided 2026-08-26). Creating the Stripe Price needs the
  live key.
- **Roadshow pay-to-play** (`61e8bcc3`). The seat-hold logic is built, tested and shipped dark
  behind `ROADSHOW_PAYMENT_REQUIRED`; what is missing is the Stripe checkout call, which needs the
  same key.

Turning payments on in an environment where any session holding `doctl` can read a live payment
credential is the wrong sequence. The exposure is the larger risk of the two, and it is roughly an
hour of founder work to remove.

## 6. What an agent may do here

Read-only diagnosis, and this runbook. An agent may confirm **which** keys exist and whether they
are sealed, and must never print, copy, store or re-submit a value. If a future session finds
itself constructing a spec file containing a live key, it has already gone wrong — stop and hand
back.
