# GP-199 — Government-contractor lead magnet: email-capture gate

**Linear:** GP-199 (P2, CARSI project). **Date:** 2026-07-10. **Status:** approved (founder chose "soft gate + email").

## Goal
Deliver the "How to Get on Government Restoration Panels" checklist PDF behind an email-capture gate: a public landing page with an email form that, on submit, captures the lead and reveals + emails the download link.

## Approved decision
**Soft gate + email.** On submit the download link appears on the success card immediately AND is emailed. The PDF stays at `public/downloads/carsi-government-contractor-guide.pdf` (public-but-unlisted — linked nowhere except the success card and the email). No hard token gate (rejected: more code, worse conversion/deliverability, over-engineered for a marketing lead magnet).

## Already done (WIP, kept as-is)
- `docs/marketing/lead-magnets/government-contractor-guide.md` — guide source (IICRC-compliant: IICRC certifications referenced third-person; CARSI framed as IICRC **CEC** provider only).
- `scripts/generate-lead-magnet-pdf.mjs` — deterministic markdown→branded-A4-PDF via the existing `@playwright/test` devDep. Author-time only (honours "prod runtime never runs npm scripts").
- `public/downloads/carsi-government-contractor-guide.pdf` — committed 177 KB asset.

## Architecture (reuse existing CARSI infra — no new primitives, no DB migration)
Mirrors the contact-form pipeline end to end.

| Unit | File | Responsibility | Depends on |
|---|---|---|---|
| Feature flag | `src/lib/server/lead-magnet-flag.ts` | `leadMagnetEnabled()` reads `GP199_GOV_GUIDE_ENABLED` (default off). Ships dark. | `process.env` |
| Capture logic | `src/lib/server/lead-magnet-capture.ts` | Pure helpers: `isValidEmail`, `buildLeadContextMessage`, the download path constant `GOV_GUIDE_DOWNLOAD_PATH`. Unit-tested. | — |
| Email template | `src/lib/server/email-templates.ts` (+ `renderGovContractorGuideEmail`) | Pure `{ html, text }` render with the download link. Unit-tested. | — |
| Email sender | `src/lib/server/transactional-email.ts` (+ `sendGovContractorGuideEmail`) | Renders template, calls `sendEmail` (Mailtrap). | `email.ts`, templates |
| API route | `app/api/lead-magnet/gov-guide/route.ts` | `POST`: `applyRateLimit(ip,5,1h)` → `verifyTurnstileToken` → email regex → `prisma.contactSubmission.create({status:"gp199_gov_guide", ...leadContext})` (guarded by `DATABASE_URL`) → `emitCrmEvent('lead.gov_guide.captured', …)` → `sendGovContractorGuideEmail` → `{ ok, downloadUrl }`. | rate-limit, turnstile, prisma, crm, sender |
| Form | `src/components/lead-magnet/GovGuideForm.tsx` | `'use client'`, email-only, `TurnstileWidget`, POST, success card revealing `downloadUrl`. Trimmed copy of `ContactForm.tsx`. | route |
| Landing page | `app/(public)/resources/government-restoration-panels/page.tsx` | `notFound()` when flag off. Hero + "what's inside" + `<GovGuideForm/>`. Copy passes `check:iicrc-terminology`. | flag, form |

## Data flow
`GovGuideForm` → `POST /api/lead-magnet/gov-guide {email, turnstileToken, leadContext}` → lead persisted to `ContactSubmission` (status `gp199_gov_guide`) + CRM event + Mailtrap email → `{ ok:true, downloadUrl:"/downloads/carsi-government-contractor-guide.pdf" }` → success card shows the link.

## Error / edge handling
- Rate limit exceeded → 429 + `Retry-After` (reuse). Turnstile fail → 403. Invalid email → 400. DB absent (build/preview) → skip persist, still return `downloadUrl` (link is the source of truth; email best-effort). Email send failure → logged, non-fatal (link already shown). Duplicate submit of same email → allowed (new `ContactSubmission` row; no uniqueness needed).

## Compliance gates (must pass)
- `check:iicrc-terminology` on all new copy (landing + email + form): CARSI = "IICRC CEC Accredited" only; never "IICRC course/certification" as a CARSI offering.
- Australian English, metric, AUD (course-production skill) — the guide already conforms.

## Testing
- Vitest: `lead-magnet-capture.test.ts` (email validation, lead-context message), `email-templates` case for `renderGovContractorGuideEmail` (subject + link present).
- Manual/e2e (optional): flag on → page renders form; submit → success card + link. Route-level covered by logic unit tests per CARSI convention (no `route.test.ts`).

## Acceptance criteria
- [ ] `GP199_GOV_GUIDE_ENABLED` off → landing page 404s; nav/sitemap unaffected.
- [ ] Flag on → `/resources/government-restoration-panels` renders form; no IICRC-terminology violations.
- [ ] Valid email submit → 200 `{ok, downloadUrl}`, lead row (`status:"gp199_gov_guide"`) when DB present, success card shows working PDF link.
- [ ] Rate-limit + Turnstile + email-regex enforced (reused).
- [ ] Email rendered with the download link (unit-tested); send is best-effort non-fatal.
- [ ] `type-check`, `lint`, `check:iicrc-terminology`, vitest all green. No DB migration.

## Non-goals (YAGNI)
Hard token gate; new Lead/Subscriber model; double opt-in; analytics dashboard; PDF attachment in email (link only); autoresponder sequences.
