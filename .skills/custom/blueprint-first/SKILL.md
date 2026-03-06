---
name: blueprint-first
description: Enforces ASCII blueprint generation before implementing any UI layout, dashboard, landing page, system architecture, or database schema. Triggers on "build", "create", "design", "add page", "new layout", "add section" when applied to visual or structural work.
license: MIT
metadata:
  author: CARSI
  version: '1.0.0'
  locale: en-AU
---

# Blueprint First

Forces structure approval before implementation begins.

## Description

Incorrect architecture wastes iteration cycles. This skill gates all visual and structural implementation behind an approved ASCII blueprint. No code is written until the blueprint is frozen.

**Applies to:** UI layouts, dashboards, landing pages, marketing sections, system architecture diagrams, database schema design.

**Does not apply to:** Bug fixes, isolated component changes, text copy updates, styling tweaks.

## Trigger Phrases

- "build a [page/dashboard/layout/section]"
- "create a [UI/page/design]"
- "add a [page/section/feature]"
- "design the [layout/flow/architecture]"
- "new landing page", "new dashboard"
- "add [hero/pricing/testimonials/nav/footer] section"
- "design the database schema"
- "system architecture for [feature]"

## Procedure

### Step 1 — Generate Blueprint

Produce an ASCII diagram of the proposed structure.

UI Layout format:

```
┌─────────────────────────────────────────────────────┐
│  NAV: Logo | Links | CTA Button                     │
├─────────────────────────────────────────────────────┤
│  HERO                                               │
│  ┌─────────────────────┐  ┌────────────────────┐   │
│  │  Headline + CTA     │  │  Hero Image/Visual │   │
│  └─────────────────────┘  └────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  FEATURES (3-col grid)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Feature1 │ │ Feature2 │ │ Feature3 │           │
│  └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────┘
```

System architecture format:

```
[Client] → [CDN] → [Next.js] → [FastAPI]
                                    ↓
                               [PostgreSQL]
                                    ↓
                               [Redis Cache]
```

Database schema format:

```
users
  id UUID PK
  email VARCHAR UNIQUE
  ↓ (1:many)
enrollments
  id UUID PK
  user_id FK → users.id
  course_id FK → courses.id
```

### Step 2 — Present for Approval

Ask: "Does this structure match your intent? Should any sections be added, removed, or reordered?"

Wait for explicit approval before proceeding.

**Approved signals:** "yes", "looks good", "go ahead", "correct", "build it"
**Not approved:** No response, "maybe", vague acknowledgement

### Step 3 — Freeze Structure

Once approved, state:

```
STRUCTURE FROZEN
Approved: [DD/MM/YYYY HH:MM AEST]
Changes after this point require new blueprint + approval.
```

No structural changes after freezing. Only implementation.

### Step 4 — Generate Implementation Specification

Translate the frozen blueprint into:

- Component tree (for UI)
- File paths to create/modify
- Data requirements (props, API calls)
- Design system tokens to apply (from CONSTITUTION.md)

### Step 5 — Build from Specification

Execute implementation strictly according to the frozen specification.

If a structural decision needs to change → return to Step 1 (new blueprint).

## Validation Gates

- [ ] Blueprint generated before any code written
- [ ] Explicit approval received
- [ ] Specification generated from frozen blueprint
- [ ] Implementation follows specification (no ad-hoc additions)

## Output Format

```markdown
## Blueprint: [Feature Name]

### Proposed Structure

[ASCII diagram]

### Component Breakdown

- `ComponentName` — [purpose]
- ...

### Implementation Specification

**Files to create:**

- `apps/web/components/[name].tsx`

**Files to modify:**

- `apps/web/app/(public)/[route]/page.tsx`

**Design tokens:**

- Background: `#050505` (OLED Black)
- Borders: `border-[0.5px] border-white/[0.06]`

---

⏳ Awaiting approval before implementation begins.
```

## Failure Modes

| Situation                                         | Action                                             |
| ------------------------------------------------- | -------------------------------------------------- |
| Founder doesn't respond to blueprint              | Wait — do not proceed. Follow up once.             |
| Blueprint approved but specification is ambiguous | Clarify specification before writing code          |
| Implementation reveals structural flaw            | Halt, generate revised blueprint, seek re-approval |
| Founder wants to change approved structure        | Generate new blueprint (Step 1), do not patch      |
