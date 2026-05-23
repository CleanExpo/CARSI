import type { AdminUserProgress } from '@/lib/admin/admin-user-progress';
import { cn } from '@/lib/utils';

export function completionColor(completionPct: number) {
  if (completionPct >= 90) return '#34d399';
  if (completionPct >= 40) return '#2490ed';
  return '#fb923c';
}

export function formatAdminDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

export function formatAdminDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return '—';
  }
}

export const adminGlassCard = cn(
  'rounded-2xl border border-white/[0.07] bg-white/[0.025]',
  'shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]',
  'transition-[border-color,box-shadow,background-color] duration-300 ease-out',
  'hover:border-white/[0.1] hover:bg-white/[0.03]',
);

export function LearnerAvatar({
  user,
  size = 'md',
}: {
  user: Pick<AdminUserProgress, 'fullName' | 'email'>;
  size?: 'md' | 'lg';
}) {
  const label = (user.fullName ?? user.email).split(' ').filter(Boolean)[0]?.slice(0, 1) ?? 'A';
  const dim = size === 'lg' ? 'h-16 w-16 text-xl' : 'h-10 w-10 text-sm';
  return (
    <div
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl font-bold tracking-tight shadow-inner',
        dim,
      )}
      style={{
        background: 'linear-gradient(145deg, rgba(36,144,237,0.22) 0%, rgba(36,144,237,0.06) 100%)',
        border: '1px solid rgba(36,144,237,0.28)',
        color: '#93c5fd',
      }}
    >
      {label.toUpperCase()}
    </div>
  );
}

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'success' | 'warning' | 'muted' | 'info';
}) {
  const styles = {
    success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    warning: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    muted: 'border-white/10 bg-white/5 text-white/55',
    info: 'border-[#2490ed]/30 bg-[#2490ed]/10 text-[#93c5fd]',
  }[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase',
        styles,
      )}
    >
      {label}
    </span>
  );
}

export function enrollmentStatusTone(status: string): 'success' | 'warning' | 'muted' {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'complete') return 'success';
  if (['active', 'enrolled', 'in_progress', 'in progress', 'started'].includes(s)) return 'warning';
  return 'muted';
}
