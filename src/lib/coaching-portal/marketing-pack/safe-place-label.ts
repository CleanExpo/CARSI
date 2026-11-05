/** Member place names for checklist copy — factual, still claim-filtered. */
import { findComplianceIssues } from './compliance';
import { primaryTown } from './site-review';
import type { TradeVoice } from './types';

export function safeTownLabel(rawVoice: Pick<TradeVoice, 'town'>): string {
  const town = primaryTown(rawVoice.town ?? '');
  if (!town) return 'your town';
  return findComplianceIssues(town).length === 0 ? town : 'your town';
}
