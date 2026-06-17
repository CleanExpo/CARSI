# Non-Coder Build Guide - Idea To Production

Updated: 18/06/2026

This guide is for building CARSI with AI assistance without letting AI make the stack vague, bloated, or fragile.

## Your Job Vs The Agent's Job

| Your job                               | Agent's job                                        |
| -------------------------------------- | -------------------------------------------------- |
| Describe the outcome                   | Find the affected files and patterns               |
| Say who uses it                        | Choose the smallest practical implementation       |
| Say what the user should see           | Write or edit the code/docs                        |
| Say what must not happen               | Protect auth, payments, data, and compliance paths |
| Confirm the result against the product | Run checks and report evidence                     |

## The Request Template

Use this shape when asking for a change:

```text
WHAT:       [One sentence - what is being built or changed]
WHERE:      [Which page, API, admin area, script, or doc]
WHO:        [Learner, admin, team buyer, public visitor, operator]
WHEN:       [What triggers this]
SHOULD SEE: [What the user sees when it works]
DO NOT:     [What to avoid]
SUCCESS:    [How we know it is done]
```

Example:

```text
WHAT:       Add a better course recommendation after lesson completion
WHERE:      Learner dashboard and completed lesson page
WHO:        Logged-in learners
WHEN:       A lesson is marked complete
SHOULD SEE: One next course or module suggestion grounded in their current course
DO NOT:     Invent qualifications, discounts, or IICRC promises
SUCCESS:    Build passes and the recommendation is visible for a test learner
```

## What Modern LLMs Can Safely Help With

- Drafting and tightening copy.
- Explaining code and data flows.
- Finding stale docs and duplicate assumptions.
- Generating test cases.
- Creating structured extraction/classification helpers.
- Auditing routes, content, UX, and accessibility.
- Producing first-pass admin summaries or learner guidance.

## What Must Stay Deterministic

Do not let a free-form model decide:

- Who is logged in.
- Whether a payment succeeded.
- Whether a learner is enrolled.
- Whether a certificate is valid.
- Whether an admin has permission.
- Whether an IICRC-related submission is complete.
- Whether a discount applies.

Those paths belong to code, database state, Stripe events, authenticated sessions, and source-backed configuration.

## How To Keep Momentum Without Creating Slop

1. Start from the actual repo, not a template memory.
2. Prefer existing CARSI patterns.
3. Edit the smallest set of files that handles the outcome.
4. Remove stale docs/claims when they contradict the app.
5. Run the closest verification command.
6. Report what passed, what failed, and what was not tested.

## Useful Verification Commands

```bash
npm run type-check
npm run lint
npm run build
npm run test:e2e
npm run test:a11y
```

Use the smallest relevant command first. A documentation-only change does not need a full production build unless it changes app behaviour.

## AI Feature Checklist

Before shipping an AI-assisted feature:

- [ ] The route/component/server module is named.
- [ ] The provider and environment variables are documented.
- [ ] The prompt is grounded in CARSI data.
- [ ] The model output is typed or schema-validated when it affects state.
- [ ] The failure state is helpful and safe.
- [ ] The feature does not invent claims about training outcomes, accreditation, pricing, or compliance.
- [ ] There is evidence: test, build, screenshot, route response, database row, or audit report.
