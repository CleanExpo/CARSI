'use client';

import { useCallback, useState } from 'react';

import { IICRC_DISCIPLINE_URL } from '@/lib/iicrc-discipline-display';

const DISCIPLINES = [
  {
    id: 'WRT',
    label: 'WRT',
    fullName: 'Water Damage Restoration',
    color: '#0f5fa8',
    blurb: 'Drying, psychrometry & flood response.',
  },
  {
    id: 'CRT',
    label: 'CRT',
    fullName: 'Carpet Repair & Reinstallation',
    color: '#047857',
    blurb: 'Repair, re-stretch & installation standards.',
  },
  {
    id: 'ASD',
    label: 'ASD',
    fullName: 'Applied Structural Drying',
    color: '#5145cd',
    blurb: 'Building drying & moisture control.',
  },
  {
    id: 'OCT',
    label: 'OCT',
    fullName: 'Odour Control',
    color: '#7e22ce',
    blurb: 'Deodorisation & indoor air quality.',
  },
  {
    id: 'CCT',
    label: 'CCT',
    fullName: 'Commercial Carpet Maintenance',
    color: '#0e7490',
    blurb: 'Commercial carpet care & maintenance.',
  },
  {
    id: 'FSRT',
    label: 'FSRT',
    fullName: 'Fire & Smoke Restoration',
    color: '#b94723',
    blurb: 'Fire, smoke & soot remediation.',
  },
  {
    id: 'AMRT',
    label: 'AMRT',
    fullName: 'Applied Microbial Remediation',
    color: '#15803d',
    blurb: 'Mould & microbial remediation.',
  },
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
  const activeDiscipline = DISCIPLINES.find((d) => d.id === activeId) ?? null;

  const setHover = useCallback((id: string | null) => {
    setHovered(id);
  }, []);

  const toggleLock = useCallback((id: string) => {
    setLocked((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a1018]">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
          style={{
            background: `
              radial-gradient(ellipse 70% 55% at 50% 42%, rgba(15, 95, 168, 0.12), transparent 62%),
              radial-gradient(ellipse 50% 40% at 80% 20%, rgba(81, 69, 205, 0.08), transparent 50%),
              radial-gradient(ellipse 45% 35% at 15% 75%, rgba(4, 120, 87, 0.06), transparent 50%)
            `,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          aria-hidden
          style={{
            backgroundImage: `linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px),
              linear-gradient(90deg, rgba(15,23,42,0.045) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        <div
          className="relative z-[1] mx-auto w-full max-w-[min(100%,520px)]"
          style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
          role="group"
          aria-label="Interactive map of seven IICRC CEC disciplines around a central IICRC hub"
        >
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="absolute inset-0 h-full w-full"
            style={{ overflow: 'visible' }}
            aria-hidden="true"
          >
            <defs>
              <filter id="iicrc-node-shadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow
                  dx="0"
                  dy="4"
                  stdDeviation="6"
                  floodColor="#000"
                  floodOpacity="0.45"
                />
              </filter>
              <filter id="iicrc-glow-soft">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="iicrc-centre-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f5fa8" />
                <stop offset="100%" stopColor="#0b4e88" />
              </linearGradient>
              <radialGradient id="orbit-fade" cx="50%" cy="50%" r="50%">
                <stop offset="70%" stopColor="rgba(15,23,42,0.08)" />
                <stop offset="100%" stopColor="rgba(15,23,42,0)" />
              </radialGradient>
            </defs>

            {/* Orbit guides */}
            <circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              fill="none"
              stroke="rgba(15,23,42,0.12)"
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
                  stroke={isActive ? disc.color : 'rgba(15,23,42,0.16)'}
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
                  transform={`translate(${tx}, ${ty}) scale(${scale})`}
                  style={{
                    transition: 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    pointerEvents: 'none',
                  }}
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
                    fill={isActive ? disc.color : '#ffffff'}
                    stroke={disc.color}
                    strokeWidth={isActive ? 2.2 : 1.4}
                    filter="url(#iicrc-node-shadow)"
                    opacity={isActive ? 1 : 0.95}
                    style={{ transition: 'fill 220ms ease, stroke-width 220ms ease' }}
                  />
                  {isActive && (
                    <circle
                      r={NODE_R - 6}
                      fill="none"
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth={0.75}
                    />
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
              <circle
                cx={CX}
                cy={CY}
                r={CENTRE_R + 6}
                fill="none"
                stroke="rgba(15,95,168,0.25)"
                strokeWidth={1}
                strokeDasharray="4 6"
              />
              <circle cx={CX} cy={CY} r={CENTRE_R} fill="url(#iicrc-centre-grad)" opacity={0.98} />
              <circle
                cx={CX}
                cy={CY}
                r={CENTRE_R}
                fill="none"
                stroke="rgba(255,255,255,0.35)"
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

          {/* Real <button> overlays — invisible, positioned over each SVG node.
            Handles all keyboard + pointer interaction so the SVG itself stays
            aria-hidden + decorative. Avoids axe-core nested-interactive. */}
          {DISCIPLINES.map((disc, i) => {
            const { x, y } = getNodePosition(i, DISCIPLINES.length);
            const leftPct = ((CX + x) / VB_W) * 100;
            const topPct = ((CY + y) / VB_H) * 100;
            const sizePct = ((NODE_R * 2) / VB_W) * 100;
            return (
              <button
                key={`btn-${disc.id}`}
                type="button"
                aria-label={`${disc.label}: ${disc.fullName}`}
                aria-pressed={locked === disc.id}
                onMouseEnter={() => setHover(disc.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(disc.id)}
                onBlur={() => setHover(null)}
                onClick={() => toggleLock(disc.id)}
                className="absolute cursor-pointer rounded-full border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5fa8] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${sizePct}%`,
                  aspectRatio: '1',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            );
          })}
        </div>

        <p className="relative z-[1] px-4 pb-1 text-center text-[11px] text-slate-600">
          Hover on desktop or tap a node on mobile — tap again to clear.
        </p>
        <p className="relative z-[1] min-h-[28px] px-4 pb-4 text-center text-[12px]">
          {activeDiscipline && IICRC_DISCIPLINE_URL[activeDiscipline.id] ? (
            <a
              href={IICRC_DISCIPLINE_URL[activeDiscipline.id]}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#0f5fa8] underline underline-offset-2 hover:text-[#0b4e88]"
            >
              {activeDiscipline.label} — {activeDiscipline.fullName} on iicrc.org ↗
            </a>
          ) : (
            <span className="text-slate-400">Select a discipline to view it on iicrc.org.</span>
          )}
        </p>
      </div>
    </div>
  );
}
