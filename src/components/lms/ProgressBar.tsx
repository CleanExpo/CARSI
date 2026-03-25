interface ProgressBarProps {
  percentage: number;
  label?: string;
}

export function ProgressBar({ percentage, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percentage));

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label ?? `${clamped}%`}</span>
        {label && <span>{clamped}%</span>}
      </div>
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          data-testid="progress-fill"
          className="bg-brand-primary h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
