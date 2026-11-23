# Brand typography

Canonical loading: `src/lib/brand/fonts.ts` → `app/layout.tsx` CSS variables.

| Role | Font | Variable |
|------|------|----------|
| Editorial / display | Fraunces | `--font-display` |
| UI / body | Manrope | `--font-sans` |
| Data / mono | JetBrains Mono | `--font-mono` |

**Surfaces:** Marketing pages favour display type for headlines (`font-[family-name:var(--font-display)]`). Learning app favours readability and hierarchy with the same tokens.

**Do not** re-introduce Inter, Roboto, Arial, Outfit, or Plus Jakarta as defaults on customer surfaces.