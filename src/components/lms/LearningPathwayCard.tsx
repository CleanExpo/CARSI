import Link from 'next/link';

interface LearningPathwayCardProps {
  pathway: {
    id: string;
    slug: string;
    title: string;
    description?: string | null;
    iicrc_discipline?: string | null;
    target_certification?: string | null;
    estimated_hours?: number | string | null;
  };
  courseCount?: number;
}

export function LearningPathwayCard({ pathway, courseCount }: LearningPathwayCardProps) {
  const hours =
    pathway.estimated_hours !== null && pathway.estimated_hours !== undefined
      ? parseFloat(String(pathway.estimated_hours))
      : null;

  return (
    <Link
      href={`/pathways/${pathway.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-[#2490ed]/35 hover:shadow-[0_18px_40px_-24px_rgba(20,111,194,0.35)]"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {typeof courseCount === 'number' ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
            {courseCount} course{courseCount !== 1 ? 's' : ''}
          </span>
        ) : null}
        {hours !== null && Number.isFinite(hours) ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
            {hours}h estimated
          </span>
        ) : null}
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.01em] text-slate-950 group-hover:text-[#146fc2]">
        {pathway.title}
      </h3>
      {pathway.description ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-500">
          {pathway.description}
        </p>
      ) : null}
      {pathway.target_certification ? (
        <p className="mt-auto pt-5 text-xs text-slate-400">{pathway.target_certification}</p>
      ) : null}
    </Link>
  );
}
