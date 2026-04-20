# CARSI Unified Design System

> **Foundation layer — documentation only.**  
> Tailwind token wiring and component implementation will follow in a separate PR.

---

## 1 · Visual Theme & Atmosphere

CARSI is the authoritative digital home for IICRC-pathway water-damage restoration education. Its visual language must project the same rigour and trustworthiness that a licensed restorer brings to a loss site: measured, precise, and calm even when the situation is complex. The palette draws on deep oceanic blues — the colour of moisture-meters, psychrometric charts, and the sky after a storm clears — anchored by a single warm amber accent that signals action and progress without alarm. Surfaces are dark by design: the "Abyssal Vision" glassmorphic approach reduces eye-fatigue during long study sessions while creating a premium, technical atmosphere that elevates restoration craft to the same visual register as aerospace or fintech. Glassmorphic depth layers content in a natural hierarchy — background mesh, glass surface, foreground content — so students always know where they are. Every typographic decision privileges legibility over decoration; Inter's tabular numerals make psychrometric-data tables scannable, and JetBrains Mono makes technical code references unambiguous. In spirit, CARSI sits at the intersection of **Stripe Docs** (technical precision, generous white-space) and **Coursera** (warm student-focus, clear progression cues).

**Five-word character statement:** *Calm. Precise. Authoritative. Trustworthy. Technical.*

---

## 2 · Color Palette & Roles

### Semantic Token Map

| Token | Role | Hex | rgba |
|---|---|---|---|
| `primary` | Brand blue — links, CTAs, focus rings | `#2490ed` | `rgba(36, 144, 237, 1)` |
| `primary-foreground` | Text/icon on primary fills | `#060a14` | `rgba(6, 10, 20, 1)` |
| `secondary` | Muted-blue surface — secondary buttons, tags | `#1e2c47` | `rgba(30, 44, 71, 1)` |
| `secondary-foreground` | Text on secondary surfaces | `#d9edfc` | `rgba(217, 237, 252, 1)` |
| `accent` | Warm amber — single warm note, progress, alerts | `#ed9d24` | `rgba(237, 157, 36, 1)` |
| `accent-foreground` | Text/icon on accent fills | `#060a14` | `rgba(6, 10, 20, 1)` |
| `success` | Completion, correct answers | `#27ae60` | `rgba(39, 174, 96, 1)` |
| `success-foreground` | Text on success fills | `#060a14` | `rgba(6, 10, 20, 1)` |
| `warning` | Advisory, time-sensitive | `#f59e0b` | `rgba(245, 158, 11, 1)` |
| `warning-foreground` | Text on warning fills | `#060a14` | `rgba(6, 10, 20, 1)` |
| `error` | Failure states, destructive actions | `#dc2626` | `rgba(220, 38, 38, 1)` |
| `error-foreground` | Text on error fills | `#ffffff` | `rgba(255, 255, 255, 1)` |
| `background` | Page canvas | `#060a14` | `rgba(6, 10, 20, 1)` |
| `foreground` | Default body text | `rgba(255,255,255,0.92)` | `rgba(255, 255, 255, 0.92)` |
| `muted` | Quiet text, captions | `rgba(255,255,255,0.35)` | `rgba(255, 255, 255, 0.35)` |
| `border` | Subtle dividers | `rgba(255,255,255,0.09)` | `rgba(255, 255, 255, 0.09)` |

### Primary Scale (CARSI Blue)

| Step | Hex | rgba |
|---|---|---|
| `primary-50` | `#eff7fe` | `rgba(239, 247, 254, 1)` |
| `primary-100` | `#d9edfc` | `rgba(217, 237, 252, 1)` |
| `primary-200` | `#b2d9f9` | `rgba(178, 217, 249, 1)` |
| `primary-300` | `#76bcf5` | `rgba(118, 188, 245, 1)` |
| `primary-400` | `#4aa9f1` | `rgba(74, 169, 241, 1)` |
| `primary-500` | `#2490ed` | `rgba(36, 144, 237, 1)` — **base** |
| `primary-600` | `#1375cc` | `rgba(19, 117, 204, 1)` |
| `primary-700` | `#0f5fa6` | `rgba(15, 95, 166, 1)` |
| `primary-800` | `#0a4880` | `rgba(10, 72, 128, 1)` |
| `primary-900` | `#073260` | `rgba(7, 50, 96, 1)` |
| `primary-950` | `#031a38` | `rgba(3, 26, 56, 1)` |

### Accent Scale (CARSI Orange)

| Step | Hex | rgba |
|---|---|---|
| `accent-50` | `#fef9ef` | `rgba(254, 249, 239, 1)` |
| `accent-100` | `#fcefd3` | `rgba(252, 239, 211, 1)` |
| `accent-200` | `#f8d99d` | `rgba(248, 217, 157, 1)` |
| `accent-300` | `#f4bf5e` | `rgba(244, 191, 94, 1)` |
| `accent-400` | `#f1ac3f` | `rgba(241, 172, 63, 1)` |
| `accent-500` | `#ed9d24` | `rgba(237, 157, 36, 1)` — **base** |
| `accent-600` | `#c4811b` | `rgba(196, 129, 27, 1)` |
| `accent-700` | `#9e6715` | `rgba(158, 103, 21, 1)` |
| `accent-800` | `#784d10` | `rgba(120, 77, 16, 1)` |
| `accent-900` | `#52340b` | `rgba(82, 52, 11, 1)` |
| `accent-950` | `#2e1c06` | `rgba(46, 28, 6, 1)` |

### Neutral Scale (Slate)

| Step | Hex | rgba |
|---|---|---|
| `neutral-50` | `#f8fafc` | `rgba(248, 250, 252, 1)` |
| `neutral-100` | `#f1f5f9` | `rgba(241, 245, 249, 1)` |
| `neutral-200` | `#e2e8f0` | `rgba(226, 232, 240, 1)` |
| `neutral-300` | `#cbd5e1` | `rgba(203, 213, 225, 1)` |
| `neutral-400` | `#94a3b8` | `rgba(148, 163, 184, 1)` |
| `neutral-500` | `#64748b` | `rgba(100, 116, 139, 1)` |
| `neutral-600` | `#475569` | `rgba(71, 85, 105, 1)` |
| `neutral-700` | `#334155` | `rgba(51, 65, 85, 1)` |
| `neutral-800` | `#1e293b` | `rgba(30, 41, 59, 1)` |
| `neutral-900` | `#0f172a` | `rgba(15, 23, 42, 1)` |
| `neutral-950` | `#060a14` | `rgba(6, 10, 20, 1)` — **page canvas** |

### Discipline Colour Coding

IICRC disciplines carry their own hue identity for quick visual identification in course catalogues and progress dashboards.

| Discipline | Code | Hex | Usage |
|---|---|---|---|
| Water Damage Restoration | WRT | `#2490ed` | Primary brand blue |
| Carpet Cleaning | CRT | `#26c4a0` | Teal |
| Applied Structural Drying | ASD | `#6c63ff` | Violet |
| Odour Control | OCT | `#9b59b6` | Purple |
| Commercial Carpet Cleaning | CCT | `#17b8d4` | Cyan |
| Fire & Smoke Restoration | FSRT | `#f05a35` | Coral |
| Applied Microbial Remediation | AMRT | `#27ae60` | Green |

---

## 3 · Typography

### Font Stack

```css
--font-sans:    "Inter", ui-sans-serif, system-ui, sans-serif;
--font-display: "Inter", ui-sans-serif, system-ui, sans-serif;   /* same family, heavier weight */
--font-mono:    "JetBrains Mono", ui-monospace, "Cascadia Code", monospace;
```

Load via `next/font/google`:

```ts
import { Inter, JetBrains_Mono } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono  = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
```

### Type Hierarchy

| Role | Size | Weight | Line-height | Tracking | CSS class |
|---|---|---|---|---|---|
| Display | 48 px / 3 rem | 800 (Extra Bold) | 1.1 | −0.03 em | `text-5xl font-extrabold leading-none tracking-tighter` |
| H1 | 36 px / 2.25 rem | 700 (Bold) | 1.15 | −0.02 em | `text-4xl font-bold leading-tight tracking-tight` |
| H2 | 28 px / 1.75 rem | 700 (Bold) | 1.2 | −0.015 em | `text-3xl font-bold leading-snug tracking-tight` |
| H3 | 22 px / 1.375 rem | 600 (Semibold) | 1.3 | −0.01 em | `text-2xl font-semibold leading-snug` |
| H4 | 18 px / 1.125 rem | 600 (Semibold) | 1.4 | 0 em | `text-lg font-semibold leading-relaxed` |
| Body | 16 px / 1 rem | 400 (Regular) | 1.7 | 0 em | `text-base font-normal leading-relaxed` |
| Body Strong | 16 px / 1 rem | 500 (Medium) | 1.7 | 0 em | `text-base font-medium leading-relaxed` |
| Small | 14 px / 0.875 rem | 400 (Regular) | 1.6 | 0 em | `text-sm font-normal leading-relaxed` |
| Caption | 12 px / 0.75 rem | 500 (Medium) | 1.5 | 0.01 em | `text-xs font-medium leading-normal tracking-wide` |
| Mono | 13 px / 0.8125 rem | 400 (Regular) | 1.6 | 0 em | `font-mono text-[13px] leading-relaxed` |

### Typographic Rules

- **Headings** always use `text-gradient` (`linear-gradient(135deg, #2490ed → #38b8ff)`) for H1/Display; neutral `rgba(255,255,255,0.92)` for H2 and below.
- **Body copy** maximum width: `max-w-prose` (65 ch) inside long-form lesson content.
- **Tabular numbers**: Apply `font-feature-settings: "tnum" 1` to all numeric data columns (psychrometric tables, progress percentages, durations).
- **Mono blocks**: Always rendered on `rgba(255,255,255,0.04)` background with a `1px solid rgba(255,255,255,0.09)` border, padding `p-4`, `rounded-lg`.
- **Locale**: All instructional text is Australian English (IICRC ANZ standards). Spell-check configs should use `en-AU`.

---

## 4 · Component Stylings

All class strings assume Tailwind CSS 4 with the `glass`, `glass-card`, `glow`, and `text-gradient` utilities defined in `globals.css`.

### Button

#### Base (shared across all variants and sizes)

```
inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap
rounded-lg transition-all duration-150 ease-smooth
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ed] focus-visible:ring-offset-2 focus-visible:ring-offset-[#060a14]
disabled:pointer-events-none disabled:opacity-40
active:scale-[0.97]
```

#### Variants

| Variant | Classes (append to base) |
|---|---|
| **Primary** | `bg-[#2490ed] text-[#060a14] hover:bg-[#1a7fd4] shadow-md hover:shadow-glow` |
| **Secondary** | `border border-[rgba(36,144,237,0.35)] text-[#2490ed] hover:bg-[rgba(36,144,237,0.08)] hover:border-[rgba(36,144,237,0.6)]` |
| **Ghost** | `text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.92)]` |
| **Destructive** | `bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-md` |

#### Sizes

| Size | Classes |
|---|---|
| **sm** | `h-8 px-3 text-xs rounded-md` |
| **md** | `h-10 px-4 text-sm` |
| **lg** | `h-12 px-6 text-base` |

#### Examples

```html
<!-- Primary, md -->
<button class="inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap rounded-lg transition-all duration-150 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ed] focus-visible:ring-offset-2 focus-visible:ring-offset-[#060a14] disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97] bg-[#2490ed] text-[#060a14] hover:bg-[#1a7fd4] shadow-md hover:shadow-glow h-10 px-4 text-sm">
  Enrol Now
</button>

<!-- Ghost, sm -->
<button class="inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap rounded-lg transition-all duration-150 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ed] focus-visible:ring-offset-2 focus-visible:ring-offset-[#060a14] disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.92)] h-8 px-3 text-xs rounded-md">
  Cancel
</button>
```

---

### Card

#### Elevated (glass-card)

```
glass-card rounded-2xl p-6
```

Full rule from utilities:
```css
background: rgba(255,255,255,0.05);
backdrop-filter: blur(12px) saturate(160%);
border: 1px solid rgba(255,255,255,0.09);
box-shadow: 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
transition: background 280ms, border-color 280ms, box-shadow 280ms, transform 280ms;
```

Hover state:
```css
background: rgba(255,255,255,0.08);
border-color: rgba(36,144,237,0.35);
box-shadow: 0 8px 40px rgba(36,144,237,0.15), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12);
transform: translateY(-3px);
```

#### Flat (no glass blur)

```
bg-[rgba(12,18,36,0.8)] border border-[rgba(255,255,255,0.09)] rounded-xl p-6
```

---

### Input

```
h-10 w-full rounded-lg border border-[rgba(255,255,255,0.09)]
bg-[rgba(255,255,255,0.05)] px-3 py-2
text-sm text-[rgba(255,255,255,0.92)]
placeholder:text-[rgba(255,255,255,0.35)]
focus:outline-none focus:ring-2 focus:ring-[#2490ed]
focus:border-[rgba(36,144,237,0.6)]
transition-colors duration-150
```

Textarea: same classes + `min-h-[120px] resize-y py-2`.

---

### Badge

#### Base (shared)

```
inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border
```

#### Semantic variants

| Variant | Classes (append to base) |
|---|---|
| **Default / Info** | `bg-[rgba(36,144,237,0.15)] text-[#4aa9f1] border-[rgba(36,144,237,0.25)]` |
| **Success** | `bg-[rgba(39,174,96,0.15)] text-[#27ae60] border-[rgba(39,174,96,0.25)]` |
| **Warning** | `bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border-[rgba(245,158,11,0.25)]` |
| **Error** | `bg-[rgba(220,38,38,0.15)] text-[#f87171] border-[rgba(220,38,38,0.25)]` |
| **Accent** | `bg-[rgba(237,157,36,0.15)] text-[#ed9d24] border-[rgba(237,157,36,0.25)]` |

---

### Nav

```html
<nav class="fixed top-0 inset-x-0 z-50 glass border-b border-[rgba(255,255,255,0.09)] h-16">
  <div class="max-w-7xl mx-auto px-4 md:px-8 h-full flex items-center justify-between gap-6">
    <!-- Logo -->
    <a class="flex items-center gap-2 text-base font-semibold text-[rgba(255,255,255,0.92)] shrink-0">
      Logo
    </a>
    <!-- Links — hidden on mobile -->
    <ul class="hidden md:flex items-center gap-1">
      <li>
        <a class="px-3 py-1.5 text-sm text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.92)] hover:bg-[rgba(255,255,255,0.05)] rounded-md transition-colors">
          Courses
        </a>
      </li>
    </ul>
    <!-- CTA + avatar -->
    <div class="flex items-center gap-3 shrink-0">
      <!-- primary button sm -->
    </div>
  </div>
</nav>
```

Active link state: replace hover classes with `text-[#2490ed] bg-[rgba(36,144,237,0.08)]`.

---

### Hero

```html
<section class="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
  <!-- Ambient blobs (mesh-blob-1, mesh-blob-2) positioned absolute behind -->
  <div class="relative z-10 max-w-7xl mx-auto px-4 md:px-8">
    <div class="max-w-3xl">
      <!-- Eyebrow -->
      <p class="text-xs font-semibold tracking-widest uppercase text-[#2490ed] mb-4">
        IICRC Certified Training
      </p>
      <!-- Headline -->
      <h1 class="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-gradient mb-6">
        Master Water Damage Restoration
      </h1>
      <!-- Sub-copy -->
      <p class="text-lg md:text-xl text-[rgba(255,255,255,0.6)] leading-relaxed max-w-2xl mb-10">
        Industry-standard courses built on IICRC S500 methodology — complete at your pace, earn your credential.
      </p>
      <!-- CTA group -->
      <div class="flex flex-col sm:flex-row gap-4">
        <!-- Primary button lg -->
        <!-- Secondary button lg -->
      </div>
    </div>
  </div>
</section>
```

---

### CourseCard

```html
<article class="glass-card rounded-2xl overflow-hidden group cursor-pointer flex flex-col">
  <!-- Thumbnail -->
  <div class="aspect-video w-full overflow-hidden relative">
    <img
      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      src="..." alt="..."
    />
    <!-- Discipline badge — absolute top-right -->
    <span class="absolute top-3 right-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border bg-[rgba(36,144,237,0.15)] text-[#4aa9f1] border-[rgba(36,144,237,0.25)]">
      WRT
    </span>
  </div>

  <!-- Body -->
  <div class="p-5 flex flex-col gap-3 flex-1">
    <h3 class="text-base font-semibold text-[rgba(255,255,255,0.92)] leading-snug line-clamp-2">
      Applied Structural Drying — Module 1
    </h3>
    <p class="text-xs text-[rgba(255,255,255,0.5)] flex items-center gap-1.5">
      <!-- icon --> 12 lessons · 3 hr 20 min
    </p>

    <!-- Progress (shown when enrolled) -->
    <div class="mt-auto pt-3">
      <div class="flex justify-between text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
        <span>Progress</span><span>64%</span>
      </div>
      <div class="h-1.5 rounded-full bg-[rgba(255,255,255,0.08)]">
        <div class="h-full rounded-full bg-[#2490ed] transition-all" style="width: 64%"></div>
      </div>
    </div>
  </div>
</article>
```

---

### CTA Section

```html
<section class="max-w-7xl mx-auto px-4 md:px-8 py-20">
  <div class="relative glass rounded-2xl p-8 md:p-14 text-center overflow-hidden noise-overlay">
    <!-- Decorative glow blob -->
    <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div class="w-[600px] h-[300px] rounded-full bg-[#2490ed] opacity-[0.06] blur-[80px]"></div>
    </div>

    <div class="relative z-10">
      <h2 class="text-2xl md:text-4xl font-bold text-[rgba(255,255,255,0.92)] tracking-tight">
        Ready to start your certification?
      </h2>
      <p class="mt-4 text-[rgba(255,255,255,0.6)] text-lg max-w-xl mx-auto leading-relaxed">
        Join thousands of restoration professionals who have advanced their careers with CARSI training.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center mt-10">
        <!-- Primary button lg -->
        <!-- Ghost button lg -->
      </div>
    </div>
  </div>
</section>
```

---

## 5 · Layout Principles

### Spacing Scale

CARSI uses a strict **4 px base grid**. Every margin, padding, and gap must be a multiple of 4 px.

| Token | px | rem | Tailwind |
|---|---|---|---|
| `space-1` | 4 | 0.25 | `p-1` / `m-1` |
| `space-2` | 8 | 0.5 | `p-2` / `m-2` |
| `space-3` | 12 | 0.75 | `p-3` / `m-3` |
| `space-4` | 16 | 1 | `p-4` / `m-4` |
| `space-5` | 20 | 1.25 | `p-5` / `m-5` |
| `space-6` | 24 | 1.5 | `p-6` / `m-6` |
| `space-8` | 32 | 2 | `p-8` / `m-8` |
| `space-10` | 40 | 2.5 | `p-10` / `m-10` |
| `space-12` | 48 | 3 | `p-12` / `m-12` |
| `space-16` | 64 | 4 | `p-16` / `m-16` |
| `space-20` | 80 | 5 | `p-20` / `m-20` |
| `space-24` | 96 | 6 | `p-24` / `m-24` |

### Grid System

| Context | Columns | Gutter | Max width |
|---|---|---|---|
| `< sm` (< 640 px) | 1 | 16 px | fluid |
| `sm` (640 px+) | 2 | 24 px | fluid |
| `md` (768 px+) | 4 | 24 px | fluid |
| `lg` (1024 px+) | 12 | 32 px | fluid |
| `xl` (1280 px+) | 12 | 32 px | 1280 px |
| `2xl` (1536 px+) | 12 | 32 px | 1536 px |

Outer container: `max-w-7xl mx-auto px-4 sm:px-6 md:px-8`.

Page-level sections should use `py-20 md:py-28` vertical rhythm.

### Border-Radius Scale

| Token | px | rem | Tailwind | Usage |
|---|---|---|---|---|
| `radius-sm` | 4 | 0.25 | `rounded` | Badges, chips, small pills |
| `radius-md` | 6 | 0.375 | `rounded-md` | Small buttons, inputs |
| `radius-lg` | 8 | 0.5 | `rounded-lg` | Default buttons, form fields |
| `radius-xl` | 12 | 0.75 | `rounded-xl` | Cards, modals |
| `radius-2xl` | 16 | 1 | `rounded-2xl` | Hero panels, large glass surfaces |
| `radius-full` | 9999 | — | `rounded-full` | Avatars, progress pills, tags |

---

## 6 · Depth & Elevation

Six elevation levels create spatial hierarchy on the dark canvas. Each level's shadow is tighter at the bottom (contact shadow) and broader overhead (ambient shadow).

| Level | Name | CSS `box-shadow` | Typical usage |
|---|---|---|---|
| 0 | **Flat** | `none` | Inline text elements, plain list items |
| 1 | **Resting** | `0 1px 2px rgba(0,0,0,0.4)` | Subtle card borders, nav dividers |
| 2 | **Low** | `0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)` | Input fields, badge chips |
| 3 | **Medium** | `0 4px 12px rgba(0,0,0,0.5)` | Standard cards, dropdowns |
| 4 | **High** | `0 10px 30px rgba(0,0,0,0.5)` | Modals, side-sheets, popovers |
| 5 | **Overlay** | `0 20px 50px rgba(0,0,0,0.6)` | Dialogs, command palette |
| 6 | **Glass card** | `0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)` | Glass-card surfaces (default elevation for course cards, dashboard panels) |

### Glow variants (additive on hover)

| Name | CSS | Applied to |
|---|---|---|
| `glow-blue` | `0 0 40px rgba(36,144,237,0.25)` | Primary CTA buttons, interactive glass cards |
| `glow-blue-lg` | `0 0 80px rgba(36,144,237,0.20)` | Hero ambient backdrop |
| `glow-orange` | `0 0 40px rgba(237,157,36,0.30)` | Accent buttons, active accent badges |
| `glow-card-hover` | `0 8px 40px rgba(36,144,237,0.15), 0 2px 8px rgba(0,0,0,0.5)` | Hovered glass-card |

---

## 7 · Do's and Don'ts

### ✅ Do's

1. **Do use the 4 px spacing grid universally.** Every padding, margin, and gap must resolve to a multiple of 4. Use Tailwind's default spacing scale — never arbitrary pixel values like `mt-[7px]`.

2. **Do apply `glass-card` for interactive content panels.** Course cards, lesson tiles, and dashboard widgets all use `glass-card rounded-2xl`. The subtle lift and blue-border-glow on hover reinforces the interactive affordance.

3. **Do reserve CARSI orange (`#ed9d24`) for exactly one purpose per view.** Use it for the single highest-priority CTA, the progress fill in the hero metric, or the "new" badge on a course. Never apply it to two competing elements on the same screen.

4. **Do add `noise-overlay` to large glass hero sections.** The subtle noise texture breaks up flat gradients and adds a premium tactile quality at high display DPI.

5. **Do provide explicit `disabled` styling.** Every interactive element must have `disabled:opacity-40 disabled:pointer-events-none`. Never rely on the browser default.

6. **Do honour `prefers-reduced-motion`.** The global CSS already suppresses animations; never add `!important` to animation properties that would override this rule.

7. **Do keep body line-length within `max-w-prose` (65 ch) for instructional content.** Psychrometric theory, IICRC standard references, and lesson text require comfortable reading width — not full bleed.

8. **Do use `font-feature-settings: "tnum" 1` on all numeric columns.** Psychrometric charts, dew-point tables, moisture readings, and progress percentages must use tabular numbers so columns align.

9. **Do write link underlines on long-form body text.** Glass dark themes suppress underline affordances; use `underline decoration-[#2490ed] underline-offset-2` on in-paragraph links.

10. **Do prefix all Radix/shadcn component customisations with the existing CSS variable system.** New tokens belong in `:root {}` in `globals.css` and in `tailwind.config.ts`, not as one-off inline styles.

---

### ❌ Don'ts

1. **Don't use white or light backgrounds.** CARSI is permanently dark. Do not add `.light` or `.bg-white` classes anywhere. Glassmorphism requires a dark canvas to render correctly.

2. **Don't add a second warm accent colour.** CARSI orange is the sole warm note. Never introduce yellow, red-orange, gold, or any other warm hue for decorative purposes — each would compete with the accent's urgency signal.

3. **Don't nest glass surfaces more than two levels deep.** A glass card inside a glass modal inside a glass page background creates illegible blur-on-blur. Maximum depth: one glass parent, one glass child.

4. **Don't use `box-shadow` glow effects on body text or icons.** Glows are reserved for interactive surfaces (buttons, cards on hover) and ambient hero backdrop. Glowing static text reads as an error state.

5. **Don't hard-code hex colours in component files.** All colours must reference CSS custom properties (`var(--brand-primary)`) or Tailwind tokens. Inline `style={{ color: '#2490ed' }}` is forbidden except in the design-system preview page.

6. **Don't skip `focus-visible` rings.** Keyboard navigation is essential for students using screen-readers or completing exams without a mouse. The `focus-visible:ring-2 focus-visible:ring-[#2490ed]` ring must never be overridden with `outline-none` alone.

7. **Don't use `text-gradient` on body copy or small text below 18 px.** Gradient clipping renders poorly at small sizes on non-retina displays. Use `text-gradient` only on H1 / Display headings.

8. **Don't animate layout properties (`width`, `height`, `top`, `left`).** Use `transform` and `opacity` exclusively for performance. The Abyssal Vision theme uses many concurrent animations; layout animations trigger reflow and cause jank on lower-end devices.

9. **Don't place more than one primary button per visible viewport section.** Primary buttons signal the single most important action. Multiple primaries create anxiety and flatten hierarchy.

10. **Don't strip discipline colour classes (`discipline-WRT`, etc.) from course metadata.** These CSS custom properties drive the coloured progress rings and category indicators throughout the dashboard. Removing them breaks visual discipline identification.

---

## 8 · Responsive Behavior

### Breakpoint Table

| Name | Min-width | Tailwind prefix | Notes |
|---|---|---|---|
| *(default)* | 0 px | — | Mobile first, single column |
| `sm` | 640 px | `sm:` | 2-column grids, side-by-side buttons |
| `md` | 768 px | `md:` | Sidebar layouts appear, nav expands |
| `lg` | 1024 px | `lg:` | Full 12-column grid active |
| `xl` | 1280 px | `xl:` | Max-width container kicks in |
| `2xl` | 1536 px | `2xl:` | Wide reading comfort improvements |

### Mobile-First Rules

1. **Single-column at `< sm`.** Every page layout starts with `grid-cols-1`. Columns widen at `md:grid-cols-2`, `lg:grid-cols-3/4/12`.

2. **Touch targets ≥ 44 × 44 px.** All interactive elements — buttons, nav links, course card tap zones, toggle switches — must meet this minimum. Use `min-h-[44px] min-w-[44px]` where the visible element is smaller than the target (e.g. icon-only buttons).

3. **Nav collapses to a bottom sheet at `< md`.** The fixed top nav hides link items and CTA. A bottom navigation bar (`fixed bottom-0 inset-x-0 z-50`) provides Home / Courses / Progress / Profile tabs with 56 px height.

4. **Glass blur degrades gracefully.** On browsers that do not support `backdrop-filter`, surfaces fall back to `bg-[rgba(12,18,36,0.95)]` — still dark, still legible.

5. **Hero copy scales with `clamp()`.** Use `text-[clamp(2rem,5vw,3.75rem)]` for Display headings so font size adapts continuously rather than jumping between breakpoints.

6. **Horizontal scroll is forbidden.** Set `overflow-x: hidden` on `<body>` and ensure no element has a fixed width that exceeds the viewport.

7. **Images use `aspect-video` with `object-cover`.** Never set fixed pixel heights on media. CourseCard thumbnails always hold the `16:9` ratio.

8. **Modal dialogs become full-screen sheets on `< sm`.** `rounded-2xl` modals lose their border radius and take `rounded-none inset-0` to feel native on phones.

### Component-Level Responsive Notes

| Component | Mobile | md+ |
|---|---|---|
| Nav | Icon menu button; bottom nav tabs | Full horizontal link row + CTA button |
| Hero | `py-24`, single column, stacked CTA buttons | `py-40`, left-aligned text + right media |
| CourseCard grid | 1 column | `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` |
| CTA section | `p-8`, stacked buttons | `p-14`, inline buttons |
| Data tables | Horizontal scroll container `overflow-x-auto` | Full table |
| Sidebar | Hidden; accessible via slide-over drawer | Fixed left column `w-64` |

---

## 9 · Agent Prompt Guide

This section is written for AI coding assistants (Claude, Copilot, Cursor) generating CARSI UI components. Copy-paste these prompts verbatim.

### Quick Colour Reference

```
Primary blue:   #2490ed  (hover: #1a7fd4)
Accent orange:  #ed9d24  (hover: #c4811b)
Page canvas:    #060a14
Surface glass:  rgba(255,255,255,0.05)
Border subtle:  rgba(255,255,255,0.09)
Border active:  rgba(36,144,237,0.35)
Text primary:   rgba(255,255,255,0.92)
Text secondary: rgba(255,255,255,0.60)
Text muted:     rgba(255,255,255,0.35)
Success:        #27ae60
Warning:        #f59e0b
Error:          #dc2626
```

### CSS Utility Reference

```
glass           — blurred glass surface (rgba 5% white, blur 24px)
glass-sm        — lighter blur variant
glass-card      — interactive card with hover lift + blue border glow
text-gradient   — blue gradient text (#2490ed → #38b8ff)
glow            — blue box-shadow glow
noise-overlay   — subtle noise texture pseudo-element
shimmer         — animated skeleton loading gradient
```

---

### Component Generation Prompts

#### Prompt 1 — Glass Course Card

```
Create a React TypeScript CourseCard component for CARSI LMS.

Design rules (dark glassmorphic — do NOT use light backgrounds):
- Outer: <article> with Tailwind classes: glass-card rounded-2xl overflow-hidden group cursor-pointer flex flex-col
- Thumbnail: <div class="aspect-video w-full overflow-hidden relative"> containing <img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
- Discipline badge (absolute top-3 right-3): inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border bg-[rgba(36,144,237,0.15)] text-[#4aa9f1] border-[rgba(36,144,237,0.25)]
- Body: <div class="p-5 flex flex-col gap-3 flex-1">
  - Title: text-base font-semibold text-[rgba(255,255,255,0.92)] leading-snug line-clamp-2
  - Meta (duration): text-xs text-[rgba(255,255,255,0.5)]
  - Progress bar wrapper: h-1.5 rounded-full bg-[rgba(255,255,255,0.08)]
  - Progress fill: h-full rounded-full bg-[#2490ed] transition-all
Props: { title, discipline, thumbnailUrl, lessonCount, durationMinutes, progressPercent? }
Use lucide-react icons. No hardcoded colours — use only the classes above.
```

#### Prompt 2 — Primary Navigation Bar

```
Create a React TypeScript NavBar component for CARSI LMS.

Design rules:
- <nav class="fixed top-0 inset-x-0 z-50 glass border-b border-[rgba(255,255,255,0.09)] h-16">
- Inner container: max-w-7xl mx-auto px-4 md:px-8 h-full flex items-center justify-between gap-6
- Logo: flex items-center gap-2 text-base font-semibold text-[rgba(255,255,255,0.92)] shrink-0
- Desktop links (hidden md:flex items-center gap-1): anchor tags with px-3 py-1.5 text-sm rounded-md transition-colors
  - Default: text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.92)] hover:bg-[rgba(255,255,255,0.05)]
  - Active (isActive prop): text-[#2490ed] bg-[rgba(36,144,237,0.08)]
- CTA area: flex items-center gap-3 shrink-0
  - Enrol button (Primary sm): bg-[#2490ed] text-[#060a14] hover:bg-[#1a7fd4] h-8 px-3 text-xs rounded-md font-semibold
- Mobile: hamburger icon (lucide Menu) — no mobile drawer needed in this component
No hardcoded hex — use classes above only.
```

#### Prompt 3 — Hero Section

```
Create a React TypeScript HeroSection component for CARSI LMS.

Design rules:
- <section class="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
- Two ambient blob divs (aria-hidden="true", absolute positioned, pointer-events-none):
  - Blob 1: w-[700px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(36,144,237,0.20)_0%,transparent_70%)] blur-[80px] -top-24 -left-48 animate-pulse-soft
  - Blob 2: w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(237,157,36,0.12)_0%,transparent_70%)] blur-[80px] bottom-0 right-0 animate-pulse-soft
- Content: relative z-10 max-w-7xl mx-auto px-4 md:px-8 then max-w-3xl
  - Eyebrow: text-xs font-semibold tracking-widest uppercase text-[#2490ed] mb-4
  - H1: text-[clamp(2rem,5vw,3.75rem)] font-extrabold leading-tight tracking-tight text-gradient mb-6
  - Body: text-lg md:text-xl text-[rgba(255,255,255,0.6)] leading-relaxed max-w-2xl mb-10
  - CTA group: flex flex-col sm:flex-row gap-4
    - Primary button lg: bg-[#2490ed] text-[#060a14] hover:bg-[#1a7fd4] hover:shadow-glow h-12 px-6 text-base rounded-lg font-semibold
    - Secondary button lg: border border-[rgba(36,144,237,0.35)] text-[#2490ed] hover:bg-[rgba(36,144,237,0.08)] h-12 px-6 text-base rounded-lg font-semibold
Props: { eyebrow, headline, body, primaryCta: {label, href}, secondaryCta?: {label, href} }
```

#### Prompt 4 — Data Table with Psychrometric Values

```
Create a React TypeScript PsychrometricTable component for CARSI LMS.

Design rules:
- Outer: overflow-x-auto (horizontal scroll on mobile)
- <table class="w-full text-sm text-left">
- <thead>: bg-[rgba(255,255,255,0.04)] border-b border-[rgba(255,255,255,0.09)]
  - <th>: px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgba(255,255,255,0.5)]
- <tbody>:
  - <tr> default: border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.03)] transition-colors
  - <td>: px-4 py-3 text-[rgba(255,255,255,0.80)] font-mono text-[13px] tabular-nums
  - Numeric cells must include style={{ fontFeatureSettings: '"tnum" 1' }}
- Status badges in cells use the Badge semantic variants from the design system
- No fixed column widths — let content determine width
Props: { columns: {key, label, numeric?}[], rows: Record<string, unknown>[] }
```

#### Prompt 5 — CTA Banner Section

```
Create a React TypeScript CTABanner component for CARSI LMS.

Design rules:
- Outer: max-w-7xl mx-auto px-4 md:px-8 py-20
- Inner panel: relative glass rounded-2xl p-8 md:p-14 text-center overflow-hidden noise-overlay
- Decorative glow (aria-hidden="true", absolute inset-0, flex items-center justify-center, pointer-events-none):
  - Inner div: w-[600px] h-[300px] rounded-full bg-[#2490ed] opacity-[0.06] blur-[80px]
- Content: relative z-10
  - H2: text-2xl md:text-4xl font-bold text-[rgba(255,255,255,0.92)] tracking-tight
  - Body: mt-4 text-[rgba(255,255,255,0.6)] text-lg max-w-xl mx-auto leading-relaxed
  - Button group: flex flex-col sm:flex-row gap-4 justify-center mt-10
    - Primary button lg: bg-[#2490ed] text-[#060a14] hover:bg-[#1a7fd4] hover:shadow-glow h-12 px-8 text-base rounded-lg font-semibold
    - Ghost button lg: text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.92)] h-12 px-8 text-base rounded-lg font-semibold
Props: { heading, body, primaryCta: {label, href}, ghostCta?: {label, href} }
```

---

*End of CARSI Design System — Foundation Layer*  
*Tailwind token wiring (`tailwind.config.ts` + `globals.css` CSS variables) will follow in a separate PR.*
