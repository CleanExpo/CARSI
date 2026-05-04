export type ProgressShareType = 'lesson' | 'module' | 'course';

export type ProgressSharePayload = {
  type: ProgressShareType;
  courseTitle: string;
  lessonTitle?: string | null;
  moduleTitle?: string | null;
  moduleNumber?: number | null;
};

export type ProgressShareDraft = {
  title: string;
  subtitle: string;
  copyText: string;
};

/** Official site for CTAs in shared posts (organic traffic). */
export const CARSI_SITE_URL = 'https://carsi.com.au/';

const TAGS = {
  base: ['#restorationtraining', '#professionaldevelopment', '#continuingeducation'],
  iicrc: ['#iicrc', '#restorationindustry', '#carsi'],
} as const;

function normalizeTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function hashtagLine(): string {
  return [...TAGS.base, ...TAGS.iicrc].join(' ');
}

/** Short label for a module (number preferred, else trimmed title). */
function moduleDescriptor(
  moduleNumber: number | null | undefined,
  moduleTitle: string
): string {
  if (moduleNumber && moduleNumber > 0) {
    return `Module ${moduleNumber}`;
  }
  if (moduleTitle) {
    const t = moduleTitle;
    return t.length > 72 ? `${t.slice(0, 69)}…` : t;
  }
  return 'this module';
}

function carsiJourneyParagraph(): string {
  return (
    'CARSI supports that journey with flexible online courses, practical resources, and industry-focused training designed for people who are already on the tools. ' +
    'It is built to help professionals grow, stay current, and work smarter—not just clock hours.'
  );
}

function closingCta(): string {
  return (
    `If you want to explore courses, resources, or your next step in restoration and cleaning training, start here:\n👉 ${CARSI_SITE_URL}`
  );
}

export function buildProgressShareDraft(payload: ProgressSharePayload): ProgressShareDraft {
  const course = normalizeTitle(payload.courseTitle);
  const moduleTitle = normalizeTitle(payload.moduleTitle ?? '');
  const hashtags = hashtagLine();

  if (payload.type === 'lesson') {
    const lessonName = normalizeTitle(payload.lessonTitle ?? '') || 'this lesson';
    const copyText = [
      'The best training is the kind you can use before you leave the parking lot.',
      `I just completed "${lessonName}" in ${course} through CARSI.`,
      'What I am taking forward: clearer on-site sequencing, tighter alignment with accepted standards, and language that carries in the field—with clients, crews, and documentation. If your work looks like mine, those details are where credibility shows up.',
      carsiJourneyParagraph(),
      closingCta(),
      hashtags,
    ].join('\n\n');

    return {
      title: 'Share your lesson progress',
      subtitle:
        'Hook → milestone → practical takeaways → how CARSI supports you → CTA with link. Copy in one click.',
      copyText,
    };
  }

  if (payload.type === 'module') {
    const modDesc = moduleDescriptor(payload.moduleNumber, moduleTitle);
    const copyText = [
      'When the work is technical, depth beats dabbling—another milestone locked in.',
      `I completed ${modDesc} in ${course} on CARSI.`,
      'Key learnings I can actually apply: practical sequencing for real jobs, stronger framing for quality and consistency across the team, and reminders that keep standards visible when timelines get tight. Nothing theoretical for theory’s sake—just what helps you execute.',
      carsiJourneyParagraph(),
      closingCta(),
      hashtags,
    ].join('\n\n');

    return {
      title: 'Share your module completion',
      subtitle:
        'Structured flow: attention-grabbing open, specific completion, learnings, CARSI value, link CTA.',
      copyText,
    };
  }

  const copyText = [
    'Finishing a full program is one of the clearest ways to signal you are investing in your craft—not just your calendar.',
    `I completed ${course} through CARSI.`,
    'What stands out looking back: a structured path through the topics that matter for competence and compliance, lessons that respect real schedules, and training that stays grounded in how restoration and cleaning teams actually operate.',
    carsiJourneyParagraph(),
    closingCta(),
    hashtags,
  ].join('\n\n');

  return {
    title: 'Share your course completion',
    subtitle:
      'Professional, readable, and built for engagement—ends with a clear next step on carsi.com.au.',
    copyText,
  };
}
