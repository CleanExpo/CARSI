# Skills Registry - NodeJS-Starter-V1

This file provides an index of all available skills for AI coding agents working with this repository.

## Installed Skills

### Vercel Labs Agent Skills

Location: `.skills/vercel-labs-agent-skills/`

| Skill                       | Description                                     | Trigger Phrases                                       |
| --------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| **react-best-practices**    | 57 React/Next.js performance optimisation rules | "optimise React", "review performance", "bundle size" |
| **web-design-guidelines**   | 100+ accessibility, performance, UX rules       | "review UI", "check accessibility", "audit design"    |
| **vercel-deploy-claimable** | One-command deployment to Vercel                | "deploy my app", "push to production"                 |

### Custom Skills

Location: `.skills/custom/`

| Skill                    | Description                                                                     | Trigger Phrases                                             |
| ------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **genesis-orchestrator** | Phase-locked execution for Next.js full-stack builds                            | "build", "implement", "create feature", "plan architecture" |
| **council-of-logic**     | Mathematical first principles validation (Turing, Von Neumann, Bezier, Shannon) | "optimise", "algorithm", "performance", "complexity"        |
| **scientific-luxury**    | Design system enforcement for Scientific Luxury tier UI                         | "design", "UI", "component", "styling", "animation"         |
| **skill-manager**        | Analyse skill gaps, generate new skills, browse catalogue, validate health      | "skill gap", "generate skill", "skill health", "missing skills" |
| **error-taxonomy**       | Structured error codes, categories, and user-facing messages                    | "error handling", "error codes", "error messages", "error response" |
| **data-validation**      | Zod and Pydantic validation patterns for input sanitisation                     | "validation", "Zod", "Pydantic", "schema", "sanitise", "input" |
| **input-sanitisation**   | XSS, SQL injection, and command injection prevention patterns                   | "XSS", "injection", "sanitise", "security", "escape", "OWASP" |
| **structured-logging**   | JSON-structured logging with correlation IDs and log levels                     | "logging", "logs", "observability", "tracing", "monitoring" |
| **api-contract**         | Typed API contracts between FastAPI (Pydantic) and Next.js (Zod)               | "API contract", "endpoint", "response type", "OpenAPI", "schema" |
| **state-machine**        | Finite state machine patterns for complex flows and status enums               | "state machine", "status", "workflow state", "transitions", "FSM" |
| **cron-scheduler**       | Scheduled task management with overlap protection and CRON_SECRET auth         | "cron", "schedule", "periodic", "interval", "timer", "background job" |
| **csv-processor**        | Streaming CSV parse and generate with Zod/Pydantic row validation              | "CSV", "import", "export", "spreadsheet", "download data", "upload file" |
| **email-template**       | Responsive transactional emails with React Email and Scientific Luxury design  | "email", "template", "notification", "transactional", "welcome email" |
| **metrics-collector**    | Database-backed metrics instrumentation with counters, gauges, and histograms  | "metrics", "KPI", "instrumentation", "analytics", "monitoring", "dashboard data" |
| **dashboard-patterns**   | Real-time dashboard patterns with Status Command Centre, timeline layout, Supabase Realtime | "dashboard", "metrics display", "real-time", "monitoring UI", "command centre" |
| **vector-search**        | pgvector embedding queries, similarity search, hybrid search, multi-provider embeddings | "vector", "embedding", "semantic search", "similarity", "RAG", "pgvector", "cosine" |
| **health-check**         | Liveness, readiness, and deep dependency health endpoints with Docker healthchecks | "health check", "liveness", "readiness", "probe", "heartbeat", "service health" |
| **graceful-shutdown**    | Signal handling, connection draining, and clean resource teardown for backend and frontend | "shutdown", "SIGTERM", "drain", "cleanup", "teardown", "stop_grace_period" |
| **cache-strategy**       | Caching patterns for Python (lru_cache, Redis) and Next.js (fetch cache, revalidation)    | "cache", "Redis", "TTL", "memoise", "revalidate", "lru_cache", "cache-aside" |
| **tracing-patterns**     | Distributed tracing with span context propagation, W3C traceparent, agent span hierarchy  | "trace", "span", "traceparent", "distributed tracing", "correlation", "OpenTelemetry" |
| **docker-patterns**      | Multi-stage builds, layer caching, security hardening, Docker Compose orchestration       | "Docker", "Dockerfile", "container", "image", "multi-stage", "docker-compose" |
| **ci-cd-patterns**       | GitHub Actions workflow optimisation, caching strategies, security scanning pipelines     | "CI/CD", "GitHub Actions", "workflow", "pipeline", "deploy", "cache", "actions" |
| **retry-strategy**       | Exponential backoff, circuit breaker, and retry policies for httpx and fetch clients       | "retry", "backoff", "circuit breaker", "timeout", "resilience", "transient error" |
| **queue-worker**         | Redis-backed background job processing with arq (Python) and BullMQ (TypeScript)           | "queue", "worker", "background job", "Redis queue", "job processing", "BullMQ", "arq" |
| **changelog-generator**  | Automated changelog from Conventional Commits with semantic versioning and GitHub Releases  | "changelog", "release notes", "version bump", "conventional commits", "release" |
| **audit-trail**          | Structured audit event logging for compliance, forensics, and activity tracking              | "audit trail", "audit log", "activity log", "compliance", "forensics", "who did what" |
| **webhook-handler**      | Idempotent webhook processing with HMAC signature verification and delivery tracking        | "webhook", "callback", "signature", "HMAC", "idempotent", "event delivery" |
| **rate-limiter**         | Token bucket, sliding window, and tiered rate limiting for FastAPI and Next.js               | "rate limit", "throttle", "429", "token bucket", "sliding window", "quota" |
| **api-client**           | Type-safe fetch wrapper with interceptors, retry, and snake/camel case transforms           | "API client", "fetch", "interceptor", "httpx", "request", "response" |
| **search-indexer**       | Full-text search indexing with tsvector, GIN indexes, and hybrid search                     | "search", "index", "tsvector", "full-text", "GIN", "autocomplete" |
| **secret-management**    | Environment variable validation, secret redaction, rotation, and leak prevention            | "secret", "env", "API key", "rotation", "redact", "credential" |
| **resilience-patterns**  | Bulkhead isolation, timeout policies, fallback chains, and hedged requests                   | "bulkhead", "timeout", "fallback", "resilience", "degrade", "hedging" |
| **notification-system**  | Multi-channel notification dispatch with queue-backed delivery and user preferences         | "notification", "notify", "alert", "email", "in-app", "push" |
| **error-boundary**     | React error boundary patterns with fallback UI, error.tsx, and Suspense composition          | "error boundary", "error.tsx", "fallback", "ErrorBoundary", "crash" |
| **data-transform**     | ETL pipelines, typed data mappers, case conversion, and streaming transforms                 | "transform", "ETL", "mapper", "camelCase", "snake_case", "pipeline" |
| **api-versioning**     | URL and header-based versioning with deprecation policies and sunset headers                  | "version", "v1", "v2", "deprecation", "sunset", "API version" |
| **rbac-patterns**      | Role-based access control with permission hierarchies and row-level security                  | "RBAC", "role", "permission", "access control", "authorise", "guard" |
| **status-page**        | Public status page with incident management, uptime tracking, and maintenance windows        | "status page", "incident", "uptime", "outage", "maintenance", "service status" |

### Identified Gaps

| Skill             | Description                                                                  | Status        |
| ----------------- | ---------------------------------------------------------------------------- | ------------- |
| **xaem-theme-ui** | Two-pass theme generation → code UI translation (high-entropy design themes) | Not installed |

**XAEM Gap Analysis**: The existing `scientific-luxury` skill enforces design constraints but does not generate themes. An XAEM-style skill would add a two-pass pipeline: (1) generate high-entropy visual themes (colour palettes, typography, spacing, animation curves), then (2) translate those themes into implementable code (CSS variables, Tailwind config, component styles). This complements `scientific-luxury` by handling the creative generation pass before constraint enforcement.

**Note**: Use `/skill-manager analyse` to run automated gap analysis across all installed skills and detect missing capabilities.

## Skill Priority

When multiple skills could apply, use this priority order:

1. **council-of-logic** - Always validate code quality first
2. **skill-manager** - For skill lifecycle and gap analysis
3. **error-taxonomy** - For structured error handling patterns
4. **error-boundary** - For React error boundaries, fallback UI, and error.tsx
5. **retry-strategy** - For exponential backoff, circuit breaker, and retry policies
6. **resilience-patterns** - For bulkhead isolation, timeout policies, and fallback chains
7. **rate-limiter** - For token bucket, sliding window, and tiered rate limiting
8. **data-validation** - For input sanitisation and schema patterns
9. **input-sanitisation** - For injection prevention and security
10. **rbac-patterns** - For role-based access control and permission hierarchies
11. **secret-management** - For environment variable validation, redaction, and rotation
12. **audit-trail** - For structured audit event logging and compliance
13. **structured-logging** - For observability and log patterns
14. **metrics-collector** - For metrics instrumentation and analytics data
15. **tracing-patterns** - For distributed tracing and span context propagation
16. **docker-patterns** - For multi-stage builds, layer caching, and Docker Compose
17. **ci-cd-patterns** - For GitHub Actions workflows, caching, and security scanning
18. **vector-search** - For pgvector embedding queries and similarity search
19. **search-indexer** - For full-text search indexing with tsvector and GIN indexes
20. **health-check** - For liveness, readiness, and dependency health probes
21. **graceful-shutdown** - For signal handling, connection draining, and clean teardown
22. **cache-strategy** - For caching patterns (lru_cache, Redis, Next.js fetch cache)
23. **api-contract** - For typed frontend/backend API contracts
24. **api-client** - For type-safe fetch wrappers with interceptors and retry
25. **api-versioning** - For URL/header-based versioning with deprecation policies
26. **webhook-handler** - For idempotent webhook processing with signature verification
27. **state-machine** - For finite state machines and status transitions
28. **queue-worker** - For Redis-backed background job processing
29. **notification-system** - For multi-channel notification dispatch with preferences
30. **cron-scheduler** - For scheduled tasks and periodic jobs
31. **csv-processor** - For CSV import, export, and streaming parse
32. **data-transform** - For ETL pipelines, typed mappers, and streaming transforms
33. **email-template** - For transactional email design and delivery
34. **changelog-generator** - For automated changelog and release notes from commits
35. **genesis-orchestrator** - For workflow and phase management
36. **dashboard-patterns** - For real-time dashboard visualisation and layout
37. **status-page** - For public status page with incident management and uptime
38. **scientific-luxury** - For UI/design decisions
39. **react-best-practices** - For React-specific optimisations
40. **web-design-guidelines** - For accessibility and UX audits

## Skill Activation

Skills activate automatically based on context. You can also explicitly invoke them:

```
Apply the council-of-logic skill to this code.
Use scientific-luxury guidelines for this component.
Run genesis-orchestrator for this feature build.
```

## Integration with Claude Code

Skills are loaded on-demand. Only skill names and descriptions load at startup. Full SKILL.md content loads when the agent determines relevance.

### Installation for Claude Code

```bash
# Copy custom skills to Claude Code
cp -r .skills/custom/* ~/.claude/skills/

# Copy Vercel skills
cp -r .skills/vercel-labs-agent-skills/skills/* ~/.claude/skills/
```

## Creating New Skills

Follow the Vercel Skills format. Use `/skill-manager generate {name}` to automate skill creation with built-in validation.

```
.skills/custom/{skill-name}/
  SKILL.md              # Required: skill definition with frontmatter
  scripts/              # Optional: executable scripts
  references/           # Optional: supplementary documentation
```

### SKILL.md Frontmatter

```yaml
---
name: skill-name
description: One sentence describing when to use this skill.
license: MIT
metadata:
  author: NodeJS-Starter-V1
  version: '1.0.0'
  locale: en-AU
---
```

## Skill Compatibility

These skills are compatible with:

- Claude Code (claude-code)
- Cursor
- GitHub Copilot
- Windsurf
- Other AI coding agents that support the Skills format

## Australian Localisation

All custom skills enforce en-AU conventions:

- **Date**: DD/MM/YYYY
- **Time**: H:MM am/pm (AEST/AEDT)
- **Currency**: AUD ($)
- **Spelling**: colour, behaviour, optimisation, analyse, centre
