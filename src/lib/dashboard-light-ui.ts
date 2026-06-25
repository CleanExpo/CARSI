/** Shared Tailwind class groups for the light dashboard workspace shell. */
export const dash = {
  eyebrow: 'text-[11px] font-semibold tracking-[0.2em] text-[#146fc2] uppercase',
  h1: 'text-3xl font-bold tracking-tight text-slate-900 sm:text-[2rem]',
  h2: 'text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl',
  lead: 'text-sm leading-relaxed text-slate-600',
  muted: 'text-slate-500',
  subtle: 'text-slate-400',
  card: 'rounded-2xl border border-slate-200 bg-white shadow-sm',
  cardInset: 'rounded-xl border border-slate-200 bg-slate-50',
  statCard:
    'rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300',
  statLabel: 'text-xs font-medium tracking-wide text-slate-500 uppercase',
  statValue: 'text-3xl font-semibold tracking-tight tabular-nums text-slate-900',
  statHint: 'text-xs leading-relaxed text-slate-500',
  divider: 'border-slate-200',
  btnPrimary:
    'inline-flex items-center gap-2 rounded-lg bg-[#2490ed] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a7fd4]',
  btnSecondary:
    'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50',
  btnGhost:
    'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900',
  hero:
    'relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',
  enrollmentCard:
    'group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-[#2490ed]/35 hover:shadow-md',
  input:
    'rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2490ed]/50 focus:outline-none focus:ring-2 focus:ring-[#2490ed]/20',
  link: 'text-[#146fc2] hover:underline',
  panel: 'rounded-2xl border border-slate-200 bg-white shadow-sm',
  panelInset: 'rounded-xl border border-slate-200 bg-slate-50',
  sidebar: 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm',
} as const;
