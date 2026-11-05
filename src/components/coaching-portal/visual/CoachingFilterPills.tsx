import {
  coachingFilterPillActive,
  coachingFilterPillIdle,
} from '@/components/coaching-portal/coaching-ui';

export type CoachingFilterOption<T extends string> = { id: T; label: string };

export function CoachingFilterPills<T extends string>({
  options,
  value,
  onChange,
  testId = 'coaching-filter-pills',
}: {
  options: CoachingFilterOption<T>[];
  value: T;
  onChange: (id: T) => void;
  testId?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter" data-testid={testId}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`${testId}-${o.id}`}
            className={active ? coachingFilterPillActive : coachingFilterPillIdle}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
