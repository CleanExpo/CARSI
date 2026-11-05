'use client';

import {
  CheckCircle2,
  Circle,
  ClipboardCopy,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  coachingCard,
  coachingCardTitle,
  coachingEyebrow,
  coachingMuted,
  coachingPage,
  coachingPrimaryBtn,
  coachingSecondaryBtn,
  coachingAlertText,
} from '@/components/coaching-portal/coaching-ui';
import { useCoachingPortal } from '@/components/coaching-portal/CoachingPortalContext';
import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';
import { marketingPackErrorFromResponse } from '@/lib/coaching-portal/marketing-pack/api-messages';
import { MARKETING_PACK_DOWNLOADS } from '@/lib/coaching-portal/marketing-pack/downloads';
import type {
  ChecklistItem,
  SiteReview,
  SocialCalendar,
  TradeVoice,
} from '@/lib/coaching-portal/marketing-pack/types';
import {
  marketingFixImpactBadgeClass,
  marketingFixImpactLabel,
} from '@/lib/coaching-portal/marketing-pack/ui-labels';

type Pack = {
  id: string;
  review: SiteReview;
  checklist: ChecklistItem[];
  calendar: SocialCalendar;
  voice: TradeVoice;
  generatedAt: string;
};

function MarketingPackLoadingSkeleton() {
  return (
    <div className="mt-10 space-y-4" aria-busy="true" aria-label="Loading marketing pack">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`${coachingCard} animate-pulse space-y-3`}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="h-4 w-40 rounded bg-white/10" />
          <div className="h-3 w-full max-w-md rounded bg-white/[0.06]" />
          <div className="h-3 w-5/6 rounded bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function PackSummaryStrip({
  review,
  checklist,
  calendar,
}: {
  review: SiteReview;
  checklist: ChecklistItem[];
  calendar: SocialCalendar;
}) {
  const checksPassed = review.checks.filter((c) => c.passed).length;
  const checklistDone = checklist.filter((i) => i.done).length;
  const stats = [
    { label: 'Priority fixes', value: String(review.fixes.length) },
    {
      label: 'Site checks passed',
      value: review.checks.length ? `${checksPassed}/${review.checks.length}` : '—',
    },
    { label: 'Checklist done', value: `${checklistDone}/${checklist.length}` },
    { label: 'Social drafts', value: String(calendar.posts.length) },
  ];

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#0c1424] to-[#0a101c] px-4 py-3 ring-1 ring-white/[0.04]"
        >
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            {s.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-white tabular-nums">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

export function CoachingMarketingPackPage() {
  const { access } = useCoachingPortal();
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [copiedDay, setCopiedDay] = useState<number | null>(null);

  useEffect(() => {
    void fetch('/api/coaching/portal/marketing-pack')
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { detail?: string };
          setError(marketingPackErrorFromResponse(res.status, body));
          return;
        }
        const data = (await res.json()) as { pack: Pack | null };
        setPack(data.pack);
        setError('');
      })
      .catch(() => setError('Could not load your marketing pack.'))
      .finally(() => setLoading(false));
  }, []);

  async function build() {
    setBuilding(true);
    setError('');
    setStatusMessage('Building your pack — reading your website and drafting posts…');
    try {
      const res = await fetch('/api/coaching/portal/marketing-pack', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { pack?: Pack | null; detail?: string };
      if (!res.ok) {
        setError(marketingPackErrorFromResponse(res.status, data));
        setStatusMessage('');
      } else {
        setPack(data.pack ?? null);
        setStatusMessage('Your marketing pack is ready.');
      }
    } catch {
      setError('Could not build your pack. Check your connection and try again.');
      setStatusMessage('');
    } finally {
      setBuilding(false);
    }
  }

  async function copyCaption(day: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDay(day);
      window.setTimeout(() => setCopiedDay(null), 2000);
    } catch {
      setError('Could not copy to clipboard.');
    }
  }

  const posts = useMemo(
    () => (pack ? (showAllPosts ? pack.calendar.posts : pack.calendar.posts.slice(0, 7)) : []),
    [pack, showAllPosts]
  );

  return (
    <div className={coachingPage}>
      <p className={coachingEyebrow}>Marketing pack</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
        Your website, Google and social plan
      </h1>
      <p className={`mt-2 max-w-2xl ${coachingMuted}`}>
        Built from your assessment and business profile: a plain-English review of your website and
        Google Business Profile, a local-search checklist and 30 days of draft posts in your voice.
        Your coach approves each fix before it joins your action list.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3" aria-live="polite" aria-atomic="true">
        <button
          type="button"
          className={coachingPrimaryBtn}
          disabled={!access.canEdit || building}
          aria-busy={building}
          onClick={() => void build()}
        >
          {building ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : pack ? (
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" aria-hidden />
          )}
          {building ? 'Building your pack…' : pack ? 'Rebuild my pack' : 'Build my marketing pack'}
        </button>
        {pack ? (
          <span className="text-xs text-slate-500">
            Built {new Date(pack.generatedAt).toLocaleString('en-AU')}
          </span>
        ) : null}
        {!access.canEdit ? (
          <span className={`text-xs ${coachingMuted}`}>
            Available with an active coaching plan.
          </span>
        ) : null}
      </div>
      {statusMessage && !error ? (
        <p className={`mt-3 text-xs text-sky-300/90`}>{statusMessage}</p>
      ) : null}
      {building ? (
        <p className={`mt-3 text-xs ${coachingMuted}`}>
          This usually takes under a minute while we read your website and draft your posts.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={`mt-4 ${coachingAlertText}`}>
          {error}
        </p>
      ) : null}

      {loading ? (
        <MarketingPackLoadingSkeleton />
      ) : !pack ? (
        <section className={`mt-8 ${coachingCard}`}>
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-sky-400/80" aria-hidden />
            <div>
              <h2 className={coachingCardTitle}>No pack yet</h2>
              <p className={`mt-1 ${coachingMuted}`}>
                Check your website and Google Business Profile links are in your{' '}
                <Link
                  href={coachingPortalPath('/onboarding/profile')}
                  className="text-sky-400 hover:underline"
                >
                  business profile
                </Link>
                , then build your pack.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <PackSummaryStrip
            review={pack.review}
            checklist={pack.checklist}
            calendar={pack.calendar}
          />

          <div className="mt-8 space-y-6">
            <section className={coachingCard} aria-labelledby="mp-downloads">
              <h2 id="mp-downloads" className={coachingCardTitle}>
                Your resources
              </h2>
              <ul className="mt-4 divide-y divide-white/[0.06]">
                {MARKETING_PACK_DOWNLOADS.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{d.title}</p>
                      <p className={`mt-1 ${coachingMuted}`}>{d.description}</p>
                    </div>
                    <a
                      href={`/api/coaching/portal/marketing-pack/download?item=${d.id}`}
                      className={`${coachingSecondaryBtn} !min-h-9 shrink-0 gap-1.5 !px-3`}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            {pack.review.checks.length > 0 ? (
              <section className={coachingCard} aria-labelledby="mp-checks">
                <h2 id="mp-checks" className={coachingCardTitle}>
                  What we checked
                </h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {pack.review.checks.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                    >
                      {c.passed ? (
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                          aria-hidden
                        />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                      )}
                      <span className="text-sm text-slate-200">{c.label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className={coachingCard} aria-labelledby="mp-review">
              <h2 id="mp-review" className={coachingCardTitle}>
                Website and Google review
              </h2>
              <p className={`mt-1 ${coachingMuted}`}>{pack.review.summary}</p>
              {pack.review.fixes.length > 0 ? (
                <ol className="mt-5 space-y-4">
                  {pack.review.fixes.map((f) => (
                    <li
                      key={f.id}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.1]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-sky-300">{f.rank}</span>
                        <p className="text-sm font-semibold text-white">{f.title}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1 ring-inset ${marketingFixImpactBadgeClass(f.impact)}`}
                        >
                          {marketingFixImpactLabel(f.impact)}
                        </span>
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                          {f.area === 'website' ? 'Website' : 'Google profile'}
                        </span>
                      </div>
                      <p className={`mt-2 ${coachingMuted}`}>{f.why}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-200">
                        <span className="font-semibold text-slate-300">How: </span>
                        {f.how}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : null}
              <p className={`mt-4 text-xs ${coachingMuted}`}>
                Each fix is sent to your coach as a proposed action. Approved fixes appear in{' '}
                <Link
                  href={coachingPortalPath('/actions')}
                  className="text-sky-400 hover:underline"
                >
                  Actions
                </Link>
                .
              </p>
            </section>

            <section className={coachingCard} aria-labelledby="mp-checklist">
              <h2 id="mp-checklist" className={coachingCardTitle}>
                Local-search checklist
              </h2>
              <ul className="mt-4 space-y-3">
                {pack.checklist.map((i) => (
                  <li key={i.id} className="flex gap-3">
                    {i.done ? (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                        aria-hidden
                      />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{i.label}</p>
                      <p className={coachingMuted}>{i.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className={coachingCard} aria-labelledby="mp-calendar">
              <h2 id="mp-calendar" className={coachingCardTitle}>
                30-day social calendar
              </h2>
              <p className={`mt-1 ${coachingMuted}`}>
                {pack.calendar.tradeMatched === false
                  ? 'We do not have wording for your trade yet, so these drafts use general trade wording. Your coach can help you tailor them.'
                  : `Drafts written for ${pack.voice.trade || 'your trade'}.`}{' '}
                Edit them to sound like you and add your own job photos before posting.
              </p>
              <ol className="mt-5 space-y-3">
                {posts.map((p) => (
                  <li
                    key={p.day}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">Day {p.day}</span> ·{' '}
                        {new Date(`${p.date}T00:00:00`).toLocaleDateString('en-AU', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        · {p.theme}
                      </p>
                      <button
                        type="button"
                        className={`${coachingSecondaryBtn} !min-h-8 gap-1 !px-2.5 !text-xs`}
                        onClick={() => void copyCaption(p.day, p.caption)}
                      >
                        <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                        {copiedDay === p.day ? 'Copied' : 'Copy caption'}
                      </button>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-slate-100">
                      {p.caption}
                    </p>
                    {p.hashtags.length > 0 ? (
                      <p className="mt-1.5 text-xs text-sky-300/80">{p.hashtags.join(' ')}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
              {pack.calendar.posts.length > 7 ? (
                <button
                  type="button"
                  className={`mt-4 ${coachingSecondaryBtn}`}
                  onClick={() => setShowAllPosts((v) => !v)}
                >
                  {showAllPosts ? 'Show first week' : `Show all ${pack.calendar.posts.length} days`}
                </button>
              ) : null}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
