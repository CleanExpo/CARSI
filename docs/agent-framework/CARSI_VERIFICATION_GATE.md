# CARSI Verification Gate

> The review checklist the Compound Engineering loop applies to every
> code-modifying pass (see `COMPOUND_ENGINEERING_LOOP.md`, step 3). Adapted
> from the RestoreAssist rule set in `RA-6774` and re-grounded in CARSI's
> actual code. Each rule lists *why*, the *CARSI reality*, and a *check* you
> can run or eyeball.

## Always-on commands

```bash
npm run type-check    # tsc --noEmit — never skip
npm run lint          # when source changed
npm run test:unit     # when logic/lib changed
npm run test:e2e      # when user-facing flows changed
npm run test:a11y     # when UI/markup changed
```

`type-check` is mandatory on every pass. The rest scale with touched risk.

---

## 1. Auth on protected APIs

**Why:** an unauthenticated route that mutates or reads private data is a
direct breach.

**CARSI reality:** admin/authenticated routes guard with the session helper and
return `401` when absent, e.g. `app/api/admin/courses/route.ts`:

```ts
import { getAdminSessionOrNull } from '@/lib/admin/admin-session';

const session = await getAdminSessionOrNull();
if (!session) {
  return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
}
```

**Check:** any new route under `app/api/admin/**` (or otherwise non-public) must
load a session and 401 before doing work. Public routes must be *intentionally*
public.

```bash
# Routes that never reference a session/auth helper — review each:
grep -rL "getAdminSession\|getSession\|requireAuth\|requireAdmin\|getCurrentUser" \
  app/api/admin --include=route.ts
```

## 2. Bounded Prisma `findMany`

**Why:** an unbounded `findMany` on a growing table is a latency and
memory time-bomb.

**CARSI reality:** ~34 files call `findMany`. New or edited list queries that
can grow with data must pass `take` (and ideally pagination), unless the set is
provably small and fixed.

**Check:**

```bash
# Inspect every findMany lacking an explicit take on the same call:
grep -rn "findMany" app src --include=*.ts | grep -v "take"
```

Each hit is a judgement call — bound it or justify why the row count is capped.

## 3. No raw-SQL string interpolation

**Why:** interpolating user input into raw SQL is injection.

**CARSI reality:** raw SQL lives in a handful of `src/lib/server/*` files
(`leaderboard-xp.ts`, `learner-xp.ts`, `team-course-purchase*.ts`,
`team-course-slug-db.ts`). Use the tagged-template `$queryRaw`/`$executeRaw`
(parameterized). Never `$queryRawUnsafe`/`$executeRawUnsafe` with concatenated
input.

**Check:**

```bash
grep -rn "queryRawUnsafe\|executeRawUnsafe" app src
# Any hit must use a constant query string with no interpolated user input.
```

## 4. No leaked `error.message` in 5xx responses

**Why:** echoing raw exception text into a 500 body leaks stack/driver/DB
internals to clients.

**CARSI reality:** errors should be logged server-side (`src/lib/logger.ts`)
and the client gets a generic message.

**Check:**

```bash
# 5xx bodies that interpolate the caught error — review each:
grep -rn "status: 500" app/api --include=route.ts -B3 | grep "error.message\|err.message\|String(error)"
```

Log the detail; return `{ detail: 'Internal error' }` (or similar) to the
client.

## 5. Upload validation (content sniffing, not just declared MIME)

**Why:** `file.type` is client-controlled; an attacker can label a payload as
`image/png`.

**CARSI reality — known gap:** `app/api/admin/upload/route.ts` enforces a size
cap (`MAX_BYTES = 5MB`) and a MIME **allowlist** (`ALLOWED`), but trusts the
client-declared `file.type` and does **not** sniff magic bytes. When touching
upload paths, validate the leading bytes against the claimed type before
persisting / forwarding to Cloudinary.

**Check:** any new or edited upload handler reads the file header and confirms
the real format matches the allowlisted MIME. Size cap + allowlist are
necessary but not sufficient.

## 6. Subscription / credit / Stripe gating on paid & AI actions

**Why:** ungated AI or paid actions are an uncapped cost and an entitlement
bypass.

**CARSI reality:** AI-assisted endpoints exist (e.g.
`app/api/lms/public/chat/route.ts`, `app/api/generate-image/route.ts`) and
Stripe powers checkout. Any new endpoint that calls a model, generates media,
or unlocks paid content must enforce the relevant entitlement (auth +
subscription/credit/purchase check) *before* spending.

**Check:** trace each AI/paid handler from request → entitlement check → spend.
A model/Stripe call reachable before the gate is a defect.

---

## How this gate is used

1. The Orchestrator (`SENIOR_ORCHESTRATOR_AGENT.md`) treats each rule as a gate.
2. Evidence is collected per `SUB_AGENT_PROTOCOL.md` (structured results, not
   prose) — e.g. the grep output above, captured at review time.
3. A pass is **not** Done until `type-check` is green and every applicable rule
   above is satisfied or has a recorded, accepted exception.
4. New durable rules discovered during a pass get **added here** (compounding),
   not left in chat.

## Provenance

Rule set adapted from RestoreAssist's verification gate referenced in
`RA-6774`. RestoreAssist's rules were generic; these are re-anchored to CARSI's
real files, helpers, and the npm/Next.js/Prisma/Stripe stack.
