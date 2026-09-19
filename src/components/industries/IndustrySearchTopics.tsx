import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import type { IndustrySearchTopic } from '@/lib/marketing/industry-track1-topics';

interface IndustrySearchTopicsProps {
  eyebrow: string;
  title: string;
  body: string;
  topics: IndustrySearchTopic[];
}

export function IndustrySearchTopics({ eyebrow, title, body, topics }: IndustrySearchTopicsProps) {
  return (
    <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>{eyebrow}</p>
        <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>{title}</h2>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>{body}</p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {topics.map((topic, index) => (
            <Link
              key={topic.href + topic.title}
              href={topic.href}
              className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-[#2490ed]/35 hover:shadow-[0_18px_40px_-24px_rgba(20,111,194,0.35)]"
            >
              <p className="font-mono text-[11px] font-semibold tracking-[0.16em] text-[#146fc2] uppercase">
                {String(index + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.01em] text-slate-950 group-hover:text-[#146fc2]">
                {topic.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{topic.body}</p>
              <dl className="mt-5 grid gap-4 border-t border-slate-200/80 pt-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                    Job context
                  </dt>
                  <dd className="mt-1.5 leading-relaxed text-slate-600">{topic.jobContext}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                    Practical outcome
                  </dt>
                  <dd className="mt-1.5 leading-relaxed text-slate-600">{topic.outcome}</dd>
                </div>
              </dl>
              <span className="mt-5 text-sm font-semibold text-[#146fc2]">{topic.cta}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
