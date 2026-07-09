/**
 * Shared types for the course-asset-kit engine (GP-488).
 *
 * The engine consolidates the one-off authoring scripts (thumbnails, voiceover,
 * flashcards, slides, audio-overview, quizzes) behind ONE planning + scaffolding
 * tool so every new CARSI course ships its full media kit by default.
 *
 * Slice 1 is deterministic-only: it PLANS (what kit pieces exist vs missing) and
 * SCAFFOLDS extractive-or-empty asset files from already-delivered lesson content.
 * It NEVER invents factual content and NEVER spends API credits — the spend
 * generators (thumbnails/voiceover/video) remain the specialised scripts, run
 * after a human truth-gate authoring pass fills the scaffolds in.
 */

/** The status banner stamped on every generated scaffold file. */
export const SCAFFOLD_STATUS = 'scaffold — requires truth-gate authoring pass' as const;

/** The kit pieces the engine tracks for every course. */
export type KitPieceId =
  | 'flashcards'
  | 'slides'
  | 'audio-script'
  | 'quiz'
  | 'image-briefs'
  | 'lesson-resources';

/** A course lesson as the engine consumes it (subset of the catalogue lesson). */
export interface KitLesson {
  id: string;
  title: string;
  /** Delivered lesson HTML. The only source the extractors read. */
  contentBody: string | null;
  /** Raw lesson resources (unknown JSON in the catalogue). */
  resources?: unknown;
}

/** A course module as the engine consumes it. */
export interface KitModule {
  title: string;
  lessons: KitLesson[];
}

/** A course as the engine consumes it (subset of the catalogue course). */
export interface KitCourse {
  slug: string;
  title: string;
  /**
   * cecHours is licence-critical. `undefined` means the key is ABSENT from the
   * catalogue entry (a hard refusal — the engine will not scaffold it). `null`
   * means legacy/duration-derived (loud warning). `0` or a positive number is an
   * explicit founder-set value (OK).
   */
  cecHours?: number | null;
  modules: KitModule[];
}

// ---------------------------------------------------------------------------
// Scaffold output shapes (mirror data/seed/{flashcards,slides,audio-overview}/*)
// ---------------------------------------------------------------------------

export interface ScaffoldCard {
  front: string;
  back: string;
  sourceLessonId: string;
}

export interface ScaffoldFlashcardDeck {
  module: string;
  cards: ScaffoldCard[];
}

export interface FlashcardsScaffold {
  status: typeof SCAFFOLD_STATUS;
  courseSlug: string;
  version: 1;
  decks: ScaffoldFlashcardDeck[];
}

export interface ScaffoldSlide {
  title: string;
  bullets: string[];
  speakerNotes: '';
  sourceLessonId: string;
}

export interface ScaffoldSlideDeck {
  module: string;
  slides: ScaffoldSlide[];
}

export interface SlidesScaffold {
  status: typeof SCAFFOLD_STATUS;
  courseSlug: string;
  version: 1;
  decks: ScaffoldSlideDeck[];
}

export interface ScaffoldAudioSegment {
  module: string;
  /** Extractive topic prompt built from delivered module/lesson titles. */
  topicPrompt: string;
  /** Left empty — the two-voice script is authored in the truth-gate pass. */
  text: '';
}

export interface AudioScriptScaffold {
  status: typeof SCAFFOLD_STATUS;
  courseSlug: string;
  version: 1;
  segments: ScaffoldAudioSegment[];
}

export interface ScaffoldQuizQuestion {
  sourceLessonId: string;
  /** Never invented — authored in the truth-gate pass. */
  questionText: '';
  options: [];
  correctIndex: null;
  points: 1;
}

export interface QuizScaffold {
  status: typeof SCAFFOLD_STATUS;
  courseSlug: string;
  version: 1;
  quizzes: Array<{
    quizId: '';
    title: '';
    passPercentage: 80;
    attemptsAllowed: 3;
    questions: ScaffoldQuizQuestion[];
  }>;
}

export interface ScaffoldImageBrief {
  module: string;
  sourceLessonId: string;
  /** Extractive context from delivered lesson text. */
  context: string;
  /** Prefilled house style — safe, non-factual. */
  style: string;
  /** Left empty — the image prompt is authored in the truth-gate pass. */
  prompt: '';
}

export interface ImageBriefsScaffold {
  status: typeof SCAFFOLD_STATUS;
  courseSlug: string;
  version: 1;
  briefs: ScaffoldImageBrief[];
}
