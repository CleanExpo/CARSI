'use client';

/**
 * Online + in-person growth path — section 2 visual.
 * Theme-aware line art; supports light and dark surfaces.
 */
export function GrowthPathInfographic({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative h-full min-h-[280px] overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#f8fbff] via-white to-[#fff8ed] p-6 dark:border-white/10 dark:from-[#0f172a] dark:via-[#0d1524] dark:to-[#0a101c] ${className}`}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 30% 20%, rgba(36,144,237,0.14), transparent 65%), radial-gradient(ellipse 55% 50% at 85% 80%, rgba(237,157,36,0.1), transparent 60%)',
        }}
      />

      <svg
        viewBox="0 0 360 280"
        className="relative h-full w-full"
        role="img"
        aria-label="Online learning connects to in-person Business Growth Days"
      >
        {/* Online branch */}
        <g>
          <rect
            x="28"
            y="36"
            width="128"
            height="88"
            rx="12"
            className="fill-white stroke-slate-200 dark:fill-white/[0.06] dark:stroke-white/12"
            strokeWidth="1.5"
          />
          <text x="92" y="62" textAnchor="middle" className="fill-[#146fc2] text-[11px] font-bold dark:fill-[#8fd0ff]">
            Online
          </text>
          <text x="92" y="78" textAnchor="middle" className="fill-slate-500 text-[9px] dark:fill-white/50">
            Courses &amp; CECs
          </text>
          <rect x="48" y="88" width="88" height="6" rx="3" className="fill-slate-100 dark:fill-white/10" />
          <rect x="48" y="88" width="62" height="6" rx="3" fill="#2490ed" opacity="0.85" />
          <rect x="48" y="100" width="88" height="6" rx="3" className="fill-slate-100 dark:fill-white/10" />
          <rect x="48" y="100" width="44" height="6" rx="3" fill="#2490ed" opacity="0.5" />
          <circle cx="52" cy="118" r="4" fill="#10b981" />
          <text x="62" y="121" className="fill-slate-600 text-[8px] dark:fill-white/55">
            Pathways &amp; dashboard
          </text>
        </g>

        {/* Connector */}
        <path
          d="M 156 80 C 200 80, 200 140, 180 168"
          fill="none"
          stroke="#2490ed"
          strokeWidth="2"
          strokeOpacity="0.35"
          strokeDasharray="4 4"
        />
        <path
          d="M 156 120 C 210 120, 220 168, 180 168"
          fill="none"
          stroke="#ed9d24"
          strokeWidth="2"
          strokeOpacity="0.4"
        />

        {/* Center outcome */}
        <circle
          cx="180"
          cy="188"
          r="36"
          className="fill-[#ed9d24]/12 stroke-[#ed9d24]/50"
          strokeWidth="1.5"
        />
        <text x="180" y="184" textAnchor="middle" className="fill-slate-800 text-[10px] font-bold dark:fill-white">
          Grow
        </text>
        <text x="180" y="198" textAnchor="middle" className="fill-slate-500 text-[8px] dark:fill-white/50">
          your business
        </text>

        {/* In-person branch */}
        <g>
          <rect
            x="204"
            y="36"
            width="128"
            height="88"
            rx="12"
            className="fill-white stroke-slate-200 dark:fill-white/[0.06] dark:stroke-white/12"
            strokeWidth="1.5"
          />
          <text x="268" y="62" textAnchor="middle" className="fill-[#9a4a00] text-[11px] font-bold dark:fill-[#f2b14f]">
            In person
          </text>
          <text x="268" y="78" textAnchor="middle" className="fill-slate-500 text-[9px] dark:fill-white/50">
            CCW Growth Days
          </text>
          <circle cx="232" cy="100" r="5" fill="#10b981" />
          <text x="244" y="103" className="fill-slate-600 text-[8px] dark:fill-white/55">
            Melbourne
          </text>
          <circle cx="232" cy="116" r="5" fill="#2490ed" />
          <text x="244" y="119" className="fill-slate-600 text-[8px] dark:fill-white/55">
            Sydney
          </text>
        </g>

        {/* Bottom workshop strip */}
        <rect
          x="28"
          y="228"
          width="304"
          height="40"
          rx="10"
          className="fill-white/90 stroke-slate-200 dark:fill-white/[0.05] dark:stroke-white/10"
          strokeWidth="1"
        />
        <text x="48" y="252" className="fill-slate-700 text-[9px] font-semibold dark:fill-white/80">
          + 2-Day CCW Workshop
        </text>
        <text x="268" y="252" textAnchor="end" className="fill-[#146fc2] text-[9px] font-medium dark:fill-[#8fd0ff]">
          Online → live → scale
        </text>
      </svg>
    </div>
  );
}
