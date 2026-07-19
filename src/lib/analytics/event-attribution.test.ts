import { describe, expect, it } from 'vitest';

import {
  ATTRIBUTION_CAMPAIGN_ID,
  aggregateAttributionEvents,
  buildAttributionSource,
  parseAttributionJourneyId,
  type AttributionEventRecord,
} from './event-attribution';

describe('buildAttributionSource', () => {
  it.each([
    ['melbourne', 'melbourne_qr'],
    ['melbourne', 'melbourne_email'],
    ['sydney', 'sydney_qr'],
    ['sydney', 'sydney_email'],
  ])('accepts the stable %s source %s', (eventSlug, sourceId) => {
    expect(buildAttributionSource(eventSlug, sourceId, ATTRIBUTION_CAMPAIGN_ID)).toEqual({
      campaignId: ATTRIBUTION_CAMPAIGN_ID,
      sourceId,
      eventSlug,
    });
  });

  it('keeps an omitted campaign and source unattributed', () => {
    expect(buildAttributionSource('melbourne', undefined, undefined)).toBeNull();
  });

  it.each([
    ['melbourne', 'sydney_qr', ATTRIBUTION_CAMPAIGN_ID],
    ['sydney', 'melbourne_email', ATTRIBUTION_CAMPAIGN_ID],
    ['melbourne', 'facebook', ATTRIBUTION_CAMPAIGN_ID],
    ['brisbane', 'melbourne_qr', ATTRIBUTION_CAMPAIGN_ID],
    ['melbourne', ' MELBOURNE_QR ', ATTRIBUTION_CAMPAIGN_ID],
    ['melbourne', 'melbourne_qr', 'wrong_campaign'],
    ['melbourne', 'melbourne_qr', undefined],
    ['melbourne', undefined, ATTRIBUTION_CAMPAIGN_ID],
  ])('rejects malformed or event-mismatched input: %s / %s / %s', (eventSlug, sourceId, campaignId) => {
    expect(() => buildAttributionSource(eventSlug, sourceId, campaignId)).toThrow(
      'INVALID_ATTRIBUTION_SOURCE',
    );
  });
});

describe('parseAttributionJourneyId', () => {
  it('accepts a canonical UUID and rejects other cookie content', () => {
    expect(parseAttributionJourneyId('44444444-4444-4444-8444-444444444444')).toBe(
      '44444444-4444-4444-8444-444444444444',
    );
    expect(parseAttributionJourneyId('not-a-uuid')).toBeNull();
    expect(parseAttributionJourneyId('')).toBeNull();
  });
});

describe('aggregateAttributionEvents', () => {
  it('counts unique journeys per stage and revenue by source without double-counting retries', () => {
    const rows: AttributionEventRecord[] = [
      event('journey-a', 'melbourne_qr', 'event_registration'),
      event('journey-a', 'melbourne_qr', 'course_view', { courseSlug: 'course-a' }),
      event('journey-a', 'melbourne_qr', 'course_view', { courseSlug: 'course-a' }),
      event('journey-a', 'melbourne_qr', 'checkout_started', { courseSlug: 'course-a' }),
      event('journey-a', 'melbourne_qr', 'purchase', {
        courseSlug: 'course-a',
        revenueCents: 9900,
        transactionId: 'cs_1',
      }),
      event('journey-a', 'melbourne_qr', 'purchase', {
        courseSlug: 'course-a',
        revenueCents: 9900,
        transactionId: 'cs_1',
      }),
      event('journey-b', 'sydney_email', 'event_registration'),
      event('journey-b', 'sydney_email', 'subscription', {
        revenueCents: 29500,
        transactionId: 'sub_1',
      }),
    ];

    expect(aggregateAttributionEvents(rows)).toEqual({
      campaignId: ATTRIBUTION_CAMPAIGN_ID,
      totals: {
        event_registration: 2,
        course_view: 1,
        checkout_started: 1,
        purchase: 1,
        subscription: 1,
        revenueAud: 394,
      },
      sources: [
        {
          sourceId: 'melbourne_qr',
          event_registration: 1,
          course_view: 1,
          checkout_started: 1,
          purchase: 1,
          subscription: 0,
          revenueAud: 99,
        },
        {
          sourceId: 'sydney_email',
          event_registration: 1,
          course_view: 0,
          checkout_started: 0,
          purchase: 0,
          subscription: 1,
          revenueAud: 295,
        },
      ],
    });
  });
});

function event(
  journeyId: string,
  sourceId: AttributionEventRecord['sourceId'],
  stage: AttributionEventRecord['stage'],
  extra: Partial<AttributionEventRecord> = {},
): AttributionEventRecord {
  return {
    journeyId,
    campaignId: ATTRIBUTION_CAMPAIGN_ID,
    sourceId,
    eventSlug: sourceId.startsWith('melbourne') ? 'melbourne' : 'sydney',
    stage,
    courseSlug: null,
    revenueCents: null,
    transactionId: null,
    ...extra,
  };
}
