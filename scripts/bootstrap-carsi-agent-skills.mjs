#!/usr/bin/env node
/**
 * Generates .agents/skills (nested) SKILL.md files from manifest.
 * Run: node scripts/bootstrap-carsi-agent-skills.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_ROOT = join(ROOT, '.agents', 'skills');

const COMMON_WORKFLOW = [
  'Read `../../references/engineering-principle.md`.',
  'Load authoritative docs from `../../references/authoritative-docs.md` for this task.',
  'Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).',
  'Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).',
  'Implement minimal diff; verify before marking done.',
];

/** @type {Array<{ id: string, category: string, title: string, description: string, when: string[], focus: string[], refs?: string[] }>} */
const MANIFEST = [
  // product
  {
    id: 'carsi-product-strategy',
    category: 'product',
    title: 'CARSI Product Strategy',
    description:
      'Frames feature work around customer value, restoration-professional outcomes, and commercial success for CARSI. Use when scoping features, writing specs, prioritising backlog, or evaluating whether a change improves usability, learning value, or revenue.',
    when: ['new feature', 'scope', 'PRD', 'backlog', 'outcome', 'ROI'],
    focus: [
      'State the restoration professional persona and job-to-be-done.',
      'Name measurable signals: conversion, enrollment, lesson completion, coach usage, support tickets.',
      'Reject pure vanity UI without learning or business impact.',
    ],
    refs: ['docs/governance/GOAL.md', 'docs/governance/BACKLOG.md'],
  },
  {
    id: 'carsi-spm',
    category: 'product',
    title: 'CARSI SPM (Spec Before Build)',
    description:
      'Produces decision-grade specs before customer-facing or high-risk build work on CARSI. Use for new marketing pages, commerce flows, course surfaces, or security-sensitive features. Includes media plan and verification plan.',
    when: ['spec', 'spm', '/spm', 'plan page', 'media manifest'],
    focus: [
      'Read-only analysis first; authorise no writes by itself.',
      'Include media plan, dependencies, risks, and verification plan per `quality-gates.md`.',
      'Customer pages: align with `docs/agents/AGENTS.md` and `visual-surfaces.md` surface A.',
    ],
    refs: ['docs/specs/', 'docs/runbooks/spm-carsi-first-run-walk.md'],
  },
  {
    id: 'carsi-architecture',
    category: 'product',
    title: 'CARSI Architecture',
    description:
      'Enforces CARSI system boundaries, module layout, and data flow using the actual repository structure. Use when adding modules, refactoring, or designing cross-cutting features in the Next.js monolith.',
    when: ['architecture', 'module', 'refactor', 'boundary', 'monolith'],
    focus: [
      'Default stack: Next.js App Router, Server Components, Prisma, PostgreSQL, Stripe.',
      'Place code where similar concerns already live (`app/`, `src/lib/`, `packages/`).',
      'No new services (FastAPI/LangGraph) unless explicitly in scope and present in repo.',
    ],
  },
  {
    id: 'carsi-nextjs-engineering',
    category: 'frontend',
    title: 'CARSI Next.js Engineering',
    description:
      'Implements routing, RSC/client boundaries, caching, and server actions for CARSI on Next.js 16+. Use when building pages, layouts, route handlers, or server actions.',
    when: ['next.js', 'app router', 'RSC', 'server action', 'route handler', 'page.tsx'],
    focus: [
      'Read `node_modules/next/dist/docs/` before using unfamiliar Next APIs.',
      'Server Components by default; client components only for interactivity.',
      'Match existing patterns in `app/` and `src/lib/server/`.',
    ],
  },
  {
    id: 'carsi-database-engineering',
    category: 'backend',
    title: 'CARSI Database Engineering',
    description:
      'Handles Prisma schema changes, migrations, queries, and data integrity for CARSI PostgreSQL. Use for schema updates, new models, or performance-sensitive queries.',
    when: ['prisma', 'migration', 'schema', 'postgresql', 'database'],
    focus: [
      'Run `npm run check:migrations` for migration work.',
      'Bounded `findMany`, indexes, and auth-aware access per verification gate.',
      'No destructive data changes without explicit user approval.',
    ],
  },
  {
    id: 'carsi-api-contracts',
    category: 'backend',
    title: 'CARSI API Contracts',
    description:
      'Designs and implements API routes and server contracts with Zod validation and clear errors. Use for `app/api/**`, webhooks, and integration endpoints.',
    when: ['api', 'route.ts', 'webhook', 'zod', 'validation'],
    focus: [
      'Validate inputs; fail fast with safe, non-leaky error messages.',
      'Protected routes: session/admin guards before work (verification gate §1).',
      'Prefer existing error shapes used in neighbouring routes.',
    ],
  },
  {
    id: 'carsi-security-engineering',
    category: 'backend',
    title: 'CARSI Security Engineering',
    description:
      'Applies authentication, authorization, payment security, and audit patterns for CARSI. Use for auth, admin, Stripe, cron, and PII-touching changes.',
    when: ['auth', 'security', 'stripe', 'session', 'admin', 'cron', 'PII'],
    focus: [
      'Follow `docs/agents/CLAUDE.md` and security specs under `docs/specs/`.',
      'Run `npm run check:secrets` when touching env or CI.',
      'Entitlements: purchase must map to course access correctly.',
    ],
  },
  // visual
  {
    id: 'carsi-design-system',
    category: 'frontend',
    title: 'CARSI Design System',
    description:
      'Applies token-driven typography, colour, spacing, and themes for CARSI. Use when styling components or extending the design system — separate from marketing art direction.',
    when: ['design tokens', 'theme', 'typography', 'colour', 'spacing', 'tailwind'],
    focus: [
      'Surfaces B and C: token-driven UI via Tailwind + CSS variables in `app/globals.css`.',
      'Fraunces / Manrope / JetBrains Mono per `visual-surfaces.md`.',
      'Extend `src/components/ui/` — no parallel design systems.',
    ],
    refs: ['../../references/visual-surfaces.md'],
  },
  {
    id: 'carsi-premium-ui',
    category: 'frontend',
    title: 'CARSI Premium UI',
    description:
      'Composes high-quality layouts and component hierarchy for CARSI marketing and key conversion pages. Use for landing pages, catalogue, and editorial layouts.',
    when: ['marketing page', 'landing', 'catalogue', 'hero', 'premium layout'],
    focus: [
      'Surface A rules in `docs/agents/AGENTS.md` override generic UI advice.',
      'Start from `scripts/premium-visuals/marketing-page.template.tsx.txt` when applicable.',
      'Real media only; run visual checks.',
    ],
  },
  {
    id: 'carsi-visual-storytelling',
    category: 'frontend',
    title: 'CARSI Visual Storytelling',
    description:
      'Plans photography, video, diagrams, and editorial layout for CARSI customer-facing storytelling. Use when selecting or placing media on public pages.',
    when: ['media', 'photography', 'video', 'manifest', 'editorial'],
    focus: [
      '`media.manifest.json` entries with source, credit, alt.',
      'Media budgets and sourcing order in `docs/agents/AGENTS.md`.',
      'No placeholder or code-drawn marketing graphics.',
    ],
  },
  {
    id: 'carsi-motion-design',
    category: 'frontend',
    title: 'CARSI Motion Design',
    description:
      'Adds purposeful motion, transitions, and feedback using CARSI motion patterns. Use for progress, navigation feedback, and lesson interactions — not decorative motion.',
    when: ['animation', 'motion', 'transition', 'framer'],
    focus: [
      'Use `framer-motion` via existing wrappers where possible.',
      'Always honour `prefers-reduced-motion`.',
      'Professional education tone: motion explains state change.',
    ],
  },
  {
    id: 'carsi-responsive-design',
    category: 'frontend',
    title: 'CARSI Responsive Design',
    description:
      'Verifies and implements mobile, tablet, and desktop layouts for CARSI. Use when building or changing layouts on student, marketing, or admin surfaces.',
    when: ['responsive', 'mobile', 'breakpoint', '390', '768', '1440'],
    focus: [
      'Verify 390 / 768 / 1440 for customer-facing work (visual QA skill).',
      'Mobile-first lesson reading on surface B.',
    ],
  },
  {
    id: 'carsi-interaction-design',
    category: 'frontend',
    title: 'CARSI Interaction Design',
    description:
      'Defines navigation, affordances, states, and usability for CARSI controls. Use for forms, wizards, dashboards, and lesson navigation.',
    when: ['UX', 'navigation', 'states', 'empty state', 'loading', 'error state'],
    focus: [
      'Every control needs default, loading, error, and success where relevant.',
      'Radix primitives for complex widgets; keyboard operable.',
    ],
  },
  // learning
  {
    id: 'carsi-learning-experience',
    category: 'learning',
    title: 'CARSI Learning Experience',
    description:
      'Designs lesson flows that turn passive content into active learning for restoration professionals. Use when improving courses, lessons, or instructional UX.',
    when: ['learning experience', 'lesson', 'instructional', 'LX'],
    focus: ['../../references/interactive-learning-patterns.md'],
  },
  {
    id: 'carsi-interactive-learning',
    category: 'learning',
    title: 'CARSI Interactive Learning',
    description:
      'Builds scenarios, simulations, knowledge checks, and practical exercises for CARSI courses. Use when adding interactivity to lessons or replacing passive blocks.',
    when: ['scenario', 'simulation', 'interactive', 'knowledge check'],
    focus: ['../../references/interactive-learning-patterns.md'],
  },
  {
    id: 'carsi-course-player',
    category: 'learning',
    title: 'CARSI Course Player',
    description:
      'Implements immersive course and lesson playback UX in CARSI. Use when changing the student lesson viewer, progress UI, or media playback in courses.',
    when: ['course player', 'lesson viewer', 'playback', 'enrollment view'],
    focus: [
      'Preserve purchase → access correctness.',
      'Surface B visual standards; strong mobile reading experience.',
    ],
  },
  {
    id: 'carsi-assessment-engine',
    category: 'learning',
    title: 'CARSI Assessment Engine',
    description:
      'Implements quizzes, attempts, scoring, and feedback for CARSI assessments. Use when changing quiz logic, grading, or results UI.',
    when: ['quiz', 'assessment', 'score', 'attempt', 'feedback'],
    focus: [
      'Meaningful feedback explaining why answers matter.',
      'Do not weaken integrity or certificate rules.',
    ],
  },
  {
    id: 'carsi-learning-progress',
    category: 'learning',
    title: 'CARSI Learning Progress',
    description:
      'Implements completion, milestones, and progress signals for CARSI learners. Use for progress bars, certificates eligibility, and dashboard progress.',
    when: ['progress', 'completion', 'milestone', 'certificate'],
    focus: ['Align UI with backend progress models; avoid misleading percentages.'],
  },
  {
    id: 'carsi-course-production',
    category: 'learning',
    title: 'CARSI Course Production',
    description:
      'Produces and finalises course structure, media, and instructional quality for CARSI. Use when authoring courses, modules, or course media pipelines.',
    when: ['course authoring', 'curriculum', 'module', 'course media'],
    focus: ['.claude/skills/carsi-course-production/SKILL.md'],
  },
  {
    id: 'carsi-course-voiceover',
    category: 'learning',
    title: 'CARSI Course Voiceover',
    description:
      'Plans and generates en-AU lesson narration for CARSI via ElevenLabs and Cloudinary. Use for voice briefs, narration scripts, and spend-capped generation.',
    when: ['voiceover', 'elevenlabs', 'narration', 'voice:plan', 'voice:generate'],
    focus: [
      'scripts/generate-course-voiceover.ts',
      'data/voice/course-voice-briefs.json',
      'docs/agent-framework/COURSE_CREATION_PIPELINE.md',
    ],
  },
  {
    id: 'carsi-demo-screencasts',
    category: 'learning',
    title: 'CARSI Demo Screencasts',
    description:
      'Records and composes CARSI demo screencasts with Playwright and FFmpeg. Use for marketing demos and course media PiP overlays.',
    when: ['screencast', 'demo video', 'playwright record', 'ffmpeg'],
    focus: ['docs/marketing/demo-video-production.md', 'src/lib/screencast/demo-flows.ts'],
  },
  {
    id: 'carsi-course-thumbnails',
    category: 'learning',
    title: 'CARSI Course Thumbnails',
    description:
      'Generates on-brand, text-free course thumbnail backgrounds for the CARSI catalogue. Use when creating or refreshing course imagery.',
    when: ['thumbnail', 'course image', 'catalogue art', 'gpt-image'],
    focus: ['scripts and data paths referenced in course-creation pipeline docs'],
  },
  {
    id: 'carsi-iicrc-compliance',
    category: 'learning',
    title: 'CARSI IICRC Compliance',
    description:
      'Enforces technical accuracy, IICRC terminology, and CEC-related rules when editing CARSI course or product copy. Use for course text, marketing claims, and accreditation surfaces.',
    when: ['IICRC', 'CEC', 'terminology', 'accreditation', 'compliance'],
    focus: ['docs/agents/CLAUDE.md', 'npm run check:iicrc-terminology and related check:* scripts'],
  },
  // customer
  {
    id: 'carsi-student-dashboard',
    category: 'customer',
    title: 'CARSI Student Dashboard',
    description:
      'Builds personalised student home, course list, and learning hub experiences in CARSI. Use for logged-in learner dashboards and portals.',
    when: ['student dashboard', 'learner home', 'my courses'],
    focus: ['Surface B; clarity and progress visibility.'],
  },
  {
    id: 'carsi-coaching-experience',
    category: 'customer',
    title: 'CARSI Coaching Experience',
    description:
      'Implements Ask Coach and coaching workflows for CARSI. Use when changing AI coach UI, prompts, or coaching-related APIs.',
    when: ['coach', 'coaching', 'ask coach', 'AI tutor'],
    focus: ['Bounded AI; auth; no PII leakage in logs.'],
  },
  {
    id: 'carsi-learning-paths',
    category: 'customer',
    title: 'CARSI Learning Paths',
    description:
      'Designs guided learning journeys and path sequencing for CARSI. Use for pathways, prerequisites, and recommended course order.',
    when: ['learning path', 'pathway', 'prerequisite', 'sequence'],
    focus: [],
  },
  {
    id: 'carsi-accountability',
    category: 'customer',
    title: 'CARSI Accountability',
    description:
      'Implements scheduling, reminders, and follow-through features for CARSI learners. Use for nudges, calendars, and commitment tooling.',
    when: ['reminder', 'schedule', 'accountability', 'nudge'],
    focus: [],
  },
  {
    id: 'carsi-commerce',
    category: 'customer',
    title: 'CARSI Commerce',
    description:
      'Implements course discovery, pricing display, checkout, and Stripe payment flows for CARSI. Use for catalogue CTAs, cart, and checkout.',
    when: ['checkout', 'stripe', 'purchase', 'pricing', 'catalogue CTA'],
    focus: ['check:live-buy-path', 'check:live-courses-money-path'],
  },
  {
    id: 'carsi-entitlements',
    category: 'customer',
    title: 'CARSI Entitlements',
    description:
      'Ensures purchase-to-course-access mapping is correct for CARSI. Use after payment changes, webhooks, or enrollment logic updates.',
    when: ['entitlement', 'enrollment', 'webhook', 'access grant'],
    focus: ['Test money path and enrollment guards in package.json scripts.'],
  },
  // quality
  {
    id: 'carsi-visual-qa',
    category: 'quality',
    title: 'CARSI Visual QA',
    description:
      'Runs browser-based visual inspection and SDA-style evidence for CARSI customer surfaces. Use before shipping marketing or major UI changes.',
    when: ['visual qa', 'screenshot', 'SDA', 'playwright visual', 'check-visuals'],
    focus: [
      'node scripts/premium-visuals/check-visuals.mjs',
      '../../references/premium-visuals-triage.md',
      'npm run media:manifest:sync',
      'npm run quality:sda-gate',
      'Playwright at 390/768/1440; reduced-motion check.',
      'Owner review still required; scanner is heuristic.',
    ],
  },
  {
    id: 'carsi-accessibility',
    category: 'quality',
    title: 'CARSI Accessibility',
    description:
      'Validates WCAG-oriented keyboard, focus, semantics, and screen reader support for CARSI UI. Use when changing markup, components, or flows.',
    when: ['accessibility', 'a11y', 'WCAG', 'keyboard', 'axe'],
    focus: ['npm run test:a11y', '@axe-core/playwright'],
  },
  {
    id: 'carsi-e2e-testing',
    category: 'quality',
    title: 'CARSI E2E Testing',
    description:
      'Authors and runs Playwright journeys for CARSI user flows. Use when adding or changing end-to-end behaviour.',
    when: ['e2e', 'playwright', 'user journey'],
    focus: ['config/playwright.config.ts', 'e2e/', 'npm run test:e2e'],
  },
  {
    id: 'carsi-performance',
    category: 'quality',
    title: 'CARSI Performance',
    description:
      'Optimises Core Web Vitals, bundles, and media loading for CARSI. Use when adding client JS, images, video, or heavy components.',
    when: ['performance', 'LCP', 'bundle', 'lazy load', 'CWV'],
    focus: ['Media budgets in AGENTS.md; avoid unnecessary client bundles.'],
  },
  {
    id: 'carsi-security-review',
    category: 'quality',
    title: 'CARSI Security Review',
    description:
      'Reviews permissions, validation, and vulnerability exposure for CARSI changes. Use before merging auth, admin, payment, or data-export work.',
    when: ['security review', 'permissions', 'vulnerability'],
    focus: ['CARSI_VERIFICATION_GATE.md', 'docs/specs/spm-security-remediation-2026-07-12.md'],
  },
  {
    id: 'carsi-regression-testing',
    category: 'quality',
    title: 'CARSI Regression Testing',
    description:
      'Prevents regressions in existing CARSI features when shipping changes. Use to select targeted tests and guards after modifications.',
    when: ['regression', 'did we break', 'existing feature'],
    focus: ['Run smallest sufficient set from quality-gates.md.'],
  },
  {
    id: 'carsi-production-readiness',
    category: 'quality',
    title: 'CARSI Production Readiness',
    description:
      'Collects preflight evidence before CARSI release or deploy. Use when preparing production pushes or sign-off.',
    when: ['production', 'release', 'deploy', 'readiness'],
    focus: ['docs/agent-framework/CARSI_VERIFICATION_GATE.md', 'npm run audit:verify'],
  },
  // growth
  {
    id: 'carsi-seo',
    category: 'growth',
    title: 'CARSI SEO',
    description:
      'Applies technical and content SEO for CARSI public pages. Use after visibility pillars (Find → Crawl → Index → Ranking) per AGENTS.md.',
    when: ['SEO', 'metadata', 'sitemap', 'canonical'],
    focus: ['docs/agents/AGENTS.md rule 6 — pillars before tactics.'],
  },
  {
    id: 'carsi-localization-au',
    category: 'growth',
    title: 'CARSI Australian Localization',
    description:
      'Enforces Australian English, formats, and conventions across CARSI. Use for copy, dates, currency, and locale-specific content.',
    when: ['en-AU', 'australian', 'localisation', 'AUD', 'DD/MM/YYYY'],
    focus: ['npm run check:au-english'],
  },
  {
    id: 'carsi-conversion-optimization',
    category: 'growth',
    title: 'CARSI Conversion Optimization',
    description:
      'Improves discovery-to-purchase and enrollment funnels for CARSI with measurable hypotheses. Use for CTAs, checkout friction, and catalogue UX.',
    when: ['conversion', 'funnel', 'CTA', 'A/B'],
    focus: ['Tie changes to product-strategy metrics; avoid dark patterns.'],
  },
  {
    id: 'carsi-product-analytics',
    category: 'growth',
    title: 'CARSI Product Analytics',
    description:
      'Instruments engagement, completion, and commerce events for CARSI using consent-aware analytics. Use when adding tracking or measuring features.',
    when: ['analytics', 'posthog', 'events', 'metrics'],
    focus: ['Consent patterns; no PII in event payloads against policy.'],
  },
  {
    id: 'carsi-content-strategy',
    category: 'growth',
    title: 'CARSI Content Strategy',
    description:
      'Plans professional education content and messaging for CARSI audiences. Use for blogs, landing copy, and course marketing text.',
    when: ['content strategy', 'copy', 'messaging', 'editorial'],
    focus: ['truth-finder discipline; IICRC compliance for claims.'],
  },
  {
    id: 'carsi-geo',
    category: 'growth',
    title: 'CARSI GEO',
    description:
      'Optimises CARSI content for generative search discoverability in Australian markets. Use for structured answers, citations, and authoritative content design.',
    when: ['GEO', 'AI search', 'citations', 'generative search'],
    focus: ['Accurate, verifiable claims only.'],
  },
];

function renderSkill(entry) {
  const focus =
    entry.focus.length > 0
      ? entry.focus.map((f) => (f.startsWith('../../') ? `- See \`${f}\`.` : `- ${f}`)).join('\n')
      : '- Apply repository patterns and quality gates for this domain.';

  const extraRefs = (entry.refs ?? []).map((r) => `- \`${r}\``).join('\n');
  const when = entry.when.map((w) => `\`${w}\``).join(', ');

  return `---
name: ${entry.id}
description: ${entry.description}
---

# ${entry.title}

## When to use

Trigger terms: ${when}.

## Engineering principle

See \`../../references/engineering-principle.md\`.

## Workflow

${COMMON_WORKFLOW.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Focus for this discipline

${focus}

${extraRefs ? `## Additional references\n\n${extraRefs}\n` : ''}## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without \`approved-libraries.md\` checklist.
- Applicable gates from \`../../references/quality-gates.md\` executed or explicitly deferred with reason.
`;
}

mkdirSync(SKILLS_ROOT, { recursive: true });

let count = 0;
for (const entry of MANIFEST) {
  const dir = join(SKILLS_ROOT, entry.category, entry.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), renderSkill(entry), 'utf8');
  count++;
}

console.log(`Wrote ${count} skills under .agents/skills/`);
