'use client';

import { useState } from 'react';

const DISCIPLINES = [
  { id: 'WRT', label: 'WRT', fullName: 'Water Damage Restoration', color: '#2490ed' },
  { id: 'CRT', label: 'CRT', fullName: 'Carpet Repair & Reinstallation', color: '#26c4a0' },
  { id: 'ASD', label: 'ASD', fullName: 'Applied Structural Drying', color: '#6c63ff' },
  { id: 'OCT', label: 'OCT', fullName: 'Odour Control', color: '#9b59b6' },
  { id: 'CCT', label: 'CCT', fullName: 'Commercial Carpet Maintenance', color: '#17b8d4' },
  { id: 'FSRT', label: 'FSRT', fullName: 'Fire & Smoke Restoration', color: '#f05a35' },
  { id: 'AMRT', label: 'AMRT', fullName: 'Applied Microbial Remediation', color: '#27ae60' },
];

const CX = 250;
const CY = 200;
const RADIUS = 140;
const NODE_R = 30;
const CENTRE_R = 38;

function getNodePosition(index: number, total: number) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  return {
    x: CX + RADIUS * Math.cos(angle),
    y: CY + RADIUS * Math.sin(angle),
  };
}

export function IICRCDisciplineMap() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <svg
      viewBox="0 0 500 400"
      className="mx-auto w-full max-w-lg"
      style={{ overflow: 'visible' }}
      role="img"
      aria-label="IICRC Discipline Map showing 7 restoration disciplines"
    >
      <defs>
        <filter id="disc-glow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="centre-glow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Connection lines */}
      {DISCIPLINES.map((disc, i) => {
        const pos = getNodePosition(i, DISCIPLINES.length);
        const isActive = hovered === disc.id;
        return (
          <line
            key={`line-${disc.id}`}
            x1={CX}
            y1={CY}
            x2={pos.x}
            y2={pos.y}
            stroke={isActive ? disc.color : 'rgba(255,255,255,0.12)'}
            strokeWidth={isActive ? 2.5 : 1}
            strokeDasharray={isActive ? 'none' : '4 4'}
            style={{
              transition:
                'stroke 280ms cubic-bezier(0.4,0,0.2,1), stroke-width 280ms cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        );
      })}

      {/* Discipline nodes */}
      {DISCIPLINES.map((disc, i) => {
        const pos = getNodePosition(i, DISCIPLINES.length);
        const isActive = hovered === disc.id;
        const scale = isActive ? 1.15 : 1;

        return (
          <g
            key={disc.id}
            onMouseEnter={() => setHovered(disc.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              cursor: 'pointer',
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
              transformOrigin: `${pos.x}px ${pos.y}px`,
              transition: 'transform 280ms cubic-bezier(0.68,-0.55,0.265,1.55)',
            }}
          >
            {/* Outer glow ring */}
            {isActive && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_R + 6}
                fill="none"
                stroke={disc.color}
                strokeWidth={1.5}
                opacity={0.4}
                filter="url(#disc-glow)"
              />
            )}

            {/* Node circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={NODE_R}
              fill={isActive ? disc.color : `${disc.color}22`}
              stroke={disc.color}
              strokeWidth={isActive ? 2 : 1.5}
            />

            {/* Label */}
            <text
              x={pos.x}
              y={pos.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isActive ? '#ffffff' : disc.color}
              fontSize={12}
              fontWeight={700}
              fontFamily="system-ui, sans-serif"
              style={{ transition: 'fill 280ms cubic-bezier(0.4,0,0.2,1)' }}
            >
              {disc.label}
            </text>

            {/* Full name tooltip on hover */}
            {isActive && (
              <g>
                <rect
                  x={pos.x - 90}
                  y={pos.y + NODE_R + 8}
                  width={180}
                  height={22}
                  rx={4}
                  fill="rgba(6,10,20,0.92)"
                  stroke={disc.color}
                  strokeWidth={0.5}
                />
                <text
                  x={pos.x}
                  y={pos.y + NODE_R + 22}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.9)"
                  fontSize={10}
                  fontFamily="system-ui, sans-serif"
                >
                  {disc.fullName}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Centre node */}
      <g filter="url(#centre-glow)">
        <circle cx={CX} cy={CY} r={CENTRE_R} fill="#2490ed" opacity={0.9} />
        <circle
          cx={CX}
          cy={CY}
          r={CENTRE_R}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1}
        />
        <text
          x={CX}
          y={CY - 6}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={9}
          fontWeight={700}
          fontFamily="system-ui, sans-serif"
        >
          IICRC
        </text>
        <text
          x={CX}
          y={CY + 8}
          textAnchor="middle"
          fill="rgba(255,255,255,0.8)"
          fontSize={8}
          fontFamily="system-ui, sans-serif"
        >
          Certified
        </text>
      </g>
    </svg>
  );
}
