import type { TradeVoice } from './types';

/** Minimum profile signal before we spend a site fetch on a marketing pack build. */
export function hasMinimumMarketingVoice(voice: TradeVoice): boolean {
  const trade = voice.trade?.trim() ?? '';
  const business = voice.businessName?.trim() ?? '';
  return trade.length > 0 || business.length > 0;
}

export const MARKETING_PROFILE_REQUIRED_MESSAGE =
  'Fill in your business profile first so the pack is written for your trade and town.';
