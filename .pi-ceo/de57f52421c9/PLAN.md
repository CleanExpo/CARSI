# Implementation Plan

**Session:** de57f52421c9  
**Confidence:** 42%

**Risk notes:** Brief says 'DOCS — Feature Build' but does not specify which documentation feature (e.g., API reference, user-facing guides, in-app help, MDX-based site). Plan assumes a Next.js-hosted documentation section with dynamic routing, MDX rendering, sidebar navigation, and search — based on the presence of a docs/ directory and Next.js app structure. Actual CARSI DESIGN.md may constrain or redirect scope significantly. No test framework was auto-detected; plan defaults to the e2e/ directory convention already present in the repo. Confidence is low primarily due to brief ambiguity and inability to read the actual DESIGN.md or existing docs/ contents at plan time.

## Unit 1: Audit existing docs structure and define documentation schema/types
**Files:** `docs/README.md`, `app/docs/layout.tsx`, `packages/types/docs.ts`

## Unit 2: Implement documentation content rendering components (MDX/markdown support)
**Files:** `app/components/docs/DocLayout.tsx`, `app/components/docs/DocContent.tsx`, `app/components/docs/DocSidebar.tsx`
**Test scenarios:**
  - happy path: DocContent renders markdown/MDX with correct headings and code blocks
  - edge case: DocContent handles missing or malformed content gracefully
  - happy path: DocSidebar renders navigation tree from docs manifest

## Unit 3: Add Next.js dynamic routing for docs pages with static generation
**Files:** `app/docs/[...slug]/page.tsx`, `app/docs/page.tsx`, `scripts/generate-docs-manifest.ts`
**Test scenarios:**
  - happy path: /docs root renders landing page with section links
  - happy path: /docs/[slug] resolves and renders correct doc file
  - edge case: 404 returned for unknown doc slug

## Unit 4: Wire documentation search and breadcrumb navigation
**Files:** `app/components/docs/DocSearch.tsx`, `app/components/docs/DocBreadcrumb.tsx`, `app/api/docs/search/route.ts`
**Test scenarios:**
  - happy path: search API returns ranked results for a known keyword
  - edge case: empty query returns empty results without error
  - happy path: breadcrumb reflects current slug path correctly

## Unit 5: Add e2e tests for documentation feature flows
**Files:** `e2e/docs.spec.ts`
**Test scenarios:**
  - happy path: user navigates to /docs and sees the docs landing page
  - happy path: user clicks a sidebar link and content area updates
  - edge case: navigating to an invalid doc URL shows 404 page

## Unit 6: Update DESIGN.md and README.md to reflect new docs feature
**Files:** `DESIGN.md`, `README.md`
