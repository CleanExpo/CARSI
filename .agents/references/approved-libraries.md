# Approved libraries and dependency governance

**Rule:** Inspect what CARSI already uses before adding packages. No new dependency without justification (bundle, license, a11y, maintenance, duplication).

## Installed and preferred (use these first)

| Area | Library | Repo reality |
|------|---------|--------------|
| Framework | Next.js App Router, React 19 | `app/`, Server Components default |
| UI primitives | Radix UI (`@radix-ui/react-*`) | `src/components/ui/*` |
| Styling | Tailwind CSS v4, `clsx`, `cva`, `tailwind-merge` | `app/globals.css`, design tokens |
| Icons | `lucide-react` | Single icon family — do not mix packs |
| Motion | `framer-motion` | `src/components/ui/motion.tsx`; honour `prefers-reduced-motion` |
| Forms | `react-hook-form`, `@hookform/resolvers`, `zod` | Server + client validation |
| Data | Prisma 7, PostgreSQL (`pg`) | `prisma/schema.prisma`, migrations |
| Payments | Stripe | Entitlements must match purchase |
| Auth/crypto | `jose`, `bcryptjs` | Session patterns in `src/lib/` |
| Monitoring | `@sentry/node` | Production errors |
| Analytics | `posthog-js` | Consent-aware |
| E2E / a11y | Playwright, `@axe-core/playwright` | `e2e/`, `npm run test:a11y` |
| PDF | `pdf-lib` | Certificates / exports |

## shadcn/ui pattern (not a runtime package)

CARSI follows the **shadcn/ui** model: owned source in `src/components/ui/`, Radix primitives, token-driven CSS. See `docs/internal/frontend/shadcn-ui.md` and `components.json`. Extend existing UI components — do not paste parallel button/card implementations.

## Candidates (evaluate before install)

| Library | When justified | Notes |
|---------|----------------|-------|
| TanStack Query | Client server-state with caching needs not covered by RSC + server actions | Not in `package.json` today |
| TanStack Table | Large admin tables needing virtualisation | Prefer existing table patterns first |
| Motion (motion.dev) | New motion APIs | Repo uses `framer-motion`; migrate only deliberately |
| React Bits | Marketing / lesson highlights | Per-component review: bundle, a11y, license; **not** on customer pages that violate Premium Visual rules |
| Storybook | Isolated component docs | Add only if team commits to maintaining stories |

## Forbidden without owner approval

- Duplicate UI frameworks (MUI, Chakra, Bootstrap) alongside Radix/shadcn pattern
- Random icon packs beside Lucide
- Heavy runtime WebGL for marketing (see Premium Visual rules)
- Code-drawn decorative graphics on customer-facing pages (`docs/agents/AGENTS.md`)