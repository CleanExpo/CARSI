# SPM Spec — AI Front Desk, Phase 1 (CARSI reference build): Margot → streaming + tool-calling scaffold

**Status:** DRAFT for founder approval · **Repo:** CleanExpo/CARSI · **Date:** 2026-07-10
**Initiative:** Portfolio AI Front Desk (dossier + plan `~/.claude/plans/cheerful-wishing-pizza.md`; memory `portfolio-ai-front-desk`).
**Rule in force:** No spec, no build. This document is read-only planning; no feature code until approved.

---

## 1. Task being planned
- **Original request:** "start Phase 1 on CARSI as the reference build."
- **Interpreted task:** Build the **first reference-build increment** of the shared AI Front Desk on CARSI — evolve **Margot** from a one-shot JSON assistant into a **streaming** assistant with a **tool-calling scaffold** (one safe read-only tool to prove the pattern), all behind a flag. This is the piece that later extracts to `@nexus/front-desk` and rolls to the estate.
- **Target outcome:** With the flag on, Margot replies token-by-token and can call a typed tool to look up course info mid-answer; with the flag off, today's behaviour is byte-for-byte unchanged. Nothing ships to learners until the founder flips the flag.
- **Scope note on "Phase 1":** the roadmap numbers a cosmetic *website template refresh* as phase 1; that library is already largely present in `src/components/marketing`. The **reference-build** value — the part the whole initiative is named for — is the front-desk *brain*. This spec scopes that. **If you actually meant the cosmetic template refresh, say so and I'll re-scope before any code.**

## 2. Current project context
- **Branch/tip:** `origin/main` @ `99b509f8` (quiz-progress fix merged today). Spec authored in worktree `feat/frontdesk-phase1-spec`.
- **Margot today (verified in code):**
  - API `app/api/margot/chat/route.ts` — `POST`, rate-limited (5/min, 100/day per IP), builds a prompt-stuffed system message (`buildAssistantSystemPrompt` + `getAssistantCourseContextText` + `getMargotKnowledgeBaseContext` + page focus), calls `OpenRouterClient.chat()` **one-shot** (`max_tokens 1000`, `maxDuration 60`), persists via `appendMargotTurn`, returns `NextResponse.json`.
  - `OpenRouterClient` (`src/lib/openrouter/client.ts`) — single `chat()` fetch to `/chat/completions`; **no stream method**; `extractText()` helper.
  - UI `src/components/lms/FloatingChat.tsx` — consumes reply one-shot (`await res.json()`, line ~508). **Already contains GP-500 draggable logic** (`useDragControls`, `@/lib/client/margot-position`) + TTS "Listen" (`/api/margot/chat/speech`). Must be preserved.
- **Reuse available (unchanged by Phase 1, wired in Phase 2):** `ccw-roadshow-calendar.ts` (`addRegistrationToCalendar`), `crm-sync.ts` (`emitCrmEvent`/`CrmEventType`), `contact-reply.ts`, Stripe enrolment.
- **Deps:** no `ai` / `@ai-sdk/*` / `@assistant-ui/*` present — streaming stack is greenfield.
- **Unknowns:** whether OpenRouter's default model (`z-ai/glm-5.2`) reliably emits tool-call deltas over SSE — mitigated by a capability probe + graceful fallback (§9).

## 3. Problem statement
- **User (learner/prospect):** Margot feels slow — a multi-second wait then a wall of text; no ability to *act* (look things up, book, enrol) inside the chat.
- **Business:** the front desk is the estate-wide bet; CARSI is the reference. Until Margot streams + calls tools, there is nothing to extract to `@nexus/front-desk`.
- **Why now:** dossier approved; quiz fix cleared; CARSI is the least-risky place to build the reference (internal-ish audience, strong existing grounding + reuse libs).

## 4. Desired outcome
- **User-facing (flag on):** progressive token rendering; Margot can answer "which mould courses do you have?" by calling a `find_courses` tool grounded in the live catalogue, then streaming a grounded reply. Drag, TTS, scope-lock, IICRC guardrails all still hold.
- **System:** a typed **tool registry** + **streaming transport** that is provider-portable (Vercel AI SDK) and structured for later extraction.
- **Success:** flag off = zero behaviour change (proven by an equivalence test); flag on = streaming + one working read tool; all CARSI gates green.
- **Must not happen:** no writes to any external system; no CEC/IICRC terminology regressions; no change to Margot's grounding or scope-lock; no prod DDL.

## 5. Scope
### In scope
1. **Streaming transport.** Adopt **Vercel AI SDK** (`ai` + `@openrouter/ai-sdk-provider`) as the reference mechanism. Add a streaming path — either a `stream` flag on the existing route or a sibling `POST /api/margot/chat/stream` — returning an SSE/`toDataStreamResponse()` stream. Reuse the **exact** existing prompt-build + rate-limit + persistence (persist the assembled final text after the stream closes via `appendMargotTurn`).
2. **Client streaming render.** In `FloatingChat.tsx`, when the flag is on, read the stream and render incrementally; when off, keep the one-shot `res.json()` path. **No changes to drag/position/TTS code.**
3. **Tool-calling scaffold + ONE read-only tool.** A typed tool registry (`src/lib/server/frontdesk/tools/`) with a single tool `find_courses(query)` backed by existing `ai-assistant-context` catalogue data (read-only, no DB writes). Model may call it mid-stream; results fold back into the grounded answer. Registry shaped for later `@nexus/front-desk` extraction.
4. **Flag:** `MARGOT_STREAMING` via the established `*-flag.ts` `envTrue()` pattern; default **off**; documented in `.env.example`.
5. **Tests:** equivalence (flag-off == today), streaming smoke, tool-invocation unit, tool read-only assertion, IICRC-terminology stays green.

### Out of scope (later increments)
- **Write tools** — booking/enrolment/CRM/email (`addRegistrationToCalendar`, `emitCrmEvent`, Stripe, `contact-reply`) → Phase 2 (each needs an approval/confirm gate).
- Voice / STT / telephony (Phase 3–5). `assistant-ui` component adoption (optional Phase 2). `@nexus/front-desk` package extraction (Phase 6). Website template refresh (separable, mostly already present).

### Non-goals / Assumptions / Constraints
- **Non-goal:** changing Margot's persona, grounding sources, or scope-lock.
- **Assumptions:** OpenRouter key present in prod env; catalogue context loads (already handled with a fallback).
- **Constraints:** AU-English + IICRC-CEC terminology (guard must pass); `main = prod` on DO deploy-on-push; ship flag-off; no secrets committed; no unrelated files.

## 6. Existing capability review
| Capability | Location | Reusable? | Notes |
|---|---|---|---|
| Prompt-stuffed grounding | `assistant-prompt.ts`, `ai-assistant-context.ts`, `margot-knowledge-base.ts` | ✅ as-is | streaming reuses the identical system message |
| Conversation persistence | `margot-conversation-store.ts` (`appendMargotTurn`) | ✅ | persist after stream completes |
| Rate limiting | `rate-limit.ts` | ✅ | same guards on the streaming path |
| Feature-flag pattern | `subscriptions-flag.ts` (`envTrue`) | ✅ copy | → `margot-streaming-flag.ts` |
| Catalogue data for `find_courses` | `ai-assistant-context.ts` | ✅ read-only | no new data source |
| Draggable widget + TTS | `FloatingChat.tsx` (GP-500), `/api/margot/chat/speech` | ✅ preserve | do not touch |
| Booking / CRM / enrolment | `ccw-roadshow-calendar.ts`, `crm-sync.ts`, Stripe | ⏸ Phase 2 | write tools, gated later |

## 7. Specialist board review
| Role | Finding | Risk | Recommendation |
|---|---|---|---|
| Product | Streaming is the felt win; one read tool proves value without write risk | Low | Build |
| Architect | AI SDK + provider gives portable streaming+tools; registry must be extraction-shaped | Med | Keep tools pure/typed; no route logic in tools |
| UX | Progressive render + preserve drag/TTS; show a tool-call "looking that up…" affordance | Low | Add subtle tool-status line |
| Security | Read-only tool only; no PII writes; rate limits reused; prompt-injection can't reach a write path this phase | Low | Assert no write import in tools (test) |
| QA | Must prove flag-off equivalence + streaming + tool call | Med | Equivalence test is the gate |
| Devil's advocate | Is AI SDK worth a dep vs hand-rolled SSE? | — | Yes — this is the reference that extracts; throwaway SSE would be rebuilt |

## 8. Judge challenge
| Category | Score | Notes |
|---|---:|---|
| First-source evidence | 24/25 | route/client/UI read directly |
| Clear problem | 18/20 | reference-build framing solid; "which phase" flagged for founder |
| Reuse | 15/15 | grounding, persistence, rate-limit, flag all reused |
| Security | 15/15 | read-only, flag-off default |
| UX clarity | 9/10 | streaming + preserve drag/TTS |
| Testability | 10/10 | equivalence + smoke + unit |
| Cost/simplicity | 4/5 | one new dep family (AI SDK) |
**Total 95/100 → APPROVE BUILD** (contingent on founder confirming "Phase 1 = front-desk brain, not cosmetic template refresh").

## 9. Proposed solution
- **User flow:** open Margot → type → (flag on) tokens stream; if the question needs catalogue facts, a subtle "looking that up…" line shows while `find_courses` runs, then the grounded answer streams.
- **System flow:** client `POST` → route builds identical system prompt → AI SDK `streamText({ model: openrouter(MODEL), tools:{ find_courses }, messages })` → stream to client → on finish, `appendMargotTurn(finalText)`.
- **Capability probe / failure flow:** if streaming or tool deltas error, the route **falls back to the existing one-shot `chat()`** and returns a normal JSON reply — user never sees a failure. Flag-off skips all new code paths.
- **Rollback:** set `MARGOT_STREAMING` unset/false → instant revert to today; no data migration, so rollback is a config flip.

## 10. UX requirements
Entry point unchanged (floating widget). Happy path: incremental tokens. Tool call: one-line status affordance, non-blocking. Empty/error: existing error card + fallback reply. Accessibility: `aria-live="polite"` on the streaming region; respect `prefers-reduced-motion` (no token-flash animation). Preserve keyboard drag (arrow/Home) and TTS.

## 11. Technical requirements
- **Add deps:** `ai`, `@openrouter/ai-sdk-provider` (pin versions; AI SDK v6 line).
- **New files:** `src/lib/server/margot-streaming-flag.ts`; `src/lib/server/frontdesk/tools/find-courses.ts`; `src/lib/server/frontdesk/registry.ts`; streaming handler (route or `/stream` sibling).
- **Changed files:** `app/api/margot/chat/route.ts` (branch on flag) or new route; `src/lib/openrouter/client.ts` only if a shared type is needed; `src/components/lms/FloatingChat.tsx` (stream reader, flag-gated; drag/TTS untouched); `.env.example`.
- **Backward compat:** flag-off path identical; response contract for non-streaming unchanged.
- **Observability:** log tool-call name + latency (no message content).

## 12. Security & privacy
Read-only tool only (unit test asserts tools import no write/db module). Reuse rate limits. No secrets in code/repo. No PII persisted beyond existing conversation store. Prompt-injection cannot reach a mutating action this phase (there is none).

## 13. Verification plan
- **Static:** `npm run type-check`, `npm run lint`, `npm run check:iicrc-terminology`, `check:designations`, `check:cec`.
- **Unit:** flag-off equivalence (same system prompt + same persisted turn shape as one-shot); `find_courses` returns catalogue rows for a known query; tools-are-read-only import assertion.
- **Streaming smoke:** local dev — flag on, send a message, assert a multi-chunk stream and a persisted final turn; flag off, assert one-shot JSON identical to today.
- **Manual:** Margot drags, TTS plays, scope-lock holds, no IICRC/CEC terminology regressions.
- **Evidence required before done:** paste actual `type-check`/`lint`/guard output + test output; CI green on the PR.

## 14. Loop / stress testing
Normal, empty message (400), over-long (400), rate-limit trip (429), OpenRouter 429/502 (graceful), tool throws (fallback to plain stream), model emits no tool call (normal answer), flag toggled mid-session (next request respects new value), duplicate rapid sends (rate-limited).

## 15. Acceptance criteria
- [ ] `MARGOT_STREAMING` flag exists (`envTrue`), default off, documented in `.env.example`.
- [ ] Flag **off** → Margot behaviour byte-for-byte as today (equivalence test passes).
- [ ] Flag **on** → response streams in ≥2 chunks; final assembled text persisted via `appendMargotTurn`.
- [ ] `find_courses` tool callable mid-stream, returns live-catalogue results, performs **no** writes (import-assertion test passes).
- [ ] `FloatingChat` drag (GP-500) + TTS unchanged and working.
- [ ] `type-check`, `lint`, `check:iicrc-terminology`, `check:designations`, `check:cec` all green; CI green on PR.
- [ ] No writes to booking/CRM/enrolment/email; no prod DDL; no unrelated files.

## 16. Goal command
```text
/execute-goal Implement the accepted spec docs/specs/2026-07-10-frontdesk-phase1-margot-streaming.md in ~/CARSI. Completion: MARGOT_STREAMING flag (default off) gates a Vercel-AI-SDK streaming path + a read-only find_courses tool scaffold; flag-off equivalence proven; all listed CARSI gates + CI green on a PR to main. Proof: actual type-check/lint/check:iicrc-terminology output + test output + CI. Constraints: preserve FloatingChat drag(GP-500)+TTS; no write tools; no external writes; no prod DDL; ship flag-off; no unrelated files; no secrets; stop and /session-handoff if blocked.
```

## 17. Implementation sequence
1. **Scaffold** — flag file + deps + `frontdesk/registry.ts` + `find-courses.ts` (+ unit tests). Gate: read-only assertion + type-check.
2. **Streaming server** — AI SDK streaming path reusing prompt/rate-limit/persistence + fallback. Gate: streaming smoke + equivalence.
3. **Client** — flag-gated stream reader in FloatingChat; drag/TTS untouched. Gate: manual + lint.
4. **Verify + stress** — full gate suite + edge cases. 5. **Self-judge** vs §15. 6. **/session-handoff**.

## 18. Session-handoff seed
Planned Phase 1 front-desk reference build (streaming + read-only tool scaffold, flag `MARGOT_STREAMING` default off). Key files: `margot-streaming-flag.ts`, `frontdesk/registry.ts` + `tools/find-courses.ts`, streaming route, `FloatingChat.tsx` (stream reader only). Verify: gate suite + equivalence/streaming/tool tests + CI. Deferred: write tools (Phase 2), voice (Phase 3+), `@nexus` extraction (Phase 6). Pickup: confirm "Phase 1 = brain not cosmetic", then run the §16 goal.

## 19. Final recommendation
**Proceed to implementation** on founder confirmation of the Phase-1 interpretation (front-desk brain, flag-off). Smallest safe increment; fully reversible via a flag; builds the exact artifact that extracts to `@nexus/front-desk`.

SPM spec complete. Next safe action: get founder's yes on scope, then run the §16 `/execute-goal`.
