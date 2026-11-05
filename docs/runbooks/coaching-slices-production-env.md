# Coaching slices — production environment (GP-630 / 633 / 635 / 638)

**Audience:** founder or operator provisioning DigitalOcean App Platform (and GitHub Actions cron).

**Principle:** coaching features use **fail-closed flags** (`=== 'true'` to turn on), except monthly checkout which stays **on unless explicitly disabled**. Never set `CARSI_COACHING_PORTAL_DEV_UNLOCK` on production — boot refuses to start if it is `true`.

---

## 1. Variables already required (unchanged)

These must already be set for carsi.com.au; the new slices reuse them.

| Variable                                          | Role                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                    | Coaching portal, learning paths, accountability state                                   |
| `STRIPE_SECRET_KEY`                               | $495/mo Business Coaching checkout (`price_data` in code — no separate Stripe Price id) |
| `STRIPE_WEBHOOK_SECRET`                           | Subscription + coaching monthly fulfillment                                             |
| `JWT_SECRET`                                      | Portal session                                                                          |
| `OPENROUTER_API_KEY`                              | Ask my coach (GP-630) when enabled                                                      |
| `MAILTRAP_API_KEY` (or configured mail transport) | Accountability nudges (GP-635) when email flag is on                                    |
| `NEXT_PUBLIC_APP_URL`                             | Links in accountability emails (`https://carsi.com.au`)                                 |

---

## 2. New or slice-specific variables (DigitalOcean)

Set in **App → Settings → Environment Variables**. Use **Encrypted** for secrets (see `docs/runbooks/seal-do-app-secrets.md`).

### Recommended rollout

| Order | Variable                                       | Production value                   | What it unlocks                                                                                      |
| ----- | ---------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A     | _(none)_                                       | —                                  | Code merged; flags off → routes 404, no behaviour change                                             |
| B     | `CARSI_COACHING_MONTHLY_ENABLED`               | **omit** or `true`                 | `/ccw-training` and portal locked-home Stripe checkout. Set `false` only to hide checkout everywhere |
| C     | `CARSI_COACHING_ASSISTANT_ENABLED`             | `true`                             | GP-630 member “Ask my coach” + admin Coach questions                                                 |
| D     | `CARSI_COACHING_ACCOUNTABILITY_ENABLED`        | `true`                             | GP-635 portal progress + admin accountability UI                                                     |
| E     | `CARSI_COACHING_ACCOUNTABILITY_EMAILS_ENABLED` | `true` **only after** dry-run cron | GP-635 sends nudges; without D, this has no effect                                                   |
| —     | `CRON_SECRET`                                  | **long random string** (Encrypted) | Bearer for `/api/cron/coaching-accountability` (must match GitHub)                                   |

### Optional (quality of life)

| Variable                              | Suggested production value                           | Notes                                                            |
| ------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| `CARSI_COACHING_MONTHLY_NOTIFY_EMAIL` | `phill.mcgurk@gmail.com` or comma-separated ops list | New subscription / onboarding alerts; defaults to Phill if unset |
| `CARSI_COACHING_BOOKING_URL`          | `https://calendly.com/...`                           | First session booking link in portal; else mailto support        |

### Must not appear on production

| Variable                           | Value                                   |
| ---------------------------------- | --------------------------------------- |
| `CARSI_COACHING_PORTAL_DEV_UNLOCK` | **unset** or anything other than `true` |

---

## 3. GitHub repository secret (cron job)

Workflow: `.github/workflows/notifications-coaching-accountability.yml` (daily 10:00 UTC).

| Secret        | Must equal                                           |
| ------------- | ---------------------------------------------------- |
| `CRON_SECRET` | Same string as `CRON_SECRET` on the DigitalOcean app |

After deploy, dry-run first: set **D** on, leave **E** off. Trigger workflow manually (`workflow_dispatch`) and confirm JSON shows planned reminders with `sent: 0`. Then set **E** to `true`.

Existing workflows (`notifications-recert.yml`, etc.) use the same secret.

---

## 4. Feature ↔ admin URLs (when flags on)

| GP  | Admin                            | Member                                               |
| --- | -------------------------------- | ---------------------------------------------------- |
| 630 | `/admin/coaching-questions`      | Portal home — Ask my coach panel                     |
| 633 | `/admin/coaching-learning-paths` | Prescribed path after coach approval                 |
| 635 | `/admin/coaching-accountability` | `/dashboard/coaching/progress`                       |
| 637 | Partner demo seed (script)       | `/ccw-training/partner-demo`                         |
| 638 | —                                | Live guard only (`live-buy-path-guard.yml` schedule) |

---

## 5. Verification checklist

1. `GET https://carsi.com.au/api/health` — healthy after env change.
2. With flags off: `/admin/coaching-questions` and `/dashboard/coaching/progress` → **404**.
3. With **C** on: signed-in coaching subscriber sees Ask my coach; staff preview sees explicit “subscriber feature” copy, not a silent gap.
4. `gh workflow run live-buy-path-guard.yml` — exit 0 on production (GP-638).
5. Accountability cron (step 3 above) before enabling **E**.

---

## 6. Local development only

| Variable                           | Value                                                         |
| ---------------------------------- | ------------------------------------------------------------- |
| `CARSI_COACHING_PORTAL_DEV_UNLOCK` | `true`                                                        |
| `DATABASE_URL`                     | disposable Postgres (see `config/vitest.pg.config.ts` header) |
| Feature flags                      | set individually to exercise slices                           |

Do not copy local `.env` coaching notify addresses into production unless intentional.
