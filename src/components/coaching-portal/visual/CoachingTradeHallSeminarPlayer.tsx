'use client';

import type { TradeHallSeminar } from '@/lib/coaching-portal/trade-hall-seminar';
import { youtubeNocookieEmbedUrl } from '@/lib/media/youtube-embed';

import {
  coachingCard,
  coachingCardTitle,
  coachingMuted,
} from '@/components/coaching-portal/coaching-ui';

type Props = {
  seminar: TradeHallSeminar;
  className?: string;
};

export function CoachingTradeHallSeminarPlayer({ seminar, className = '' }: Props) {
  const embed = youtubeNocookieEmbedUrl(seminar.youtubeWatchUrl);
  return (
    <article
      className={`${coachingCard} ${className}`}
      data-testid={`coaching-tradehall-seminar-${seminar.id}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={coachingCardTitle}>{seminar.title}</h3>
        <span className="text-xs font-medium text-sky-400/90">{seminar.durationLabel}</span>
      </div>
      <p className={`mt-2 ${coachingMuted}`}>{seminar.description}</p>
      {embed ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/40">
          <div className="relative aspect-video w-full">
            <iframe
              title={seminar.title}
              src={embed}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-amber-200/90">This seminar link is not playable yet.</p>
      )}
    </article>
  );
}
