export type CoursePurchaseMode = 'self' | 'team';

export const MIN_TEAM_SEATS = 2;
export const MAX_TEAM_SEATS = 100;

export function parsePurchaseMode(value: unknown): CoursePurchaseMode {
  return value === 'team' ? 'team' : 'self';
}

export function parseTeamSeatCount(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

export function validateTeamSeatCount(seats: number): string | null {
  if (seats < MIN_TEAM_SEATS) {
    return `Team purchases need at least ${MIN_TEAM_SEATS} seats (including you).`;
  }
  if (seats > MAX_TEAM_SEATS) {
    return `Team purchases are limited to ${MAX_TEAM_SEATS} seats per order.`;
  }
  return null;
}
