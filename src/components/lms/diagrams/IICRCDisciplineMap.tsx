'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

const DISCIPLINES = [
  { id: 'WRT', label: 'WRT', fullName: 'Water Damage Restoration', color: '#2490ed', blurb: 'Drying, psychrometry & flood response.' },
  { id: 'CRT', label: 'CRT', fullName: 'Carpet Repair & Reinstallation', color: '#26c4a0', blurb: 'Repair, re-stretch & installation standards.' },
  { id: 'ASD', label: 'ASD', fullName: 'Applied Structural Drying', color: '#6c63ff', blurb: 'Building drying & moisture control.' },
  { id: 'OCT', label: 'OCT', fullName: 'Odour Control', color: '#9b59b6', blurb: 'Deodorisation & indoor air quality.' },
  { id: 'CCT', label: 'CCT', fullName: 'Commercial Carpet Maintenance', color: '#17b8d4', blurb: 'Commercial carpet care & maintenance.' },
  { id: 'FSRT', label: 'FSRT', fullName: 'Fire & Smoke Restoration', color: '#f05a35', blurb: 'Fire, smoke & soot remediation.' },
  { id: 'AMRT', label: 'AMRT', fullName: 'Applied Microbial Remediation', color: '#27ae60', blurb: 'Mould & microbial remediation.' },
] as const;

const VB_W = 560;
const VB_H = 440;
const CX = VB_W / 2;
const CY = VB_H / 2 - 8;
const RADIUS = 148;
const NODE_R = 28;
const CENTRE_R = 44;

function getNodePosition(index: number, total: number) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  return {
    x: RADIUS * Math.cos(angle),
    y: RADIUS * Math.sin(angle),
  };
}

export function IICRCDisciplineMap() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);

  const activeId = locked ?? hovered;
  const active = useMemo(
    () => DISCIPLINES.find((d) => d.id === activeId) ?? null,
    [activeId]
  );

  const setHover = useCallback((id: string | null) => {
    setHovered(id);
  }, []);

  const toggleLock = useCallback((id: string) => {
    setLocked((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#060a12] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
          style={{
            background: `
              radial-gradient(ellipse 70% 55% at 50% 42%, rgba(36, 144, 237, 0.14), transparent 62%),
              radial-gradient(ellipse 50% 40% at 80% 20%, rgba(108, 99, 255, 0.08), transparent 50%),
              radial-gradient(ellipse 45% 35% at 15% 75%, rgba(38, 196, 160, 0.06), transparent 50%)
            `,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          aria-hidden
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="relative z-[1] mx-auto w-full max-w-[min(100%,520px)]"
          style={{ overflow: 'visible' }}
          role="img"
          aria-label="Interactive map of seven IICRC certification disciplines around a central IICRC hub"
        >
          <defs>
            <filter id="iicrc-node-shadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.45" />
            </filter>
            <filter id="iicrc-glow-soft">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="iicrc-centre-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38a8ff" />
              <stop offset="100%" stopColor="#1a6bb8" />
            </linearGradient>
            <radialGradient id="orbit-fade" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="rgba(255,255,255,0.07)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>

          {/* Orbit guides */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
            strokeDasharray="6 10"
          />
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS + 18}
            fill="none"
            stroke="url(#orbit-fade)"
            strokeWidth={24}
            opacity={0.5}
          />

          {/* Spokes */}
          {DISCIPLINES.map((disc, i) => {
            const { x, y } = getNodePosition(i, DISCIPLINES.length);
            const isActive = activeId === disc.id;
            return (
              <line
                key={`spoke-${disc.id}`}
                x1={CX}
                y1={CY}
                x2={CX + x}
                y2={CY + y}
                stroke={isActive ? disc.color : 'rgba(255,255,255,0.1)'}
                strokeWidth={isActive ? 2.2 : 1}
                strokeDasharray={isActive ? '0' : '5 6'}
                opacity={isActive ? 1 : 0.85}
                style={{
                  transition: 'stroke 220ms ease, stroke-width 220ms ease, opacity 220ms ease',
                }}
              />
            );
          })}

          {/* Discipline nodes */}
          {DISCIPLINES.map((disc, i) => {
            const { x, y } = getNodePosition(i, DISCIPLINES.length);
            const isActive = activeId === disc.id;
            const scale = isActive ? 1.12 : 1;
            const tx = CX + x;
            const ty = CY + y;

            return (
              <g
                key={disc.id}
                role="button"
                tabIndex={0}
                transform={`translate(${tx}, ${ty}) scale(${scale})`}
                style={{
                  cursor: 'pointer',
                  transition: 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onMouseEnter={() => setHover(disc.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => toggleLock(disc.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleLock(disc.id);
                  }
                }}
                aria-label={`${disc.label}: ${disc.fullName}`}
                aria-pressed={locked === disc.id}
              >
                {isActive && (
                  <circle
                    r={NODE_R + 10}
                    fill="none"
                    stroke={disc.color}
                    strokeWidth={1.5}
                    opacity={0.35}
                    filter="url(#iicrc-glow-soft)"
                  />
                )}
                <circle
                  r={NODE_R}
                  fill={isActive ? disc.color : 'rgba(8,12,20,0.92)'}
                  stroke={disc.color}
                  strokeWidth={isActive ? 2.2 : 1.4}
                  filter="url(#iicrc-node-shadow)"
                  opacity={isActive ? 1 : 0.95}
                  style={{ transition: 'fill 220ms ease, stroke-width 220ms ease' }}
                />
                {isActive && (
                  <circle r={NODE_R - 6} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={0.75} />
                )}
                <text
                  y={1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isActive ? '#ffffff' : disc.color}
                  fontSize={11}
                  fontWeight={800}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  style={{ transition: 'fill 220ms ease' }}
                >
                  {disc.label}
                </text>
              </g>
            );
          })}

          {/* Centre hub */}
          <g filter="url(#iicrc-node-shadow)">
            <circle cx={CX} cy={CY} r={CENTRE_R + 6} fill="none" stroke="rgba(36,144,237,0.25)" strokeWidth={1} strokeDasharray="4 6" />
            <circle cx={CX} cy={CY} r={CENTRE_R} fill="url(#iicrc-centre-grad)" opacity={0.98} />
            <circle
              cx={CX}
              cy={CY}
              r={CENTRE_R}
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={1.25}
            />
            <text
              x={CX}
              y={CY - 7}
              textAnchor="middle"
              fill="#ffffff"
              fontSize={11}
              fontWeight={800}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              letterSpacing="0.06em"
            >
              IICRC
            </text>
            <text
              x={CX}
              y={CY + 10}
              textAnchor="middle"
              fill="rgba(255,255,255,0.82)"
              fontSize={9}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              Disciplines
            </text>
          </g>
        </svg>

        <p className="relative z-[1] px-4 pb-4 text-center text-[11px] text-white/35">
          Hover on desktop or tap a node on mobile — tap again to clear.
        </p>
      </div>

      {/* Detail panel — Udemy-style “focus” rail */}
      <div
        className={`rounded-2xl border px-5 py-5 transition-all duration-300 sm:px-6 sm:py-6 ${
          active
            ? 'border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.02] shadow-[0_20px_60px_-40px_rgba(36,144,237,0.35)]'
            : 'border-white/[0.06] bg-white/[0.02]'
        }`}
        style={active ? { borderColor: `${active.color}44` } : undefined}
      >
        {active ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md px-2 py-0.5 font-mono text-xs font-bold text-white"
                  style={{ backgroundColor: `${active.color}33`, color: active.color }}
                >
                  {active.label}
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-white/35 uppercase">
                  Certification track
                </span>
              </div>
              <h3 className="text-lg font-semibold leading-snug text-white sm:text-xl">{active.fullName}</h3>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/50">{active.blurb}</p>
            </div>
            <Link
              href={`/courses?discipline=${active.id}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[#050505] transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: active.color, boxShadow: `0 10px 40px -12px ${active.color}88` }}
            >
              Browse {active.label} courses
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2 text-center sm:py-4">
            <p className="text-sm font-medium text-white/55">Select a discipline on the map</p>
            <p className="max-w-md text-xs leading-relaxed text-white/35">
              Each node is an IICRC pathway. We&apos;ll show the full certification name and a quick
              link into the matching catalogue filter.
            </p>
          </div>
        )}
      </div>

      {/* Legend strip */}
      <div className="flex flex-wrap justify-center gap-2">
        {DISCIPLINES.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setLocked((prev) => (prev === d.id ? null : d.id))}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
              activeId === d.id
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-white/8 bg-white/[0.03] text-white/45 hover:border-white/15 hover:text-white/70'
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} aria-hidden />
            <span className="font-mono font-bold" style={{ color: d.color }}>
              {d.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
