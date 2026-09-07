# Runbook — who paid and got nothing

`scripts/audit-orphaned-payments.mjs` lists customers who completed a Stripe payment and hold
no access to the course they bought. It is **read-only**: it fulfils nothing and refunds
nothing, because money is the founder's call (`ENGINE.md:43`).

Run it when a customer reports missing access, after any webhook outage, and before deciding
whether the outage cost anything.

## The command

**You should never see, copy, type or paste either credential to run this.** Point the process
at a file that holds them and let it read them itself:

```bash
cd ~/CARSI
node --env-file=<path to the audit env file> scripts/audit-orphaned-payments.mjs --since 2026-08-29
```

Add `--json` for machine-readable output. `--since` defaults to 30 days back. Use
**2026-08-29** for the current investigation: that is when webhook deliveries began failing
(`DECISIONS.md:90`).

An earlier version of this runbook told you to put the values on the command line. Do not do
that, and do not restore it: a secret typed as an argument is written to shell history and is
readable by any process that can run `ps` for as long as the command runs. Handing a path to
the tool achieves the same thing and exposes nothing.

### The env file this expects

One file, holding exactly the two variables the script needs and nothing else:

```
STRIPE_SECRET_KEY=...
DATABASE_URL=...
```

Keep it outside the repo, readable only by you (`chmod 600`). It is deliberately a separate
file from `~/CARSI/.env` — see the first footgun below.

## Two ways to point it at the wrong thing

Both produce a confident, wrong answer, so check them before believing the output.

1. **Do not use `~/CARSI/.env` for this.** `DATABASE_URL` is defined TWICE in it, with no
   comment saying which is which, and the last definition silently wins. If the winning one is
   not the production database, every live payment reads as an orphan and the report is
   confidently wrong. A dedicated file with one `DATABASE_URL` removes the ambiguity entirely
   rather than asking you to remember it.
2. **`STRIPE_SECRET_KEY` in `~/.hermes/.env` is not necessarily CARSI's.** That file holds
   credentials for several businesses. The wrong account lists zero sessions, or somebody
   else's — and note that exit 2 covers the zero-sessions case precisely so a wrong key cannot
   read as a clean bill of health.

Neither footgun requires you to inspect a credential's value to avoid it. If you find yourself
opening a secrets file to compare strings, stop — that is the failure this section exists to
prevent.

## Reading the result

| Exit | Meaning |
|---|---|
| 0 | every paid session in the window has a live enrolment |
| 1 | customers are owed — each one is a refund-or-fulfil decision |
| 2 | **could not audit.** Not a clean bill of health |

Exit 2 fires when the enrolment table could not be read, when zero Stripe sessions were listed,
or when zero enrolment references loaded — each of which would otherwise make an empty result
look like a healthy system.

The summary line `cleared by course access: N` counts customers the raw session-id match would
have accused, who in fact hold the course under a different payment reference. That happens
legitimately when someone was refunded and bought again
(`src/lib/server/enrollment-service.ts:57-68` overwrites the reference). A payer the script
cannot identify is always reported, never cleared — it would rather show you someone who is
fine than hide someone who is not.

Refunded customers are excluded: a refunded Stripe session still reads `payment_status: 'paid'`,
so without that check the people most likely to have been made whole during the outage would
top the list. A **partial** refund is still reported, matching the webhook's own rule
(`app/api/lms/webhooks/stripe/route.ts:107-108`).

## What it does not cover

Subscriptions. It judges one-off course purchases only — subscription checkouts carry no
`course_slug` and are counted as skipped, not as orphans. Membership and team-seat
reconciliation is a separate job that does not exist yet.
