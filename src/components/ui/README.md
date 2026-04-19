# UI Components

Manually maintained shadcn/ui components. The shadcn CLI is **not wired** (no
`components.json` in root prior to GP-335). All edits are made directly to source
files. This document records intentional divergences from the canonical shadcn
baseline so future CLI upgrades do not blindly overwrite them.

---

## Divergence inventory

### `button.tsx` — intentional additions

| Addition | Reason |
|---|---|
| Variants: `gradient`, `glow`, `glow-accent`, `success`, `warning`, `info` | CARSI brand palette (glow = glassmorphic CTA, semantic states for admin UI) |
| Sizes: `xl`, `icon-sm`, `icon-lg` | Landing-page hero CTAs and compact icon toolbars |
| Props: `loading`, `loadingText` | Inline async feedback (form submissions, API calls) |
| Props: `leftIcon`, `rightIcon` | Structured icon slots to avoid ad-hoc wrapper `<span>` usage |
| Export: `ButtonGroup` | Toolbar / segmented control; avoids importing from a separate file |
| Export: `Spinner` (inline) | Embedded spinner that stays co-located with the button's loading state |

The inline `Spinner` in `button.tsx` is intentionally simpler than the `Spinner`
in `loading.tsx` — button only needs the SVG, not size/variant CVA overhead.

---

### `card.tsx` — intentional additions

| Addition | Reason |
|---|---|
| Variants: `gradient`, `glass`, `outline`, `ghost`, `featured` | Design-system surface hierarchy (glass = backdrop-blur cards, featured = brand highlight) |
| Sub-component: `CardImage` | Replaces ad-hoc `<div><Image/></div>` wrappers across course and marketing pages; bakes in `aspect-ratio` choices |
| Sub-component: `CardBadge` | Absolute-positioned status/feature badge; consistent placement across card surfaces |
| `CardTitle` polymorphic `as` prop | Allows `h2`/`h3`/`h4` for correct heading hierarchy without forking the component |
| Export: `cardVariants` | Enables variant-aware composition in adjacent components |

---

### `loading.tsx` — fully custom (not a shadcn component)

No canonical shadcn equivalent. Provides:
- `Spinner` (CVA with `size` + `variant` axes, `role="status"` ARIA)
- `DotsLoader` (three-dot bounce animation)
- `Skeleton` (CVA with `default`, `card`, `circle`, `text` variants)
- `SkeletonText` (multi-line skeleton with configurable last-line width)
- `SkeletonCard` (composite card-shaped skeleton)
- `LoadingOverlay` (relative-positioned overlay for in-place loading states)
- `FullPageLoader` (fixed-position full-screen loader with brand gradient)

---

### `skeleton.tsx` — minimal alias

Thin wrapper around `animate-pulse` kept for API compatibility with shadcn's
canonical `Skeleton` export. The richer variant lives in `loading.tsx`. If the
canonical shadcn `skeleton.tsx` is regenerated, keep the `bg-primary/10` token
(the project has no `--muted` class on skeleton elements by design — dark glass
backgrounds need less opacity).

---

### `motion.tsx` — fully custom (not a shadcn component)

CSS-animation-based motion primitives that wrap CARSI's `--duration-*` /
`--ease-*` design tokens. Intentionally avoids a Framer Motion dependency at the
component-library level (Framer Motion is used selectively in feature components).
Exports: `FadeIn`, `SlideUp`, `SlideDown`, `ScaleIn`, `BounceIn`, `Stagger`,
`Motion`, `HoverScale`, `HoverLift`, `Pulse`, `Float`.

---

### `AcronymTooltip.tsx` — fully custom (not a shadcn component)

Domain-specific inline tooltip for IICRC acronyms (WRT, CRT, ASD, etc.) used
throughout course descriptions and SEO content. Not a shadcn component; lives here
for co-location with the UI primitives it wraps.

---

### Components that match canonical shadcn (no intentional divergence)

The following files are standard shadcn output and should be updated via CLI
when upgrading:

`alert.tsx`, `avatar.tsx`, `badge.tsx`, `dialog.tsx`, `dropdown-menu.tsx`,
`form.tsx`, `input.tsx`, `label.tsx`, `password-input.tsx`, `progress.tsx`,
`select.tsx`, `separator.tsx`, `sheet.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`,
`textarea.tsx`, `toast.tsx`, `tooltip.tsx`

> **Note:** `--radius-2xl` is referenced in `tailwind.config.ts` but not defined
> in `globals.css` `:root`. This is a pre-existing gap; `border-radius-2xl` will
> resolve to `var(--radius-2xl)` which is `undefined` (falls back to browser
> default). Add `--radius-2xl: 1.5rem` to `:root` when the design calls for it.

---

## CLI usage (future)

A `components.json` is now present at the repo root. The CLI can be used for
**new** component additions. For components listed above with intentional
divergences, always review the diff before accepting CLI changes — the CLI will
overwrite custom variants and sub-components.

```bash
# Add a new component (review diff before committing)
npx shadcn@latest add <component-name>
```
