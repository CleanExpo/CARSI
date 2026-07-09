import { CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import Link from 'next/link';

import { orderedSteps } from '@/lib/designations/registry';
import type { DesignationDetail } from '@/lib/server/designations';

/**
 * The learner pathway to a CARSI designation: an ordered list of course steps
 * with per-step status (complete / in-progress / available), "you are here", and
 * a required-vs-recommended marker. Presentational server component.
 */
export function DesignationPathway({ detail }: { detail: DesignationDetail }) {
  const { definition, courses, progress } = detail;
  const steps = orderedSteps(definition);
  const nextSlug = progress?.nextStepSlug ?? null;

  return (
    <ol className="space-y-3">
      {steps.map((step) => {
        const course = courses[step.courseSlug];
        const stepProgress = progress?.steps.find((s) => s.courseSlug === step.courseSlug);
        const status = stepProgress?.status ?? 'available';
        const isNext = step.courseSlug === nextSlug;

        const Icon = status === 'complete' ? CheckCircle2 : status === 'in-progress' ? PlayCircle : Circle;
        const iconClass =
          status === 'complete'
            ? 'text-emerald-600'
            : status === 'in-progress'
              ? 'text-[#2490ed]'
              : 'text-slate-300';

        return (
          <li
            key={step.courseSlug}
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              isNext ? 'border-[#2490ed]/50 bg-[#2490ed]/[0.04]' : 'border-slate-200 bg-white'
            }`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <Link
                href={`/courses/${step.courseSlug}`}
                className="font-semibold text-slate-900 hover:text-[#0f5fa8]"
              >
                {course?.title ?? step.courseSlug}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                <span
                  className={
                    step.required ? 'font-semibold text-slate-700' : 'font-medium text-slate-500'
                  }
                >
                  {step.required ? 'Required' : 'Recommended'}
                </span>
                {step.role === 'credential' && (
                  <>
                    <span aria-hidden>·</span>
                    <span>earns the designation</span>
                  </>
                )}
                {isNext && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="font-semibold text-[#0f5fa8]">You are here</span>
                  </>
                )}
              </div>
            </div>
            {status === 'complete' && (
              <span className="shrink-0 self-center text-xs font-semibold text-emerald-600">
                Complete
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
