const RING = 20;
const CIRC = 2 * Math.PI * RING;

export function LearnerCourseProgress({
  percent,
  done,
  total,
}: {
  percent: number;
  done: number;
  total: number;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  const offset = CIRC - (pct / 100) * CIRC;

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-[#2490ed]/20 bg-gradient-to-br from-[#eef7ff] via-white to-white px-3 py-2.5 shadow-[0_8px_24px_-16px_rgba(20,111,194,0.55)]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label="Course progress"
    >
      <div className="relative h-14 w-14 shrink-0">
        <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90" aria-hidden>
          <circle cx="28" cy="28" r={RING} fill="none" stroke="#dbeafe" strokeWidth="5" />
          <circle
            cx="28"
            cy="28"
            r={RING}
            fill="none"
            stroke="url(#learner-progress-ring)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
          <defs>
            <linearGradient id="learner-progress-ring" x1="0" y1="0" x2="56" y2="56">
              <stop offset="0%" stopColor="#146fc2" />
              <stop offset="100%" stopColor="#2490ed" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-[#146fc2] tabular-nums">
          {pct}%
        </span>
      </div>
      <div className="min-w-0 sm:w-44">
        <p className="text-sm font-semibold text-slate-900">
          {pct === 100 ? 'Course complete' : 'In progress'}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {done} of {total} lesson{total === 1 ? '' : 's'}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#146fc2] to-[#2490ed] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
