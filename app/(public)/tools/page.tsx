import type { Metadata } from 'next';
import { ArrowUpRight, Sparkles, Video } from 'lucide-react';

import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import {
  marketingBody,
  marketingBodySm,
  marketingHeading,
  marketingIconWrap,
  marketingPanel,
  marketingTextMuted,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';

export const metadata: Metadata = {
  title: 'Recommended Tools | CARSI',
  description:
    'Tools Phill McGurk and the CARSI team use and recommend for cleaning and restoration businesses — from AI video production to the software that runs the day-to-day.',
};

type RecommendedTool = {
  name: string;
  category: string;
  href: string;
  affiliate: boolean;
  summary: string;
  useFor: string;
};

const tools: RecommendedTool[] = [
  {
    name: 'Higgsfield',
    category: 'AI video production',
    href: 'https://higgsfield.ai/?ref=seedance_TrK3lx3Dduo',
    affiliate: true,
    summary:
      'AI video generation for marketing clips, social content and training visuals — turn a prompt or a still into finished footage without a film crew.',
    useFor:
      'Marketing reels, before-and-after job showcases, and short explainer clips for your cleaning or restoration business.',
  },
];

export default function RecommendedToolsPage() {
  return (
    <MarketingPageShell>
      <MarketingSectionHeader
        eyebrow="Recommended tools"
        title="Tools Phill actually uses"
        body="A short, honest list of the software and services the CARSI team relies on. We only list tools we use ourselves — no filler, no pay-to-list."
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {tools.map((tool) => (
          <a
            key={tool.name}
            href={tool.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={`group flex flex-col gap-4 p-6 transition ${marketingPanel} hover:border-blue-400/40`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={marketingIconWrap}>
                  <Video className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className={`text-lg ${marketingHeading}`}>{tool.name}</h2>
                  <p className={`text-xs uppercase tracking-wide ${marketingTextMuted}`}>
                    {tool.category}
                  </p>
                </div>
              </div>
              <ArrowUpRight
                className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-blue-500 dark:text-white/40"
                aria-hidden
              />
            </div>

            <p className={marketingBody}>{tool.summary}</p>

            <p className={marketingBodySm}>
              <span className={marketingTextStrong}>Use it for: </span>
              {tool.useFor}
            </p>

            {tool.affiliate ? (
              <p className={`mt-auto flex items-center gap-1.5 pt-2 text-xs ${marketingTextMuted}`}>
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Affiliate link — CARSI may earn a commission at no extra cost to you.
              </p>
            ) : null}
          </a>
        ))}
      </div>

      <section
        className={`mt-10 p-5 ${marketingPanel}`}
        aria-label="Affiliate disclosure"
      >
        <p className={marketingBodySm}>
          <span className={marketingTextStrong}>A note on the links above. </span>
          Some links on this page are affiliate links. If you sign up through one,
          CARSI may earn a commission — it never costs you anything extra, and it
          never changes what we recommend. We only list tools we use ourselves.
        </p>
      </section>
    </MarketingPageShell>
  );
}
