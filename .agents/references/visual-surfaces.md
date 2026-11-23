# Visual surfaces (three products in one repo)

Share brand identity; **do not** force identical layouts across surfaces.

## A. Public marketing website

**Goal:** Sell the value of CARSI education — professional, editorial, authoritative.

**Authority:** `docs/agents/AGENTS.md` (Premium Visual & Motion Standard).

- Typography: Fraunces (display), Manrope (body), JetBrains Mono (data) via `next/font`
- Real photography/video only; `media.manifest.json`; budgets in AGENTS.md
- Marketing package (when installed): `@cleanexpo/premium-visuals`, Embla carousels, view transitions
- Motion: purposeful; always respect `prefers-reduced-motion`
- No code-drawn decorative art, gradient slop, or generic “AI SaaS” layouts

## B. Student learning application

**Goal:** Help restoration professionals learn, practise, and complete training.

- Clean hierarchy, readable lessons, visible progress, strong mobile lesson UX
- Interaction over decoration: scenarios, knowledge checks, feedback, milestones
- Reuse `src/components/ui` and dashboard patterns; token-driven spacing and colour
- Animations: progress, feedback, navigation — not ambient distraction

## C. Admin, coaching, internal tools

**Goal:** Efficient, accessible operations — correctness over marketing polish.

- Light shell patterns (e.g. dashboard theme helpers)
- Dense tables, forms, filters — Radix + shadcn components
- Same tokens; may prioritise data density over editorial layout