/**
 * Lesson resource types shared by the lesson detail API route and the LMS
 * player components.
 *
 * Historically a lesson resource was `{ label?, url? }` (a downloadable
 * link). GP-485 adds a second kind — an inline flashcard study deck:
 *
 *   { "kind": "flashcards", "label": "Study flashcards",
 *     "cards": [{ "front": "…", "back": "…" }] }
 *
 * Plain link resources carry no `kind` so existing data keeps working, and
 * `extractQuizIdFromLesson` (which only reads `url`) is unaffected.
 */

export interface FlashcardCard {
  front: string;
  back: string;
}

export interface FlashcardResource {
  kind: 'flashcards';
  label?: string;
  /** Never set — declared so the union stays compatible with `{ url?: string }` consumers. */
  url?: undefined;
  cards: FlashcardCard[];
}

export interface LinkResource {
  kind?: undefined;
  label?: string;
  url?: string;
}

export type LessonResource = LinkResource | FlashcardResource;

export function isFlashcardResource(
  resource: LessonResource
): resource is FlashcardResource {
  return (
    (resource as FlashcardResource).kind === 'flashcards' &&
    Array.isArray((resource as FlashcardResource).cards) &&
    (resource as FlashcardResource).cards.length > 0
  );
}

function parseFlashcards(raw: unknown): FlashcardCard[] {
  if (!Array.isArray(raw)) return [];
  const cards: FlashcardCard[] = [];
  for (const card of raw) {
    if (!card || typeof card !== 'object') continue;
    const { front, back } = card as { front?: unknown; back?: unknown };
    if (typeof front === 'string' && front.trim() && typeof back === 'string' && back.trim()) {
      cards.push({ front, back });
    }
  }
  return cards;
}

/**
 * Sanitise the free-form `LmsLesson.resources` Json column into the typed
 * resource list the client understands. Unknown shapes are dropped rather
 * than passed through.
 */
export function parseLessonResources(raw: unknown): LessonResource[] {
  if (!Array.isArray(raw)) return [];
  const out: LessonResource[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as { kind?: unknown; label?: unknown; url?: unknown; cards?: unknown };
    if (o.kind === 'flashcards') {
      const cards = parseFlashcards(o.cards);
      if (cards.length > 0) {
        out.push({
          kind: 'flashcards',
          label: typeof o.label === 'string' ? o.label : 'Study flashcards',
          cards,
        });
      }
      continue;
    }
    if (typeof o.url === 'string' && o.url) {
      out.push({
        url: o.url,
        label: typeof o.label === 'string' ? o.label : 'Resource',
      });
    }
  }
  return out;
}
