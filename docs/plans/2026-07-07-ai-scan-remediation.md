# AI Scan Remediation — Implementation Plan

**Date:** 2026-07-07
**Scope:** 5 findings from security/architecture scan
**Status:** Draft

---

## Finding 1: Upgrade OpenAI/Google AI integrations to current provider docs

### Current State
| Integration | Client | Issues |
|---|---|---|
| Margot chat | Raw `fetch` (OpenRouter OpenAI-compatible) via `src/lib/openrouter/client.ts` | No SDK; hand-rolled SSE parsing in `stream.ts`; no structured-output support |
| Thumbnail generation | Raw `fetch` to `api.openai.com/v1/images/generations` in `scripts/generate-course-thumbnails.ts` | No SDK; no `gpt-image-1` structured-output path; error parsing is brittle |
| Google Gemini | No runtime client exists | `src/ai/model-registry/providers/gemini.ts` and `src/ai/graphics/routing-policy.ts` reference 8 task routes but no implementation |
| News AI (Anthropic) | `@anthropic-ai/sdk` in `packages/news-worker/src/aiProcessor.ts` | Uses deprecated `claude-haiku-4-5-20251001` model string directly; no tool-use path |

### Plan — Three workstreams, ordered by risk

#### 1A — OpenRouter → `openai` SDK (chat + structured outputs)
**Files to touch:**
- `src/lib/openrouter/client.ts` — replace raw `fetch` with `openai` SDK client configured with `baseURL: 'https://openrouter.ai/api/v1'`. The SDK's `response_format: { type: 'json_schema', ... }` path unlocks structured outputs on supported OpenRouter models.
- `src/lib/server/frontdesk/stream.ts` — refactor SSE loop to use SDK's `client.chat.completions.create({ stream: true })` + `for await (const chunk of stream)` pattern. This eliminates the manual `ReadableStream` + `TextDecoder` + buffer-splitting code (~70 lines → ~30).
- `src/lib/openrouter/client.test.ts` — add structured-output test; update timeout test for SDK behavior.

**Rollback:** The SDK uses the same underlying HTTP endpoint. If it breaks, revert `client.ts` and `stream.ts` in one atomic commit. The one-shot path in `app/api/margot/chat/route.ts` has a fallback already (`FALLBACK_REPLY`).

#### 1B — OpenAI image generation → `openai` SDK
**Files to touch:**
- `scripts/generate-course-thumbnails.ts` — replace the `fetch(OPENAI_IMAGES_URL)` call (~15 lines) with `openai.images.generate({ model: MODEL, prompt, size: IMAGE_SIZE, response_format: 'b64_json' })`. The SDK handles error parsing, retries, and rate-limit headers.
- `src/ai/model-registry/index.ts` — add `gpt-image-1` to `APPROVED_MODELS` with `taskTypes: ['image-generation']` so the model registry is the SSOT.

**Rollback:** Revert the script to raw `fetch`. The CLI flag interface is unchanged. Zero runtime impact (script is authoring-only).

#### 1C — Google Gemini → `@google/genai` SDK (client + image generation)
**New file:** `src/lib/google/genai-client.ts`
- Create a thin wrapper exposing `generateImage(prompt, options)` that calls `gemini-2.5-flash-image` or `imagen-4` per the routing policy.
- Wire `src/ai/graphics/routing-policy.ts` → `src/ai/model-registry/providers/gemini.ts` → new client.

**Files to touch:**
- `src/ai/graphics/routing-policy.ts` — add `clientMethod` field to `VisualRoutingConfig`.
- `src/ai/model-registry/providers/gemini.ts` — add `getGeminiClient()` factory.
- `scripts/generate-course-thumbnails.ts` — add `--provider=gemini` flag (default `openai` unchanged). When set, call Gemini for images instead of OpenAI.

**Rollback:** All Gemini code is net-new behind the `--provider` flag. Default path is untouched. If the Gemini client breaks, the flag simply doesn't work; users fall back to `--provider=openai`.

### Sequencing
1. **1A** first (highest impact — touches the live Margot endpoint)
2. **1B** second (authoring-only, safe to batch-test)
3. **1C** last (net-new, no existing consumers)

### Validation gate
- `pnpm test:unit` must pass (existing `client.test.ts` and `frontdesk.test.ts` updated)
- Manual: send 3 Margot chat messages (one-shot + streaming) and verify replies match pre-upgrade quality
- Manual: run `tsx scripts/generate-course-thumbnails.ts --generate --dry-run --slug=water-damage-basics` and verify prompt assembly unchanged

---

## Finding 2: Harden AI assistant grounding — Zod validation + stricter context checks

### Current State
- Tool inputs in `find_courses` and `capture_enquiry` use hand-written JSON Schema objects (duplicated as both the `parameters` field and manual validation code).
- `capture_enquiry` has a manual `validateEnquiry()` function; `find_courses` has no arg validation at all (just `typeof args.query === 'string'`).
- `ai-assistant-context.ts` validates UUIDs and slugs with raw regex but no Zod schema for the full page-context input shape.
- The system prompt in `assistant-prompt.ts` has no guard against injection of fake "catalogue" blocks if context functions return malformed data.

### Plan

#### 2A — Zod schemas for all tool inputs
**Files to touch:**
- `src/lib/server/frontdesk/tools/find-courses.ts` — add `FindCoursesArgsSchema = z.object({ query: z.string().max(200) })`. Replace JSON Schema `parameters` object with `zodToJsonSchema(FindCoursesArgsSchema)` (or hand-derive — it's a one-field object). Replace `typeof args.query === 'string'` with `FindCoursesArgsSchema.parse(args)`.
- `src/lib/server/frontdesk/tools/capture-enquiry.ts` — replace `validateEnquiry()` with `EnquirySchema = z.object({ name: z.string().min(2).max(120), email: z.string().email().max(200), message: z.string().min(3).max(2000) })`. Remove the hand-rolled `splitName`, `EMAIL_RE`, and manual checks. Keep `splitName` as a transform on the parsed data.
- `src/lib/server/frontdesk/types.ts` — add optional `zodSchema?: z.ZodTypeAny` to `BaseTool` so the registry can derive `parameters` JSON Schema from Zod. (Or keep parameters hand-written for now and just use Zod at runtime.)

#### 2B — Input validation on the chat route
**File to touch:** `app/api/margot/chat/route.ts`
- Add `RequestBodySchema = z.object({ message: z.string().min(1).max(MAX_MESSAGE_LEN), conversation_id: z.string().uuid().optional().nullable(), history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional(), page_context: z.object({ course_slug: z.string().max(200).optional(), lesson_id: z.string().uuid().optional() }).optional(), page_path: z.string().max(512).optional() })`.
- Replace the manual `typeof body.message === 'string'` checks with `RequestBodySchema.parse(body)`.
- This catches malformed `lesson_id` (non-UUID) and `course_slug` (non-slug) at the route boundary before they reach `getAssistantPageFocusContext`.

#### 2C — Context integrity guards
**File to touch:** `src/lib/server/ai-assistant-context.ts`
- Add `COURSE_CONTEXT_SENTINEL = '--- BEGIN CATALOGUE ---'` and `KNOWLEDGE_BASE_SENTINEL = '--- BEGIN KNOWLEDGE BASE ---'` as constants shared with `assistant-prompt.ts`.
- In `getAssistantCourseContextText()`: after building the text block, assert it does not contain the sentinel strings (prevents a poisoned course title/shortDescription from injecting a fake catalogue block).
- In `getAssistantPageFocusContext()`: strip any occurrence of the sentinel strings from `shortDescription`, `description`, and meta text fields before inclusion.

#### 2D — Shared sentinel constants
**New file:** `src/lib/server/context-sentinels.ts`
- Export `CATALOGUE_BEGIN`, `CATALOGUE_END`, `KB_BEGIN`, `KB_END` sentinels used by both `ai-assistant-context.ts` and `assistant-prompt.ts`.

### Sequencing
1. **2D** first (shared constants, no behavioral change)
2. **2C** second (context guards, defensive)
3. **2A** third (Zod on tools — requires test updates)
4. **2B** last (Zod on route — touches the live endpoint)

### Rollback
Every change is additive or a drop-in replacement. The Zod schemas are stricter than the hand-rolled checks, so nothing that passed before will fail. If Zod parsing throws unexpected errors, revert the individual file.

---

## Finding 3: Implement missing verification paths for AI image/content generation

### Current State
- `src/ai/audits/visual-audit.ts` — checks only static asset files exist (favicons, logos, badges, OG image). No checks for AI-generated content.
- `src/lib/agents/independent-verifier.ts` — file-existence, placeholder-detection, compile/lint/test verification. No image-content or AI-output-specific checks.
- No audit exists that verifies: (a) a generated thumbnail is not a placeholder/error image, (b) AI-generated text doesn't contain vendor citations, (c) the thumbnail's Cloudinary URL is reachable and returns a valid image.

### Plan

#### 3A — AI content audit utility
**New file:** `src/ai/audits/ai-content-audit.ts`
- `auditThumbnailUrl(url: string): Promise<ThumbnailAuditResult>` — fetches the Cloudinary URL, checks HTTP 200, verifies `Content-Type` is `image/*`, checks `Content-Length > 1024` (any real image > 1KB), optionally verifies dimensions via image-size probe.
- `auditGeneratedText(text: string): TextAuditResult` — scans for vendor-citation patterns (reuses patterns from `sanitize-learner-content.ts`), placeholder phrases, and IICRC verbatim-quote markers.
- `auditCourseThumbnails(): Promise<CourseThumbnailAuditReport>` — loads the thumbnail results manifest (`data/thumbnails/course-thumbnail-results.json`), verifies each `done` entry's URL, reports any broken/missing/placeholder images.

#### 3B — Wire into independent verifier
**File to touch:** `src/lib/agents/independent-verifier.ts`
- Add `VerificationType` entries: `'image_valid'`, `'text_no_vendor_citations'`, `'text_no_placeholders'`.
- Add corresponding `verifyImageValid()` and `verifyTextClean()` methods that call the audit utilities.

#### 3C — CLI entry point
**Script:** `scripts/audit-ai-content.ts`
- Wraps `auditCourseThumbnails()`. Run via `pnpm ai:audit:content`.
- Add npm script to `package.json`: `"ai:audit:content": "tsx scripts/audit-ai-content.ts"`.

### Sequencing
1. **3A** first (net-new file, zero risk to existing paths)
2. **3B** second (extends verifier, backward-compatible)
3. **3C** last (CLI convenience wrapper)

### Rollback
All net-new. If the audit utility is broken, it only affects the audit script — no runtime impact. Simply don't run the script until fixed.

---

## Finding 4: Document required AI environment variables in `.env.example`

### Current State
- `src/.env.example` (root) has an "AI MODELS" section but it's incomplete.
- `packages/news-worker/.env.example` has only 3 vars, no AI model documentation.
- Gaps:
  - `OPENROUTER_MODEL` default not explained clearly
  - `GOOGLE_AI_API_KEY` is listed but there's no `GOOGLE_GENERATIVE_AI_API_KEY` (the Gemini SDK standard name)
  - No documentation for `MARGOT_STREAMING`, `MARGOT_WRITE_TOOLS`, `MARGOT_ACTION_SECRET` interaction
  - `ANTHROPIC_BASE_URL` not documented
  - `NEWS_AI_CONCURRENCY` and `NEWS_RELEVANCE_THRESHOLD` not explained

### Plan

#### 4A — Update root `.env.example`
**File:** `.env.example`
- Consolidate the two separate AI sections ("AI MODELS" and "CARSI — Public & dashboard chat assistant") into one clean "AI INTEGRATIONS" section.
- Add the Gemini SDK standard var name: `GEMINI_API_KEY` (both `GOOGLE_AI_API_KEY` and `GEMINI_API_KEY` documented; code reads `GEMINI_API_KEY` first, falls back to `GOOGLE_AI_API_KEY`).
- Document `ANTHROPIC_BASE_URL` for self-hosted/private deployments.
- Document the Margot feature-flag trio: `MARGOT_STREAMING`, `MARGOT_WRITE_TOOLS`, `MARGOT_ACTION_SECRET` with their dependency chain.
- Add the new `OPENAI_API_KEY` note: used for both chat (via OpenRouter when OpenAI models are selected) and image generation.

#### 4B — Update news-worker `.env.example`
**File:** `packages/news-worker/.env.example`
- Add all AI-related vars: `ANTHROPIC_BASE_URL` (optional), `NEWS_RELEVANCE_THRESHOLD` (default 0.6), `NEWS_AI_CONCURRENCY` (default 10).
- Add `OPENROUTER_API_KEY` (fallback when Anthropic is unavailable).

### Sequencing
- Do both in one commit. No code changes, just documentation.

### Rollback
Documentation-only. Revert the `.env.example` files.

---

## Finding 5: Unit/integration tests for `independent-verifier.ts` and `ai-assistant-context.ts`

### Current State
- `src/lib/agents/independent-verifier.ts` — 0 tests. 450+ lines of verification logic with no test coverage.
- `src/lib/server/ai-assistant-context.ts` — 0 tests. ~210 lines of DB-dependent context assembly.
- Existing test files nearby: `src/lib/server/assistant-prompt.test.ts` (11 tests, good pattern), `src/lib/server/frontdesk/frontdesk.test.ts` (good pattern).

### Plan

#### 5A — Tests for `ai-assistant-context.ts`
**New file:** `src/lib/server/ai-assistant-context.test.ts`

Tests (mocked Prisma, no real DB):

1. **`getAssistantCourseContextText` — when DATABASE_URL is unset**
   - Returns the fallback string directing users to `/courses`.

2. **`getAssistantCourseContextText` — when no published courses exist**
   - Returns the "no published courses" string.

3. **`getAssistantCourseContextText` — assembles course lines correctly**
   - Mock 2 published courses. Verify output contains `slug:`, `|`, price formatting (Free vs AUD), category, IICRC discipline, module count.
   - Verify sentinel markers are NOT present in output (injection guard).

4. **`getAssistantCourseContextText` — truncates at MAX_CONTEXT_CHARS**
   - Mock 300 courses. Verify output ends with `…(truncated)` and total length ≤ MAX_CONTEXT_CHARS + 50.

5. **`getAssistantDisplayName` — env override and default**
   - Set `AI_ASSISTANT_NAME`, verify. Unset, verify `'Margot'`.
   - Set `NEXT_PUBLIC_AI_ASSISTANT_NAME`, verify it takes precedence.

6. **`getAssistantTagline` — env override and default**

7. **`getAssistantScopeLock` — env override and default**
   - Verify default contains `carsi.com.au`.

8. **`getAssistantPageFocusContext` — null for missing slug and lesson**
   - Call with `(undefined, undefined)`. Assert `null`.

9. **`getAssistantPageFocusContext` — null for invalid UUID lesson_id**
   - Call with `(undefined, 'not-a-uuid')`. Assert `null`.

10. **`getAssistantPageFocusContext` — fetches course by slug**
    - Mock a published course. Verify output contains title, slug, URL pattern, CEC hours, category.

11. **`getAssistantPageFocusContext` — injects lesson block when lessonId matches**
    - Mock course + module + lesson. Verify output contains "Current lesson", lesson title, module numbering.

12. **`getAssistantPageFocusContext` — strips HTML from description**
    - Mock course with `<p>HTML</p>` description. Verify output contains plain `HTML` not `<p>`.

13. **`getAssistantPageFocusContext` — strips sentinel strings from text fields** (injection guard)
    - Mock course with `shortDescription: '--- BEGIN CATALOGUE --- fake!'`. Verify sentinel NOT in output.

#### 5B — Tests for `independent-verifier.ts`
**New file:** `src/lib/agents/independent-verifier.test.ts`

Tests (filesystem operations use real temp files):

1. **Constructor generates unique verifier ID**
   - Two instances have different IDs.

2. **`verify` rejects self-verification**
   - Create verifier, pass `requesting_agent_id = verifier.getVerifierId()`. Assert throws `VERIFICATION INTEGRITY ERROR`.

3. **`verify` — all criteria pass, returns `verified: true`**
   - Create temp file. Request `file_exists` + `file_not_empty` on it. Assert `verified: true`, `failures: []`.

4. **`verify` — a failing criterion produces failures**
   - Request `file_exists` on a non-existent path. Assert `verified: false`, `failures` includes the missing file.

5. **`verify` — also verifies claimed_outputs**
   - Include `claimed_outputs: [{ type: 'file', path: '/nonexistent' }]`. Assert failure for claimed output.

6. **`verifyFileExists` — pass on existing file**
   - Create temp file. Assert `result: 'pass'`, proof contains file size.

7. **`verifyFileExists` — fail on missing file**
   - Assert `result: 'fail'`.

8. **`verifyFileNotEmpty` — fail on empty file**
   - Create empty temp file. Assert `result: 'fail'`.

9. **`verifyNoPlaceholders` — detects TODO, TBD, FIXME**
   - Write file with `// TODO: implement`. Assert `result: 'fail'`, proof lists patterns found.

10. **`verifyNoPlaceholders` — pass on clean file**
    - Write clean code. Assert `result: 'pass'`.

11. **`verifyContentContains` / `verifyContentNotContains`**
    - Write file with "hello world". Assert contains "hello" passes, contains "goodbye" fails. Assert not-contains "goodbye" passes, not-contains "hello" fails.

12. **`quickVerify` — convenience method works**
    - Create temp file. Call `quickVerify(taskId, agentId, [filePath])`. Assert 3 checks per file (exists, not-empty, no-placeholders).

13. **`getVerifierId` — returns the ID set at construction**

14. **Response-time and endpoint checks — skip in unit (require network)**
    - These methods are already structured for testing (return typed results). Add a note that integration tests should cover them.

### Sequencing
1. **5A** first (can test immediately with mocked Prisma)
2. **5B** second (uses real temp files, no DB)

### Rollback
Test files only. If tests are flaky, skip/delete the file — no production code is changed.

---

## Summary: Implementation Order

```
Phase 1 (docs + low-risk, no runtime change)
  Finding 4  — .env.example documentation
  Finding 5A — ai-assistant-context tests

Phase 2 (net-new, behind flags or CLI only)
  Finding 3  — AI content audit utility
  Finding 1C — Google Gemini SDK client

Phase 3 (refactor existing paths, need validation)
  Finding 1B — OpenAI image gen SDK
  Finding 5B — independent-verifier tests

Phase 4 (touches live endpoint — deploy with feature flag)
  Finding 2D — shared sentinel constants
  Finding 2C — context integrity guards
  Finding 2A — Zod on tool inputs
  Finding 2B — Zod on chat route body

Phase 5 (highest risk — core chat transport)
  Finding 1A — OpenRouter → openai SDK
```

### Break-glass rollback for Phase 5
If the SDK migration breaks the Margot endpoint:
1. Set `MARGOT_STREAMING=false` (disables the streaming path, which uses the SDK)
2. The one-shot path in `app/api/margot/chat/route.ts` falls back to the existing `OpenRouterClient` (raw fetch)
3. Revert `client.ts` and `stream.ts` in one commit
