# Quality gates

A modern-looking UI is not a shipped feature. Match gates to what you change.

| Dimension | Acceptance | CARSI commands / artefacts |
|-----------|------------|----------------------------|
| Types | No regressions | `npm run type-check` (always) |
| Lint | Style and obvious bugs | `npm run lint` when source changed |
| Unit | Logic and lib | `npm run test:unit` when logic changed |
| E2E | User journeys | `npm run test:e2e` when flows changed |
| Smoke | Critical paths | `npm run test:smoke` |
| Accessibility | WCAG-oriented checks | `npm run test:a11y` when UI/markup changed |
| Visual (customer) | Premium Visual + SDA evidence | `node scripts/premium-visuals/check-visuals.mjs`; SPM → visual QA workflow |
| Commerce | Purchase → access | `check:live-buy-path`, money-path guards in `package.json` scripts |
| Courses / IICRC | Terminology and compliance | `check:iicrc-*`, `check:cec-*` as applicable |
| Production readiness | Deploy evidence | `docs/agent-framework/CARSI_VERIFICATION_GATE.md`, `audit:verify` where scoped |

Full compound loop checklist: `docs/agent-framework/CARSI_VERIFICATION_GATE.md`.