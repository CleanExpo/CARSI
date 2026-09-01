import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
} from '@/components/landing/public-shell-width';
import type { IndustrySearchTopic } from '@/lib/marketing/industry-track1-topics';
import {
  marketingPanel,
  marketingPanelHover,
  marketingTextMuted,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';

interface IndustrySearchTopicsProps {
  eyebrow: string;
  title: string;
  body: string;
  topics: IndustrySearchTopic[];
}

export function IndustrySearchTopics({ eyebrow, title, body, topics }: IndustrySearchTopicsProps) {
  return (
    <section className="py-16 md:py-24">
      <div className="rounded-[2rem] border border-[#2490ed]/12 bg-[linear-gradient(145deg,#f1f8ff_0%,#f8fbff_46%,#f4fbf8_100%)] px-5 py-8 shadow-[0_28px_80px_-58px_rgba(36,144,237,0.5)] sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className={LANDING_EYEBROW_CLASS}>{eyebrow}</p>
            <h2 className={`mt-4 ${LANDING_DISPLAY_H2_CLASS}`}>{title}</h2>
          </div>
          <p className={`max-w-2xl lg:justify-self-end ${LANDING_LEAD_CLASS}`}>{body}</p>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-2">
          {topics.map((topic, index) => (
            <Link
              key={topic.href + topic.title}
              href={topic.href}
              className={`group flex h-full flex-col p-5 sm:p-6 ${marketingPanel} ${marketingPanelHover}`}
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-[11px] font-semibold tracking-[0.16em] text-[#146fc2] uppercase">
                  Search path {String(index + 1).padStart(2, '0')}
                </p>
                <span className="h-px flex-1 bg-gradient-to-r from-[#2490ed]/30 to-transparent" />
              </div>
              <h3
                className={`mt-4 font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.015em] ${marketingTextStrong}`}
              >
                {topic.title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${marketingTextMuted}`}>{topic.body}</p>
              <dl className="mt-5 grid gap-4 border-t border-slate-200/80 pt-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                    Job context
                  </dt>
                  <dd className={`mt-1.5 leading-relaxed ${marketingTextMuted}`}>
                    {topic.jobContext}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                    Practical outcome
                  </dt>
                  <dd className={`mt-1.5 leading-relaxed ${marketingTextMuted}`}>
                    {topic.outcome}
                  </dd>
                </div>
              </dl>
              <span className="mt-5 text-sm font-semibold text-[#146fc2] group-hover:underline">
                {topic.cta}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
