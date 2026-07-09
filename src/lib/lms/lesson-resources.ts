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
 * GP-486 adds a third kind — an inline slide deck viewer (shape matches
 * `data/seed/slides/*.json`):
 *
 *   { "kind": "slides", "label": "Lesson slides",
 *     "decks": [{ "module": "…",
 *       "slides": [{ "title": "…", "bullets": ["…"], "speakerNotes": "…" }] }] }
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

export interface SlideItem {
  title: string;
  bullets: string[];
  speakerNotes: string;
}

export interface SlideDeck {
  module: string;
  slides: SlideItem[];
}

export interface SlidesResource {
  kind: 'slides';
  label?: string;
  /** Never set — declared so the union stays compatible with `{ url?: string }` consumers. */
  url?: undefined;
  decks: SlideDeck[];
}

export interface LinkResource {
  kind?: undefined;
  label?: string;
  url?: string;
}

export type LessonResource = LinkResource | FlashcardResource | SlidesResource;

export function isFlashcardResource(
  resource: LessonResource
): resource is FlashcardResource {
  return (
    (resource as FlashcardResource).kind === 'flashcards' &&
    Array.isArray((resource as FlashcardResource).cards) &&
    (resource as FlashcardResource).cards.length > 0
  );
}

export function isSlidesResource(
  resource: LessonResource
): resource is SlidesResource {
  return (
    (resource as SlidesResource).kind === 'slides' &&
    Array.isArray((resource as SlidesResource).decks) &&
    (resource as SlidesResource).decks.length > 0
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

function parseSlides(raw: unknown): SlideItem[] {
  if (!Array.isArray(raw)) return [];
  const slides: SlideItem[] = [];
  for (const slide of raw) {
    if (!slide || typeof slide !== 'object') continue;
    const { title, bullets, speakerNotes } = slide as {
      title?: unknown;
      bullets?: unknown;
      speakerNotes?: unknown;
    };
    if (typeof title !== 'string' || !title.trim()) continue;
    const cleanBullets = Array.isArray(bullets)
      ? bullets.filter((b): b is string => typeof b === 'string' && Boolean(b.trim()))
      : [];
    slides.push({
      title,
      bullets: cleanBullets,
      speakerNotes: typeof speakerNotes === 'string' ? speakerNotes : '',
    });
  }
  return slides;
}

function parseSlideDecks(raw: unknown): SlideDeck[] {
  if (!Array.isArray(raw)) return [];
  const decks: SlideDeck[] = [];
  for (const deck of raw) {
    if (!deck || typeof deck !== 'object') continue;
    const { module: moduleName, slides } = deck as { module?: unknown; slides?: unknown };
    const cleanSlides = parseSlides(slides);
    if (cleanSlides.length === 0) continue;
    decks.push({
      module: typeof moduleName === 'string' && moduleName.trim() ? moduleName : 'Slides',
      slides: cleanSlides,
    });
  }
  return decks;
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
    const o = item as {
      kind?: unknown;
      label?: unknown;
      url?: unknown;
      cards?: unknown;
      decks?: unknown;
    };
    if (o.kind === 'slides') {
      const decks = parseSlideDecks(o.decks);
      if (decks.length > 0) {
        out.push({
          kind: 'slides',
          label: typeof o.label === 'string' ? o.label : 'Lesson slides',
          decks,
        });
      }
      continue;
    }
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
