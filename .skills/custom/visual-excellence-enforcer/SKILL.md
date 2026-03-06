---
name: visual-excellence-enforcer
description: Blocks customer-facing interfaces from shipping in factory-default LLM UI mode. Enforces visual quality as a production requirement. Triggers on any UI review, design review, pre-launch check, or when "visual" / "design" / "looks" / "UI" quality is mentioned.
license: MIT
metadata:
  author: CARSI
  version: '1.0.0'
  locale: en-AU
---

# Visual Excellence Enforcer

Visual quality is a production requirement, not a style preference.

## Description

Factory-default LLM UI is identifiable: generic Inter/sans-serif typography, rounded-lg everywhere, default blue primary buttons, Lucide icons for all status, Bootstrap-style card grids, and linear CSS transitions. This skill audits customer-facing UI against the Visual Excellence standard and blocks shipping until violations are resolved.

## Skill Type

**Encoded Preference Workflow** — Enforces the Scientific Luxury design system as a non-negotiable production gate.

## Trigger Phrases

- "review the UI"
- "is the design production ready?"
- "visual audit", "design review"
- "does it look good?", "how does it look?"
- Before any customer-facing page ships
- "check visual quality"
- Pre-launch checklist

## Visual Excellence Standard (CARSI)

### Required

- Background: OLED Black `#050505`
- Borders: `border-[0.5px] border-white/[0.06]` (single pixel, low opacity)
- Corners: `rounded-sm` only (no `rounded-lg`, `rounded-xl`, `rounded-full`)
- Typography: JetBrains Mono for data/code, Editorial New for hero names
- Animations: Framer Motion only, physics-based easings
- Colours: Spectral palette (Cyan `#00F5FF`, Emerald `#00FF88`, Amber `#FFB800`, Red `#FF4444`)
- Layout: Timeline/orbital — NOT Bootstrap grid

### Banned Elements (Factory-Default Signals)

| Banned Element                    | Why                        | Compliant Alternative                    |
| --------------------------------- | -------------------------- | ---------------------------------------- |
| `rounded-lg`, `rounded-xl`        | Generic SaaS look          | `rounded-sm`                             |
| Linear CSS transitions            | Physics-dead               | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` |
| Lucide icons as status indicators | Generic icon library abuse | Spectral colour dots                     |
| `bg-blue-500` primary buttons     | Bootstrap blue             | Cyan `#00F5FF` with spectral glow        |
| Default sans-serif body           | No typographic intent      | JetBrains Mono for data                  |
| Placeholder "Lorem ipsum"         | Not production             | Real content required                    |
| Empty state with no illustration  | Abandoned UI               | Custom empty state component             |
| Generic gradient hero             | No brand identity          | OLED Black + spectral particle system    |

## Procedure

### Step 1 — Capture Screenshots

Screenshot each customer-facing page at:

- 375px (mobile)
- 1440px (desktop)
- Dark mode (if toggle exists)

### Step 2 — Audit for Banned Elements

For each screenshot, check:

- [ ] No `rounded-lg` visible on cards or containers
- [ ] No blue primary buttons (Bootstrap blue)
- [ ] No Lorem ipsum or placeholder text
- [ ] No generic card grid layout (3 equal boxes in a row)
- [ ] Background is dark (OLED Black `#050505`)
- [ ] At least one Framer Motion animation present
- [ ] Spectral colours used for status/active states

### Step 3 — Check Asset Completeness

- [ ] Logo renders (not broken image / alt text fallback)
- [ ] Favicon visible in browser tab
- [ ] OG image set (check `<meta property="og:image">`)
- [ ] Hero section has visual — not empty dark background
- [ ] Course/product images load (not broken)

### Step 4 — Typography Check

- [ ] `font-mono` applied to all data/metric values
- [ ] Headings use configured custom font (not system sans-serif)
- [ ] Line-height is comfortable (not CSS default 1.2 for body)

### Step 5 — Animation Check

- [ ] At least one entrance animation on key CTA
- [ ] No `transition-all duration-300 ease-in-out` (linear easing banned)
- [ ] Scroll-triggered animations where appropriate

### Step 6 — Generate Report

```markdown
## Visual Excellence Audit

Page: [URL]
Date: [DD/MM/YYYY HH:MM AEST]
Screenshots: [paths]

### Violations Found

| Element      | Issue              | File            | Fix                  |
| ------------ | ------------------ | --------------- | -------------------- |
| Hero section | rounded-lg on card | HeroCard.tsx:42 | Change to rounded-sm |

### Compliant Elements

- [list]

### Verdict: PASS | FAIL | CONDITIONAL PASS

Condition (if applicable): [what must be fixed before ship]
```

## Validation Gates

- [ ] All customer-facing routes audited (not just homepage)
- [ ] Screenshots captured with URL visible
- [ ] Every violation has a file + line reference
- [ ] Report includes specific fix for each violation

## Failure Modes

| Situation                            | Action                                            |
| ------------------------------------ | ------------------------------------------------- |
| Developer says "style is subjective" | Cite specific banned element from this list       |
| Design system token not available    | Create it in design-tokens.ts before proceeding   |
| No screenshots possible              | Escalate — cannot audit without visual evidence   |
| Only some pages pass                 | Conditional PASS: list required fixes before ship |
