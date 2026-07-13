/**
 * CCW/CARSI attendance foundation (unit A) — PURE reconcile/match precedence.
 *
 * Used by the admin reconcile + merge-duplicates surfaces to find candidate rows
 * for a person. Matching is MOST-SPECIFIC-FIRST: normalizedEmail exact →
 * normalizedBusiness exact → normalizedName exact. The comparisons run through
 * the SAME `normalize` helpers that produced the stored columns, so a write and
 * a match can never drift apart.
 *
 * The critical invariant (§ MATCH/RECONCILE, AC#4): only a UNIQUE email-exact
 * match may be auto-applied (`autoTick`). A business/name match — even a single
 * one — is ambiguous and MUST be surfaced for an admin decision, never
 * auto-ticked.
 */
import { normalizeBusiness, normalizeEmail, normalizeName } from './normalize';

export interface MatchableSignIn {
  id: string;
  normalizedEmail: string;
  normalizedBusiness: string | null;
  normalizedName: string;
}

export interface MatchQuery {
  email?: string | null;
  businessName?: string | null;
  fullName?: string | null;
}

export type MatchVia = 'email' | 'business' | 'name' | 'none';

export interface MatchResult {
  via: MatchVia;
  /** ids of matching sign-ins in the most-specific tier that produced a hit. */
  matches: string[];
  /**
   * TRUE only for a UNIQUE email-exact match — the sole case a caller may
   * auto-tick a day. Every business/name match is ambiguous (autoTick=false).
   */
  autoTick: boolean;
}

export function matchSignIn(query: MatchQuery, pool: MatchableSignIn[]): MatchResult {
  const email = query.email ? normalizeEmail(query.email) : '';
  const business = query.businessName ? normalizeBusiness(query.businessName) : '';
  const name = query.fullName ? normalizeName(query.fullName) : '';

  if (email) {
    const emailMatches = pool.filter((s) => s.normalizedEmail === email);
    if (emailMatches.length > 0) {
      return {
        via: 'email',
        matches: emailMatches.map((s) => s.id),
        // Unique email is the login identity; more than one is a data fault, not
        // an auto-tick candidate.
        autoTick: emailMatches.length === 1,
      };
    }
  }

  if (business) {
    const businessMatches = pool.filter((s) => (s.normalizedBusiness ?? '') === business);
    if (businessMatches.length > 0) {
      return { via: 'business', matches: businessMatches.map((s) => s.id), autoTick: false };
    }
  }

  if (name) {
    const nameMatches = pool.filter((s) => s.normalizedName === name);
    if (nameMatches.length > 0) {
      return { via: 'name', matches: nameMatches.map((s) => s.id), autoTick: false };
    }
  }

  return { via: 'none', matches: [], autoTick: false };
}
