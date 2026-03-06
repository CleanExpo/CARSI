# Sub-Agent Protocol

## Role

Sub-agents execute narrow, isolated, parallelisable tasks. They return **evidence**, not narrative summaries.

## When to Use Sub-Agents

| Use Sub-Agent            | Do NOT Use Sub-Agent      |
| ------------------------ | ------------------------- |
| Route scanning           | Complex implementation    |
| Asset verification       | Tasks requiring reasoning |
| API endpoint checking    | Architecture decisions    |
| Screenshot capture       | Multi-step workflows      |
| Database query execution | Tasks with side effects   |

## Sub-Agent Rules

1. **Narrow scope** — one task, one output
2. **Return evidence** — structured data, not prose
3. **No reasoning required** — if it requires judgement, escalate to specialist
4. **Read-only by default** — sub-agents verify, specialists implement
5. **Parallel safe** — multiple sub-agents may run simultaneously

## Acceptable vs Unacceptable Output

**ACCEPTABLE:**

```json
{
  "route": "/courses",
  "status": 200,
  "response_time_ms": 142,
  "asset_check": {
    "og_image": true,
    "favicon": true,
    "logo": true
  }
}
```

**UNACCEPTABLE:**
"The courses page appears to be loading correctly and the assets seem to be present."

## Sub-Agent Examples

### Route Scanner

Task: Check all Next.js routes return non-500 status

```
Input: list of routes from apps/web/app/
Action: curl each route, record status code
Output: { route: string, status: number }[] sorted by status
Evidence type: Tier 1 (real-time curl)
```

### Asset Verifier

Task: Verify image assets exist at expected paths

```
Input: list of expected asset paths from public/
Action: fs.existsSync() each path
Output: { path: string, exists: boolean, size_kb: number }[]
Evidence type: Tier 1 (filesystem read)
```

### Localhost UI Comparer

Task: Screenshot key pages and verify no blank areas

```
Input: list of routes to capture
Action: Playwright screenshot each route
Output: { route: string, screenshot_path: string, has_blank_regions: boolean }[]
Evidence type: Tier 1 (live screenshot)
```

### API Endpoint Checker

Task: Verify API endpoints respond with correct structure

```
Input: endpoint URL + expected response schema
Action: curl endpoint, validate response against schema
Output: { endpoint: string, status: number, schema_valid: boolean, response_preview: string }
Evidence type: Tier 1 (real-time curl)
```

### Image Placement Checker

Task: Verify images render at expected locations on page

```
Input: page URL + expected image selectors
Action: Playwright, query selectors, check visibility and position
Output: { selector: string, visible: boolean, above_fold: boolean, src: string }[]
Evidence type: Tier 1 (live browser check)
```

### Database Migration Validator

Task: Verify Alembic migrations run cleanly

```
Input: alembic upgrade head command
Action: run on clean database, capture output
Output: { migration_id: string, success: boolean, duration_ms: number, error: string | null }[]
Evidence type: Tier 1 (live command output)
```

## Sub-Agent Output Format Standard

All sub-agents must return output in this format:

```json
{
  "task": "description of task",
  "timestamp": "ISO8601",
  "evidence_tier": 1,
  "results": [ ... ],
  "summary": {
    "total": 10,
    "passed": 9,
    "failed": 1
  },
  "failed_items": [ ... ]
}
```

## Escalation

If a sub-agent encounters an unexpected state (error it cannot handle, result it cannot interpret), it must:

1. Return what it found with `status: "ESCALATE"`
2. Include the raw error
3. NOT attempt to fix or reason about it

The Orchestrator then assigns a specialist agent to investigate.
