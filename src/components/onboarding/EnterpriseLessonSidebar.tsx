'use client';

import { ClipboardList, Lightbulb, Target } from 'lucide-react';

import { dash } from '@/lib/dashboard-light-ui';
import { extractLessonHighlights } from '@/lib/onboarding/lesson-highlights';
import { parseHtmlLessonBlocks } from '@/lib/onboarding/parse-html-lesson';
import { looksLikeHtmlFragment } from '@/lib/lms/format-course-body';

type Props = {
  contentBody: string | null;
  contentType: string | null;
};

export function EnterpriseLessonSidebar({ contentBody, contentType }: Props) {
  if (contentType === 'quiz' || contentType === 'video') return null;

  const highlights = extractLessonHighlights(contentBody);
  let objectives = highlights.objectives;
  const checklist = highlights.checklist;

  if (objectives.length === 0 && contentBody && looksLikeHtmlFragment(contentBody)) {
    const blocks = parseHtmlLessonBlocks(contentBody);
    const listBlock = blocks.find((b) => b.type === 'list');
    if (listBlock && listBlock.type === 'list') {
      objectives = listBlock.items
        .slice(0, 5)
        .map((item) => item.html.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);
    }
  }

  const hasObjectives = objectives.length > 0;
  const hasChecklist = checklist.length > 0;

  if (!hasObjectives && !hasChecklist) {
    return (
      <div className={`${dash.cardInset} border-[#2490ed]/15 bg-[#eef7ff]/40 p-5`}>
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
            <Lightbulb className="h-4 w-4 text-[#146fc2]" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Apply on site</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Read carefully, note anything specific to your sites, then mark complete to advance
              your credential.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasObjectives ? (
        <div className={`${dash.panel} p-5`}>
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <Target className="h-4 w-4 text-[#146fc2]" aria-hidden />
            Focus areas
          </p>
          <ul className="space-y-3">
            {objectives.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2490ed]"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasChecklist ? (
        <div className={`${dash.panel} p-5`}>
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <ClipboardList className="h-4 w-4 text-[#146fc2]" aria-hidden />
            On-site checklist
          </p>
          <ul className="space-y-2.5">
            {checklist.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-700"
              >
                <span className="mt-0.5 text-slate-400" aria-hidden>
                  □
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
