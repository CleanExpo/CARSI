import { describe, expect, it } from 'vitest';

import { tradeHallSeminarsForChapter } from '@/lib/coaching-portal/trade-hall-seminar';
import { youtubeNocookieEmbedUrl } from '@/lib/media/youtube-embed';

describe('TradeHall seminars (GP-636)', () => {
  it('lists seminars for any chapter by default', () => {
    expect(tradeHallSeminarsForChapter('carsi-business-coaching').length).toBeGreaterThan(0);
  });

  it('embeds YouTube watch URLs', () => {
    const url = 'https://www.youtube.com/watch?v=ivoWtiCSDx8';
    expect(youtubeNocookieEmbedUrl(url)).toBe(
      'https://www.youtube-nocookie.com/embed/ivoWtiCSDx8?rel=0&modestbranding=1'
    );
  });
});
