# GP-573 — Unauthenticated-surface findings (2026-09-06 sweep)

Parent context: split out of **GP-558** so residual items stay tracked after that issue closed.

## The four findings

| #   | Finding                                                              | Remediation (2026-11-02)                                                                                                       | Evidence                                               |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| 1   | Secret scanner recognised Stripe shapes only                         | **Expanded** patterns in `scripts/secret-scan-core.mjs` (GitHub, AWS AKIA, Slack, Anthropic, OpenAI project, Stripe unchanged) | `src/lib/security/secret-scan-core.test.ts`            |
| 2   | Public endpoints 500 on non-UUID ids                                 | **Fixed** — validate UUID before Prisma in `getPublicCredentialJson` / PDF path                                                | `src/lib/server/uuid-param.ts`, `credential-public.ts` |
| 3   | `/api/v1/connections/status` public infra manifest                   | **Fixed** — `requireCron` (Bearer `CRON_SECRET`)                                                                               | `app/api/v1/connections/status/route.ts`               |
| 4   | `/api/health/routes` lists all routes + `?verify=true` amplification | **Fixed** — same cron gate; verify mode only reachable with secret                                                             | `app/api/health/routes/route.ts`                       |

## Operational notes

- Mission Control / internal pollers must send `Authorization: Bearer $CRON_SECRET` to `connections/status` and `health/routes`.
- Public credential verify remains intentionally unauthenticated but rate-limited (`app/api/lms/credentials/[credentialId]/route.ts`); invalid ids → 404, not 500.
- Full secret coverage (DB URLs, generic JWTs, etc.) is **still open** — this pass closes the “Stripe-only scanner” gap, not a trufflehog replacement.

## Related docs

- SPM security spec: `docs/specs/spm-security-remediation-2026-07-12.md` (WS5 secret scan)
- Supabase anon exposure: `docs/security/README.md` (#121)
