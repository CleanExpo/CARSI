/**
 * CARSI board / leadership roster (single source of truth for the "Meet the Board" section).
 *
 * Only verifiable people and role titles belong here — do not invent biographical detail.
 * Seeded with the confirmed names from package.json (author + contributor). Add further board
 * members, photos (drop assets in public/board/ and set `photoUrl`), and fuller bios as the
 * founder supplies them.
 */

export interface BoardMember {
  /** Display order (ascending). */
  order: number;
  name: string;
  /** Exact role title. */
  role: string;
  /** Short factual bio. Keep to sourced/known facts; leave brief until confirmed. */
  bio: string;
  /** Path under /public (e.g. "/board/name.jpg"). Optional — a monogram shows if absent. */
  photoUrl?: string;
  /** Optional professional link (LinkedIn, profile page). */
  profileUrl?: string;
}

export const BOARD_MEMBERS: BoardMember[] = [
  {
    order: 1,
    name: 'Philip McGurk',
    role: 'Founder',
    bio: 'Founder of CARSI, leading the institute’s direction across course development, IICRC CEC accreditation and industry partnerships.',
  },
  {
    order: 2,
    name: 'Rana Muzamil',
    role: 'Technical Lead & Manager',
    bio: 'Technical Lead and Manager, responsible for the CARSI platform and the delivery of the online training system.',
  },
];

/** Board members in display order. */
export function getBoardMembers(): BoardMember[] {
  return [...BOARD_MEMBERS].sort((a, b) => a.order - b.order);
}

/** First-initial + surname monogram for members without a photo. */
export function boardMemberMonogram(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
