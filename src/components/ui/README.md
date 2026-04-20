# UI Components — shadcn/ui Drift Register

This directory contains shadcn/ui components manually installed and adapted for the
CARSI glassmorphic design system. The shadcn CLI cannot be used directly (no
`components.json` was present at install time; see root `components.json` added in
GP-335 to lock config for future use).

## Intentional divergences from canonical shadcn

### `button.tsx`
- **Added** `Spinner` SVG component for inline loading state.
- **Added** props: `loading`, `loadingText`, `leftIcon`, `rightIcon`.
- **Added** `ButtonGroup` component for adjacent button layouts.
- **Added** variants: `gradient`, `glow`, `glow-accent`, `success`, `warning`, `info`.
- **Added** sizes: `xl`, `icon-sm`, `icon-lg`.
- Active press scale (`active:scale-[0.98]`) on all interactive variants.
- Rationale: CARSI requires loading state, icon slots, and brand glow variants.

### `card.tsx`
- **Added** variants: `elevated`, `interactive`, `featured`, `gradient`, `glass`, `outline`, `ghost`.
- **Added** sub-components: `CardImage` (Next.js `<Image>` wrapper) and `CardBadge` (positioned status chip).
- **Added** `as` prop on `CardTitle` for semantic heading level.
- Rationale: LMS course cards need image containers and status badges baked in.

### `badge.tsx`
- `rounded-full` → `rounded-md` (CARSI design system uses pill-free badge shape).
- Canonical shadcn uses `rounded-full`; this is an intentional brand deviation.

### `AcronymTooltip.tsx`
- **Custom component** — not in shadcn. Provides inline acronym expansion via Radix
  Tooltip for IICRC terminology (WRT, CEC, AMRT, etc.).

### `loading.tsx`
- **Custom component** — not in shadcn. Full-page and inline loading states using
  the CARSI spinner and glass surface.

### `motion.tsx`
- **Custom component** — not in shadcn. Framer Motion wrappers (`MotionDiv`,
  `MotionSection`, etc.) re-exported with CARSI default easing tokens applied.

### `password-input.tsx`
- Extended from canonical shadcn `Input` with a show/hide password toggle button.
- Preserves all canonical Input props.

### `skeleton.tsx`
- **Aligned with canonical shadcn** — `animate-pulse` shimmer using `--primary/10`.
- No intentional drift.

## Components aligned with canonical shadcn
`alert.tsx`, `avatar.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `form.tsx`,
`input.tsx`, `label.tsx`, `progress.tsx`, `select.tsx`, `separator.tsx`,
`sheet.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`,
`toast.tsx`, `tooltip.tsx`

These components receive canonical shadcn updates without modification. When
running `npx shadcn add <component>` via the CLI, use `--overwrite` only for
files listed in the intentional divergences section above, and manually re-apply
the CARSI extensions documented here.
