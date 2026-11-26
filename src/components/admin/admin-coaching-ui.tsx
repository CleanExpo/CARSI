import Link from 'next/link';
import type { ReactNode } from 'react';

import { ADMIN_COACHING_NAV, type AdminCoachingNavItem } from '@/lib/admin/admin-coaching-nav';

/** Shared layout and surfaces for coaching admin pages (aligned with portal coaching-ui). */
export const adminCoachingPage =
  'mx-auto w-full max-w-6xl space-y-6 px-4 py-6 text-white sm:px-6 lg:px-8';

export const adminCoachingHero =
  'rounded-2xl border border-white/[0.08] bg-[#0c1424] p-6 shadow-sm ring-1 ring-white/[0.04] sm:p-8';

export const adminCoachingSurface =
  'rounded-2xl border border-white/[0.08] bg-[#0c1424]/90 shadow-sm ring-1 ring-white/[0.04]';

export const adminCoachingInset =
  'rounded-xl border border-white/[0.06] bg-[#0a101c]/80 p-4 sm:p-5';

export const adminCoachingLabel =
  'text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase';

export const adminCoachingField =
  'mt-2 w-full rounded-lg border border-white/10 bg-[#060a14] px-3 py-2.5 text-sm text-white shadow-inner shadow-black/20 placeholder:text-white/30 focus-visible:border-sky-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-sky-500/30';

export const adminCoachingPrimaryBtn =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#146fc2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#125da8] disabled:pointer-events-none disabled:opacity-45';

export const adminCoachingSecondaryBtn =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-4 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/[0.08] disabled:pointer-events-none disabled:opacity-45';

export const adminCoachingGhostBtn =
  'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 text-sm font-medium text-slate-300 transition-colors hover:border-white/10 hover:bg-white/[0.05] hover:text-white disabled:opacity-45';

export function AdminCoachingPageHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <header className={adminCoachingHero}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-sky-400/90 uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </header>
  );
}

export function AdminCoachingNotice({
  variant,
  children,
}: {
  variant: 'success' | 'error';
  children: ReactNode;
}) {
  const styles =
    variant === 'success'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-100';
  return (
    <p
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm ${styles}`}
    >
      {children}
    </p>
  );
}

export function AdminCoachingStatusPill({
  tone,
  children,
}: {
  tone: 'neutral' | 'good' | 'warn' | 'draft';
  children: ReactNode;
}) {
  const ring =
    tone === 'good'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
      : tone === 'warn'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
        : tone === 'draft'
          ? 'border-sky-500/30 bg-sky-500/10 text-sky-100'
          : 'border-white/10 bg-white/[0.04] text-slate-300';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${ring}`}
    >
      {children}
    </span>
  );
}

/** PascalCase aliases for className tokens (use on buttons/fields). */
export const AdminCoachingField = adminCoachingField;
export const AdminCoachingPrimaryBtn = adminCoachingPrimaryBtn;
export const AdminCoachingSecondaryBtn = adminCoachingSecondaryBtn;
export const AdminCoachingGhostBtn = adminCoachingGhostBtn;

export function AdminCoachingShortcutNav({
  currentPath,
  className = '',
}: {
  currentPath: string;
  className?: string;
}) {
  return (
    <nav
      className={`flex [scrollbar-width:none] gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
      aria-label="Coaching admin shortcuts"
      data-testid="admin-coaching-shortcuts"
    >
      {ADMIN_COACHING_NAV.map((item) => (
        <AdminCoachingShortcutPill
          key={item.href}
          item={item}
          active={currentPath.startsWith(item.href)}
        />
      ))}
    </nav>
  );
}

function AdminCoachingShortcutPill({
  item,
  active,
}: {
  item: AdminCoachingNavItem;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`inline-flex min-h-9 shrink-0 flex-col justify-center rounded-xl border px-3.5 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
        active
          ? 'border-sky-500/35 bg-sky-500/10 text-white ring-1 ring-sky-400/20'
          : 'border-white/[0.08] bg-white/[0.02] text-slate-300 hover:border-white/15 hover:bg-white/[0.05] hover:text-white'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <span className="text-xs font-semibold tracking-tight">{item.label}</span>
      <span className="text-[10px] text-slate-500">{item.description}</span>
    </Link>
  );
}

export function AdminCoachingLoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className={`${adminCoachingSurface} flex flex-col items-center justify-center gap-3 px-6 py-16`}
      role="status"
      aria-live="polite"
      data-testid="admin-coaching-loading"
    >
      <span
        className="h-9 w-9 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400"
        aria-hidden
      />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

export function AdminCoachingEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={`${adminCoachingSurface} px-6 py-12 text-center`}
      data-testid="admin-coaching-empty"
    >
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export type AdminCoachingWorkflowStep = {
  id: string;
  label: string;
  detail: string;
  status: 'done' | 'current' | 'upcoming' | 'blocked';
};

export function AdminCoachingWorkflowRail({
  steps,
  testId = 'admin-coaching-workflow',
}: {
  steps: AdminCoachingWorkflowStep[];
  testId?: string;
}) {
  return (
    <ol
      className="grid gap-2 sm:grid-cols-3"
      aria-label="Member coaching workflow"
      data-testid={testId}
    >
      {steps.map((step, index) => {
        const ring =
          step.status === 'done'
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : step.status === 'current'
              ? 'border-sky-500/35 bg-sky-500/10 ring-1 ring-sky-400/20'
              : step.status === 'blocked'
                ? 'border-amber-500/25 bg-amber-500/5'
                : 'border-white/[0.08] bg-white/[0.02]';
        return (
          <li
            key={step.id}
            className={`rounded-xl border px-4 py-3 ${ring}`}
            aria-current={step.status === 'current' ? 'step' : undefined}
          >
            <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              Step {index + 1}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{step.label}</p>
            <p className="mt-1 text-xs leading-snug text-slate-400">{step.detail}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function AdminCoachingMetricGrid({
  items,
  testId = 'admin-coaching-metrics',
}: {
  items: { id: string; label: string; value: string }[];
  testId?: string;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3" data-testid={testId}>
      {items.map((m) => (
        <div
          key={m.id}
          className="rounded-lg border border-white/[0.06] bg-[#0a101c]/50 px-3 py-2.5"
        >
          <dt className={adminCoachingLabel}>{m.label}</dt>
          <dd className="mt-1 text-sm font-medium text-white tabular-nums">{m.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export const adminCoachingTextarea =
  'mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#060a14] px-3 py-2.5 text-sm leading-relaxed text-white shadow-inner shadow-black/20 placeholder:text-white/30 focus-visible:border-sky-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-sky-500/30';

export function AdminCoachingSection({
  title,
  description,
  actions,
  children,
  testId,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section className={`${adminCoachingSurface} p-5 sm:p-6`} data-testid={testId}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-slate-400">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
