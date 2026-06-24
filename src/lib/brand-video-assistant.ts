export type BrandVideoAudience =
  | 'public'
  | 'learner'
  | 'team-owner'
  | 'restoreassist'
  | 'nrpg'
  | 'disaster-recovery';

export type BrandVideoFormat = 'hero' | 'short' | 'lesson-intro' | 'retention' | 'partner-intro';

export type BrandVideoScript = {
  id: string;
  title: string;
  audience: BrandVideoAudience;
  format: BrandVideoFormat;
  durationSeconds: number;
  placement: string;
  goal: string;
  visualDirection: string;
  voiceDirection: string;
  ctaLabel: string;
  ctaHref: string;
  script: string;
};

export const CARSI_VIDEO_ASSISTANT_NAME = 'Claire';

export const brandVideoAssistantPrinciples = [
  'Practical, calm, Australian, and evidence-led.',
  'Never overclaim accreditation, insurance recognition, NRPG status, or compliance outcomes.',
  'Use CARSI as the learning and credential layer; use RestoreAssist as the field-support layer.',
  'Every video must end with one next action, not a list of competing choices.',
  'Captions and transcript are required for every public and lesson video.',
] as const;

export const brandVideoScripts: BrandVideoScript[] = [
  {
    id: 'carsi-public-introduction',
    title: 'Welcome to CARSI',
    audience: 'public',
    format: 'hero',
    durationSeconds: 65,
    placement: 'Homepage hero or first homepage trust section',
    goal: 'Explain CARSI as the online learning and credential loop for restoration and cleaning professionals.',
    visualDirection:
      'Assistant framed waist-up on a clean dark CARSI background, with subtle course-card and certificate overlays. Keep motion restrained and professional.',
    voiceDirection:
      'Warm, confident Australian English. Steady pace, no hype, clear emphasis on practical outcomes.',
    ctaLabel: 'Find my path',
    ctaHref: '/pathways',
    script:
      "Welcome to CARSI. I'm Claire, your professional learning guide. CARSI helps restoration and cleaning professionals build practical knowledge, complete online training, track progress, and turn completion into verifiable credentials. If you are here for IICRC continuing education, team training, or a clearer path into restoration work, start with the pathway advisor. It will help you choose the shortest credible next step, then CARSI will keep you moving from enrolment, to first lesson, to certificate, and on to the next course.",
  },
  {
    id: 'restoreassist-introduction',
    title: 'Introducing RestoreAssist',
    audience: 'restoreassist',
    format: 'partner-intro',
    durationSeconds: 70,
    placement: 'RestoreAssist landing section, research pages, and field-support onboarding',
    goal: 'Position RestoreAssist as the field decision-support layer connected to CARSI learning.',
    visualDirection:
      'Assistant beside field-support UI concepts: site notes, moisture readings, task checklist, photo evidence, and report-ready outputs.',
    voiceDirection:
      'Practical and grounded. Make RestoreAssist sound useful in the field, not like generic AI theatre.',
    ctaLabel: 'Explore RestoreAssist',
    ctaHref: '/research',
    script:
      'RestoreAssist is designed for the moments after training meets the real job. CARSI gives technicians the learning foundation. RestoreAssist helps turn field observations, photos, readings, and job notes into clearer decisions and better documentation. It does not replace professional judgement, standards, or compliance requirements. It supports the work by helping teams organise evidence, ask better questions, and move faster from site conditions to next actions. Together, CARSI and RestoreAssist create a stronger loop: learn the principle, apply it in the field, document the outcome, and improve the next job.',
  },
  {
    id: 'disaster-recovery-nrpg-introduction',
    title: 'Disaster Recovery and NRPG Readiness',
    audience: 'disaster-recovery',
    format: 'partner-intro',
    durationSeconds: 75,
    placement:
      'NRPG/Disaster Recovery education page, professional directory, and partner onboarding',
    goal: 'Explain how CARSI supports disaster recovery capability and NRPG-aligned professional readiness.',
    visualDirection:
      'Assistant over muted flood/fire recovery visuals, training pathway map, certificate proof, and professional directory cues.',
    voiceDirection:
      'Serious, reassuring, and precise. Avoid dramatic disaster language; focus on readiness, records, and professional standards.',
    ctaLabel: 'View NRPG pathway',
    ctaHref: '/pathways',
    script:
      'Disaster recovery depends on trained people, clear records, and coordinated professional standards. CARSI supports that readiness by giving technicians and teams an online pathway into restoration knowledge, continuing education, and verifiable completion records. For the National Restoration Professionals Group, CARSI forms part of the onboarding and professional development ecosystem. The aim is simple: help people understand the work before the pressure is on, keep evidence of learning available, and support stronger recovery outcomes when water, fire, mould, or indoor environment risks affect a property.',
  },
  {
    id: 'learner-day-three-nudge',
    title: 'Your First Module Is Waiting',
    audience: 'learner',
    format: 'retention',
    durationSeconds: 30,
    placement: 'Day-3 lifecycle email and dashboard reminder',
    goal: 'Bring enrolled learners back to start or continue lesson one.',
    visualDirection:
      'Short vertical or square clip with assistant, course progress bar, and one clear resume button.',
    voiceDirection: 'Encouraging but direct. No guilt, just momentum.',
    ctaLabel: 'Resume lesson',
    ctaHref: '/dashboard/student',
    script:
      'A quick reminder from CARSI: the easiest way to finish a course is to start the first module early. Open My Learning, resume your lesson, and let CARSI track your progress from there. Once you complete the course, your certificate and CEC evidence are only a few steps away.',
  },
  {
    id: 'team-owner-progress-nudge',
    title: 'Team Training Progress Check',
    audience: 'team-owner',
    format: 'retention',
    durationSeconds: 35,
    placement: 'Team dashboard and weekly owner summary email',
    goal: 'Prompt owners to review seats, stalled learners, and next assignments.',
    visualDirection:
      'Assistant beside team progress summary: seats used, learners started, learners stalled, certificates issued.',
    voiceDirection: 'Managerial, concise, and action-oriented.',
    ctaLabel: 'Review team progress',
    ctaHref: '/dashboard/team',
    script:
      'Your team training works best when progress is visible. Check who has started, who is stalled, and which certificates are ready. If one person has completed the baseline, the next step is to assign the same course to the rest of the team so everyone shares the same operating language on site.',
  },
  {
    id: 'pathways-advisor-intro',
    title: 'Find Your Learning Pathway',
    audience: 'public',
    format: 'lesson-intro',
    durationSeconds: 35,
    placement: 'Pathways page intro and pathway-advisor onboarding',
    goal: 'Help visitors choose a structured CARSI pathway instead of guessing which course to start.',
    visualDirection:
      'Assistant beside a clean pathway map: discipline tracks, ordered courses, and CEC progress markers. Calm, structured, professional.',
    voiceDirection: 'Clear and guiding. Reduce overwhelm; make the next step feel obvious.',
    ctaLabel: 'Find my path',
    ctaHref: '/pathways',
    script:
      "If you are not sure which course to start with, begin with a pathway. CARSI pathways group courses into a sensible order for each restoration and cleaning discipline, so you build knowledge in the right sequence and keep your continuing education on track. Pick the pathway that matches your work, and CARSI will guide you from your first lesson through to a verifiable certificate, one clear step at a time.",
  },
];

export function getBrandVideoScript(id: string) {
  return brandVideoScripts.find((script) => script.id === id);
}

export function getBrandVideoScriptsForAudience(audience: BrandVideoAudience) {
  return brandVideoScripts.filter((script) => script.audience === audience);
}
