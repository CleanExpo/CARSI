import type {
  ChecklistItem,
  SiteReview,
  SocialCalendar,
  TradeVoice,
} from '@/lib/coaching-portal/marketing-pack/types';

export type StoredMarketingPackRow = {
  id: string;
  calendarSource: string;
  reviewJson: string;
  checklistJson: string;
  calendarJson: string;
  voiceJson: string;
  createdAt: Date;
};

export type ParsedStoredMarketingPack = {
  id: string;
  calendarSource: string;
  review: SiteReview;
  checklist: ChecklistItem[];
  calendar: SocialCalendar;
  voice: TradeVoice;
  generatedAt: string;
};

/** Returns null when any JSON field is corrupt — callers treat as "no pack". */
export function parseStoredMarketingPackRow(
  row: StoredMarketingPackRow
): ParsedStoredMarketingPack | null {
  try {
    return {
      id: row.id,
      calendarSource: row.calendarSource,
      review: JSON.parse(row.reviewJson) as SiteReview,
      checklist: JSON.parse(row.checklistJson) as ChecklistItem[],
      calendar: JSON.parse(row.calendarJson) as SocialCalendar,
      voice: JSON.parse(row.voiceJson) as TradeVoice,
      generatedAt: row.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}
