import Link from 'next/link';
import { ArrowRight, Award, BookOpenCheck, CheckCircle2, Route } from 'lucide-react';

import { customerJourneyLoopStages } from '@/lib/customer-journey-loop';

import type { ContinueLearningSnapshot } from './ContinueLearningBanner';

type MomentumEnrollment = {
  id: string;
  course_title: string;
  course_slug: string;
  status: string;
  completion_percentage: number;
  all_lessons_complete?: boolean;
  certificate_issued_at?: string | null;
  last_lesson_id?: string | null;
};

type LearningMomentumLoopProps = {
  resume: ContinueLearningSnapshot | null;
  enrollments: MomentumEnrollment[];
  recommendationsCount: number;
  loading?: boolean;
};

function certificateHref(enrollmentId: string) {
  return `/api/lms/enrollments/${enrollmentId}/certificate`;
}

function buildMomentumAction({
  resume,
  enrollments,
  recommendationsCount,
  loading,
}: LearningMomentumLoopProps) {
  if (loading) {
    return {
      eyebrow: 'Checking progress',
      title: 'Finding your next best action',
      body: 'CARSI is loading your enrolments, progress, credentials, and recommendations.',
      href: '/dashboard/student',
      label: 'My learning',
      icon: Route,
      download: false,
    };
  }

  if (resume) {
    return {
      eyebrow: 'Return loop',
      title: `Resume ${resume.course_title}`,
      body: `Continue from ${resume.lesson_title || 'your last lesson'} and keep your certificate path moving.`,
      href: resume.resume_href,
      label: 'Resume lesson',
      icon: BookOpenCheck,
      download: false,
    };
  }

  const completedWithoutCertificate = enrollments.find(
    (enrollment) =>
      (enrollment.all_lessons_complete || enrollment.status === 'completed') &&
      !enrollment.certificate_issued_at
  );

  if (completedWithoutCertificate) {
    return {
      eyebrow: 'Credential loop',
      title: 'Turn completion into proof',
      body: `${completedWithoutCertificate.course_title} is ready for certificate generation and CEC evidence.`,
      href: certificateHref(completedWithoutCertificate.id),
      label: 'Generate certificate',
      icon: Award,
      download: true,
    };
  }

  if (enrollments.length === 0) {
    return {
      eyebrow: 'Choose loop',
      title: 'Choose your first pathway',
      body: 'Start with your trade goal, CEC need, or team training problem and CARSI will point you to the right course.',
      href: '/pathways',
      label: 'Find my path',
      icon: Route,
      download: false,
    };
  }

  return {
    eyebrow: 'Next loop',
    title: recommendationsCount > 0 ? 'Pick the next course' : 'Keep building your record',
    body:
      recommendationsCount > 0
        ? 'Use your recommendation strip to add the next course while the current learning context is still fresh.'
        : 'Review the catalogue or pathway map to keep your CEC record and trade knowledge moving.',
    href: '/dashboard/courses',
    label: recommendationsCount > 0 ? 'View recommendations' : 'Browse catalogue',
    icon: CheckCircle2,
    download: false,
  };
}

export function LearningMomentumLoop(props: LearningMomentumLoopProps) {
  const action = buildMomentumAction(props);
  const Icon = action.icon;
  const activeStage = props.resume
    ? 'return'
    : props.enrollments.length === 0
      ? 'choose'
      : action.download
        ? 'credential'
        : 'next';

  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6"
      aria-label="Learning momentum loop"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#2490ed]/35 bg-[#2490ed]/12 text-[#8fd0ff]"
            aria-hidden
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#7ec5ff] uppercase">
              {action.eyebrow}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">{action.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/58">{action.body}</p>
          </div>
        </div>

        <Link
          href={action.href}
          download={action.download ? true : undefined}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#ed9d24] px-5 py-3 text-sm font-semibold text-[#1a1205] transition-transform hover:scale-[1.01]"
        >
          {action.label}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {customerJourneyLoopStages.map((stage) => {
          const StageIcon = stage.icon;
          const active = stage.id === activeStage;
          return (
            <li
              key={stage.id}
              className="rounded-lg border px-3 py-2.5"
              style={{
                background: active ? 'rgba(36,144,237,0.12)' : 'rgba(255,255,255,0.025)',
                borderColor: active ? 'rgba(36,144,237,0.38)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center gap-2">
                <StageIcon
                  className={active ? 'h-3.5 w-3.5 text-[#7ec5ff]' : 'h-3.5 w-3.5 text-white/34'}
                  aria-hidden
                />
                <span
                  className={active ? 'text-xs font-semibold text-white' : 'text-xs text-white/48'}
                >
                  {stage.title}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
