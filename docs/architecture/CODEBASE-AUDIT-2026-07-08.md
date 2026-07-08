# CARSI Codebase Audit & Refactor — 8 July 2026

Principal-architect pass focused on **safe, verified cleanup** without breaking production LMS, marketing, or go-live paths. A full `features/` migration was **not** attempted (500+ `@/lib` imports; high break risk).

---

## Summary

| Area | Action |
|------|--------|
| Git bloat | Untracked `.video-work/` scratch audio (9 files) |
| Orphan UI | Removed ~70 unused component/hook/lib files |
| Dependencies | Removed 7 unused packages (−423 transitive) |
| Broken link | Calendar CTA `/calendar/submit` → `/submit/event` |
| Internal tools | Gated `/tasks` and `/dashboard/agent-runs` behind `INTERNAL_TOOLS_ENABLED` |
| Build | `type-check`, `build`, and 383 unit tests pass |

---

## Removed files

### Root / git hygiene
- `.video-work/**/*.wav`, `.aiff` — local video-pipeline scratch audio (now in `.gitignore`)

### One-off commit-split scripts
- `scripts/split-fixes-9-commits.sh`
- `scripts/split-email-8-commits.sh`
- `scripts/split-phase1-38-commits.sh`
- `scripts/split-phase3-58-commits.sh`
- `scripts/split-email-branding-5-commits.sh`

### Orphan layout (zero imports; sidebar linked to non-existent routes)
- `src/components/layout/sidebar.tsx`
- `src/components/layout/header.tsx`
- `src/components/layout/footer.tsx`

### Agentic workflow UI (no app routes; API proxies kept)
- `src/components/workflow/**` (~30 files)
- `src/hooks/use-collaboration.ts`
- `src/hooks/use-workflow-execution.ts`
- `src/lib/stores/workflow-store.ts`
- `src/lib/collaboration/yjs-provider.ts`
- `src/types/workflow.ts`

### Demo / prototype clusters (zero imports)
- `src/components/council-of-logic/**`
- `src/components/status-command-centre/**`
- `src/components/search/SearchInterface.tsx`
- `src/components/prd-generator-form.tsx`
- `src/components/prd-generation-progress.tsx`
- `src/components/contractor-availability.tsx`
- `src/components/contractor-availability-live.tsx`
- `src/lib/api/contractors.ts`
- `src/types/contractor.ts`
- `src/lib/api/digitalocean.ts`

### Dead LMS / marketing components
- `src/components/JobCard.tsx` (jobs page defines its own)
- `src/components/ThemeToggle.tsx` (superseded by `PublicThemeToggle`)
- `src/components/lms/AdminMetrics.tsx`
- `src/components/lms/StreakTracker.tsx`
- `src/components/lms/CredentialVerificationCard.tsx`
- `src/components/lms/QuizResult.tsx` (`EnterpriseQuizResult` in `QuizPlayer` is used)
- `src/components/lms/DriveFilePicker.tsx`
- `src/components/marketing/index.ts`
- `src/components/marketing/hero-section.tsx`
- `src/components/marketing/feature-grid.tsx`
- `src/components/marketing/testimonials.tsx` (live page uses `testimonials/TestimonialCard.tsx`)

### Unused hooks & image-generation cluster
- `src/hooks/use-auth.ts`
- `src/hooks/use-prd-generation.ts`
- `src/hooks/use-image-generation.ts`
- `app/api/generate-image/route.ts`
- `src/lib/image-generation/**`
- `src/lib/design-system/**`

---

## Moved files

None in this pass. Deliberately avoided mass path-alias moves to prevent import churn.

---

## Renamed files

None.

---

## Modified (not removed)

| File | Change |
|------|--------|
| `.gitignore` | Added `.video-work/` |
| `src/lib/internal-tools.ts` | Added `/tasks`, `/dashboard/agent-runs` to internal prefixes |
| `app/(public)/calendar/page.tsx` | Fixed event submit CTA href |
| `package.json` / `package-lock.json` | Removed unused dependencies |

---

## Removed npm dependencies

| Package | Reason |
|---------|--------|
| `dots-wrapper` | Only consumer was deleted `digitalocean.ts` |
| `@surma/rollup-plugin-off-main-thread` | No references |
| `ts-node` | Scripts use `tsx`; not referenced in CARSI scripts |
| `@xyflow/react`, `reactflow` | Workflow UI removed |
| `y-websocket`, `yjs` | Collaboration provider removed |
| `@google/generative-ai` | Image-generation cluster removed; thumbnail scripts use Cloudinary |

---

## Intentionally kept

| Item | Reason |
|------|--------|
| `app/api/workflows/**` | Working proxy layer; may wire UI later |
| `app/(dashboard)/agents`, `/tasks`, `/dashboard/agent-runs` | Product stubs; gated when `INTERNAL_TOOLS_ENABLED` is off |
| `src/components/lms/SubscriptionStatus.tsx` | Go-live component — wire to dashboard/settings (see recommendations) |
| `src/ai/graphics/routing-policy.ts` | Policy-as-code; referenced by governance template |
| `app/(dashboard)/instructor/**` | Instructor hub pages (partial LMS APIs) |
| `deploy/Dockerfile`, `deploy/Dockerfile.migrate`, `app.yaml` | Production deploy (DigitalOcean) |

---

## Architecture assessment

**Current structure (appropriate for this codebase):**

```
app/           # App Router routes + API
src/components # UI by domain (lms, marketing, admin, landing, ui)
src/lib/       # Business logic, server modules, auth, env
src/hooks/     # Shared client hooks
prisma/        # Schema + migrations
scripts/       # DB seeds, verification, media pipelines
e2e/ + tests/  # Playwright + a11y
```

**Not migrated:** `features/` layout — would touch 700+ import sites; schedule as a dedicated sprint with codemod.

---

## Security notes

- No secrets removed or committed
- Internal agent/task routes now redirect to `/` when `INTERNAL_TOOLS_ENABLED !== 'true'`
- Stripe/subscription APIs remain fail-closed without live Price IDs

---

## Recommendations (future)

1. **Wire `SubscriptionStatus`** on `/dashboard/settings` or student profile using existing `/api/lms/subscription/status`.
2. **Agentic layer decision:** delete stub pages + crons **or** add Next.js proxy routes for `/api/agents/*` and `/api/tasks/*` (mirror `app/api/workflows`).
3. **Instructor hub:** either add nav links + real LMS routes, or gate behind `INTERNAL_TOOLS_ENABLED`.
4. **RPL portfolio** (`/dashboard/student/rpl`): add sidebar link or remove until APIs exist.
5. **Docs drift:** update `README.md`, `docs/AI_PROVIDERS.md` to remove references to deleted `image-generation` paths.
6. **Standalone build warnings:** `next.config.ts` NFT trace + missing `Dockerfile.migrate` copy in standalone output — review `outputFileTracingIncludes` for DO deploy.
7. **Feature-folder migration:** plan with `jscodeshift` when team capacity allows.

---

## Root directory cleanup (8 July 2026 — pass 3)

Moved Docker out of root; deploy still works via updated `app.yaml` paths:

| Change | Notes |
|--------|-------|
| `Dockerfile` → `deploy/Dockerfile` | DO `dockerfile_path: deploy/Dockerfile` |
| `Dockerfile.migrate` → `deploy/Dockerfile.migrate` | PRE_DEPLOY migrate job |
| Removed `.dockerignore` | Build context is git checkout (no local `node_modules`) |
| `AGENTS.md` → `docs/AGENTS.md` | Agent docs out of root |
| Removed `tsconfig.tsbuildinfo` | Regenerated by `tsc`; already gitignored |

---

## Root directory cleanup (8 July 2026 — pass 2)

Removed non-production root clutter:

| Removed | Reason |
|---------|--------|
| `vercel.json` | Production is DigitalOcean (`app.yaml`); Vercel retired |
| `.lighthouseagenticrc.json` + `.github/workflows/lighthouse-agentic.yml` | Agentic Lighthouse CI; not required for deploy |
| `.mcp.json`, `.autogit.json` | Local IDE/automation config |
| `.readiness-architect/`, `.session-handoff/`, `.harness/` | Agent session artifacts |
| `templates/governance-framework/` | Unused boilerplate; not referenced by build |
| `tsconfig.tsbuildinfo`, `.DS_Store` | Generated / OS junk |

**Essential root kept:** `app.yaml`, `proxy.ts`, `next.config.ts`, `package.json`, `prisma.config.ts`, `playwright.config.ts`, `vitest.config.ts`, `CLAUDE.md`, `README.md`. Dockerfiles live under `deploy/`.

Added `.gitignore` entries so agent/IDE artifacts do not return.

---

## Verification

```bash
npm run type-check   # pass
npm run build        # pass (142 static pages)
npm run test:unit    # 383 tests pass
```
