# Architectural Decisions Log

> Append-only. Format: [DD/MM/YYYY] DECISION: X | REASON: Y | ALTERNATIVES REJECTED: Z

## Decisions

<!-- Agents append entries below. Never delete existing entries. -->

[03/03/2026] DECISION: Implement 4-pillar context drift prevention system | REASON: Claude Code compaction silently destroys CLAUDE.md rules; documented in Anthropic issues #9796, #13919, #14258 | ALTERNATIVES REJECTED: Relying on compaction summary (lossy), manual re-injection (error-prone)

[05/03/2026] DECISION: Extract shared industry page components to components/industries/ | REASON: Council of Logic (Von Neumann) identified ~1,800 lines of duplicate code across 8 industry pages; Shannon principle violated | ALTERNATIVES REJECTED: Keep inline components (maintainability cost), single mega-component (inflexible)
