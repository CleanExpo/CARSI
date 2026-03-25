'use client';

const STEPS = [
  { label: 'Enrol', icon: 'E', color: '#2490ed' },
  { label: 'Learn', icon: 'L', color: '#26c4a0' },
  { label: 'Quiz', icon: 'Q', color: '#6c63ff' },
  { label: 'Earn XP', icon: 'X', color: '#ed9d24' },
  { label: 'Certificate', icon: 'C', color: '#27ae60' },
  { label: 'Share', icon: 'S', color: '#17b8d4' },
];

const STEP_Y = 65;
const CIRCLE_R = 26;
const PADDING_X = 80;

function getStepX(index: number, total: number, width: number) {
  const usable = width - PADDING_X * 2;
  return PADDING_X + (usable / (total - 1)) * index;
}

export function StudentJourneyMap({ activeStep = 0 }: { activeStep?: number }) {
  return (
    <svg
      viewBox="0 0 800 160"
      className="mx-auto w-full max-w-3xl"
      role="img"
      aria-label={`Student journey: step ${activeStep + 1} of ${STEPS.length} — ${STEPS[activeStep]?.label}`}
    >
      <defs>
        <filter id="step-glow">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth={8}
          markerHeight={8}
          orient="auto-start-reverse"
        >
          <path
            d="M 0 1 L 8 5 L 0 9"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.5}
          />
        </marker>
        <marker
          id="arrow-active"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth={8}
          markerHeight={8}
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9" fill="none" stroke="#2490ed" strokeWidth={1.5} />
        </marker>
      </defs>

      {/* Connector lines with arrows */}
      {STEPS.map((_, i) => {
        if (i === STEPS.length - 1) return null;
        const x1 = getStepX(i, STEPS.length, 800) + CIRCLE_R + 6;
        const x2 = getStepX(i + 1, STEPS.length, 800) - CIRCLE_R - 10;
        const isCompleted = i < activeStep;
        return (
          <line
            key={`conn-${i}`}
            x1={x1}
            y1={STEP_Y}
            x2={x2}
            y2={STEP_Y}
            stroke={isCompleted ? '#2490ed' : 'rgba(255,255,255,0.15)'}
            strokeWidth={isCompleted ? 2 : 1.5}
            markerEnd={isCompleted ? 'url(#arrow-active)' : 'url(#arrow)'}
            style={{
              transition: 'stroke 280ms cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        );
      })}

      {/* Steps */}
      {STEPS.map((step, i) => {
        const x = getStepX(i, STEPS.length, 800);
        const isActive = i === activeStep;
        const isCompleted = i < activeStep;
        const fill = isActive ? step.color : isCompleted ? `${step.color}88` : `${step.color}22`;
        const strokeColor = isActive || isCompleted ? step.color : 'rgba(255,255,255,0.15)';

        return (
          <g key={step.label}>
            {/* Glow ring for active */}
            {isActive && (
              <circle
                cx={x}
                cy={STEP_Y}
                r={CIRCLE_R + 5}
                fill="none"
                stroke={step.color}
                strokeWidth={1.5}
                opacity={0.35}
                filter="url(#step-glow)"
              />
            )}

            {/* Circle */}
            <circle
              cx={x}
              cy={STEP_Y}
              r={CIRCLE_R}
              fill={fill}
              stroke={strokeColor}
              strokeWidth={isActive ? 2 : 1.5}
              style={{
                transition:
                  'fill 280ms cubic-bezier(0.4,0,0.2,1), stroke 280ms cubic-bezier(0.4,0,0.2,1)',
              }}
            />

            {/* Icon letter */}
            <text
              x={x}
              y={STEP_Y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill={
                isActive
                  ? '#ffffff'
                  : isCompleted
                    ? 'rgba(255,255,255,0.85)'
                    : 'rgba(255,255,255,0.4)'
              }
              fontSize={14}
              fontWeight={700}
              fontFamily="system-ui, sans-serif"
            >
              {step.icon}
            </text>

            {/* Step label */}
            <text
              x={x}
              y={STEP_Y + CIRCLE_R + 18}
              textAnchor="middle"
              fill={isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.45)'}
              fontSize={12}
              fontWeight={isActive ? 600 : 400}
              fontFamily="system-ui, sans-serif"
              style={{
                transition: 'fill 280ms cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              {step.label}
            </text>

            {/* Step number */}
            <text
              x={x}
              y={STEP_Y - CIRCLE_R - 10}
              textAnchor="middle"
              fill={isActive ? step.color : 'rgba(255,255,255,0.2)'}
              fontSize={10}
              fontFamily="system-ui, sans-serif"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
