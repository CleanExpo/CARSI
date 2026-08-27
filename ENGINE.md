# ENGINE.md — how this system runs itself (and what only Phill does)

## The shape
Two engines, one queue:
- **Build engine (your Mac, local Claude session):** owns the repo. Reads GOAL → DECISIONS →
  BACKLOG, takes top unblocked items, builds through the verification gate, updates the files,
  reports RWR delta. Started with one paste (below) — or scheduled on the desktop app.
- **Heartbeat (cloud, scheduled daily):** watches the live site, chases DECISIONS deadlines,
  pulls market data, and sends the morning brief to your phone. It never edits the repo.

## ENGINE START — paste this to start any build session
```
ENGINE START. Read GOAL.md, DECISIONS.md, BACKLOG.md (repo root). You are the single owner of
this repo for this session. Take the topmost unblocked BACKLOG items you can complete today,
in order. Build through docs/agent-framework/CARSI_VERIFICATION_GATE.md; licence guards are
release blockers. Anything blocked on the founder: add to DECISIONS.md with default + deadline,
then continue with the next unblocked item — never stall. Do not create new gates, loops,
formats or orchestration machinery. New ideas → BACKLOG Discoveries, not this session. End by
updating BACKLOG statuses, GOAL current-state, and reporting: RWR delta (or the blocker),
items shipped, decisions awaiting Phill with deadlines, and the one-line customer-visible delta.
```

## Your 20 minutes a day (the founder loop)
1. Read the morning brief (phone).
2. Clear DECISIONS: approve / override / let defaults ride. Send anything in the outbox
   (emails, CEC packs) — sends are yours alone.
3. Drop any new ideas into 2nd Brain/Ideas — never into a running session.
That's it. The system does the rest and tells you what moved.

## Idea + research intake (so your "crazy ideas" feed the machine instead of derailing it)
- Ideas → `2nd Brain/Ideas/` → weekly triage session turns them into BACKLOG rows with a gate
  tag. An idea is never lost and never hijacks a build day.
- Research → the existing sources_watcher → wiki ingest pipeline; signals files feed BACKLOG
  Discoveries. New evidence changes the queue, not the goal.

## Autonomy envelope (how "autonomous" grows without risking the licence)
| Level | What ships without asking | Status |
|---|---|---|
| 1 | Drafts, research, analytics, builds on branches, previews | NOW |
| 2 | Auto-deploy to STAGING when all guards + tests green | wire at Gate 0 done |
| 3 | Auto-merge narrow classes (content pages passing licence guards + visual tests) | Gate 1, opt-in per class |
| 4 | Broad auto-ship to production | not offered — licence-critical business |
Never autonomous, ever: external sends, money, pricing, CEC/IICRC claims, the subscription flip.

> **Capability note added 2026-08-26 — an agent DOES have DigitalOcean access. Do not claim
> otherwise.** A session checked `printenv` for `DIGITALOCEAN_TOKEN`/`STRIPE_SECRET_KEY`, found
> nothing, and reported the subscription flip as impossible. That was wrong: `doctl` is installed
> and authenticated (`contact@unite-group.in`), `doctl apps list` returns `monkfish-app`
> (`a9d718db-7961-4107-9477-96c72fcf620f`), and `app.yaml` carries `deploy_on_push: true` on
> `main`, so the repo itself is a production-config path. **Check `doctl` before asserting a
> credential blocker.** A false "I can't" wastes a founder instruction and hides a real decision
> behind a wrong fact.
>
> **What that access actually exposes, and why the line above still holds.** `doctl apps spec get`
> returns the app's env vars **in plaintext, including a live `sk_live_` Stripe secret key and the
> Mailtrap key** — 43 of 44 unencrypted, only `CRON_SECRET` sealed (matches the private annex
> finding, still true today). So the constraint on money work is not "the agent lacks access"; it
> is that **performing it means handling a live payment credential**, which is prohibited
> regardless of authorisation. Creating a Stripe Price with that key is not a policy technicality
> an instruction can lift.
>
> **Order of operations, therefore:** encrypt or rotate the plaintext secrets FIRST. Flipping a
> revenue switch in an environment where any session holding `doctl` can read a live Stripe key is
> the wrong sequence, and the exposure is the larger risk of the two.

> **Level 2 has a prerequisite that does not exist yet.** There is no staging environment:
> `app.yaml` sets `deploy_on_push: true` on `main`, so the only deploy target is production.
> "Auto-deploy to staging" cannot be wired until a staging app exists. Recorded rather than
> quietly skipped — see DECISIONS #10.

## Session rules (the anti-fight clauses)
1. One session per repo at a time. 2. All work from BACKLOG top-down. 3. Blocked ≠ stopped —
log the decision, take the next item. 4. Guards are blockers. 5. No new machinery. 6. Every
session ends with the RWR line. 7. The heartbeat chases deadlines so nothing stalls silently.
