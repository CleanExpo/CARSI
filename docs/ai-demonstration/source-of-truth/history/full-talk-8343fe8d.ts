/**
 * The 15-minute talk "AI Pathways for small business" as typed, timed scenes.
 *
 * Kept free of imports (types only, erased at runtime) so `export-text.mjs` can load this file
 * with plain `node`. External facts were checked on 7 Nov 2026; each fact scene carries its source.
 * Story placeholders are written as "[YOUR STORY: ...]" and are highlighted in the presenter view.
 */

export type SceneSource = {
  label: string;
  url: string;
  /** Shown in the presenter view only. Use when the source has not been fully verified. */
  caveat?: string;
  /** True when the page was read directly and is an official source. */
  official?: boolean;
};

export type MediaRef = { src: string; alt?: string };

/** Optional generated media for a scene. Empty until Higgsfield, Artlist or Remotion output exists. */
export type SceneMedia = {
  video?: MediaRef;
  image?: MediaRef;
  audio?: MediaRef;
};

export type AppCard = { name: string; fact: string };
export type ScheduleRow = { app: string; where: string; note: string };

export type Visual =
  | {
      kind: 'title-stat';
      title: string;
      subtitle: string;
      stat: { value: number; unit: string; caption: string; period: string; sourceLine: string };
    }
  | { kind: 'agents'; outcomeLabel: string; apps: AppCard[] }
  | { kind: 'schedule'; time: string; rows: ScheduleRow[]; modes: string[] }
  | { kind: 'connect'; hub: string; spokes: string[]; facts: string[] }
  | { kind: 'staircase'; stepSeconds: number }
  | { kind: 'rung-panels'; rungs: number[]; stamp?: string }
  | {
      kind: 'demo-live';
      business: string;
      example?: { label: string; input: string; output: string; check: string };
      steps: string[];
      fallback: { trigger: string; action: string }[];
    }
  | { kind: 'privacy'; headline: string }
  | {
      kind: 'toggles';
      switches: {
        app: string;
        setting: string;
        state: 'opt-in' | 'keep-activity';
        detail: string;
      }[];
    }
  | { kind: 'policy'; lines: string[] }
  | { kind: 'score-bar'; countdownSec: number; override: string }
  | { kind: 'actions'; columns: { who: string; action: string }[] }
  | { kind: 'prices'; rows: { vendor: string; summary: string; gst: string }[]; footnote: string };

export type VisualKind = Visual['kind'];

export type Scene = {
  id: string;
  /** Section of the talk the scene belongs to, for the run sheet. */
  section: string;
  startSec: number;
  durSec: number;
  title: string;
  kicker: string;
  visual: Visual;
  /** The slide text, three lines or fewer. */
  onScreen: string[];
  presenterScript: string[];
  cues: string[];
  /** True when the scene states an external fact and so must carry a source. */
  factual: boolean;
  sources: SceneSource[];
  media?: SceneMedia;
};

export const TALK_TITLE = 'AI in Business';
export const TALK_SPEAKER = 'Phill McGurk';
export const TALK_PLACE = 'Melbourne Trade Night';
export const TOTAL_SEC = 900;

export const SCENES: Scene[] = [
  {
    id: 'hook',
    section: 'Hook',
    startSec: 0,
    durSec: 60,
    title: 'AI in Business',
    kicker: 'Melbourne Trade Night',
    visual: {
      kind: 'title-stat',
      title: 'AI in Business',
      subtitle: 'Practical help with everyday work',
      stat: {
        value: 43,
        unit: '%',
        caption: 'of Australian small and medium businesses report using AI',
        period: 'Dec 2025 to Feb 2026',
        sourceLine: 'Source: SME AI Pulse, Fifth Quadrant, at least 400 SMEs per wave',
      },
    },
    onScreen: [
      'AI in Business',
      'Practical help with the work you do every day',
      'Phill McGurk, Melbourne',
    ],
    presenterScript: [
      'G’day, I’m Phill. It’s five o’clock. You’ve finished the work, but there are still quotes to write, emails to answer and notes to tidy up. That’s where I want to start.',
      'Who has tried AI? Keep your hand up if you use it for the same useful job every week.',
      'The National AI Centre reported 43% of Australian SMEs using AI in the December 2025 to February 2026 quarter. That is a dated survey, not a measure of this room today.',
      '[YOUR STORY: Optional, 10 seconds. One real admin task AI helped with; say what you still checked. Omit if not ready.]',
      'Tonight: everyday examples, six rungs you can work through, one quote exercise, and one task to take home.',
    ],
    cues: [
      'Pause for hands; do not assume how many respond.',
      'The 15-minute structure is a rehearsal target; event slot remains unconfirmed.',
    ],
    factual: true,
    sources: [
      {
        label: 'National AI Centre: SME AI Pulse, Dec 2025–Feb 2026',
        url: 'https://www.ai.gov.au/news-and-insights/blog/ai-adoption-insights-december-2025-february-2026',
        official: true,
      },
    ],
  },
  {
    id: 'shift-agents',
    section: 'Everyday work',
    startSec: 60,
    durSec: 60,
    title: 'What business owners are doing',
    kicker: 'Real Australian examples',
    visual: {
      kind: 'agents',
      outcomeLabel: 'Everyday work',
      apps: [
        {
          name: 'Genetics Fitness Club',
          fact: 'Member emails and spreadsheet formulas',
        },
        {
          name: 'Redline Trailers',
          fact: 'Website, social content and an ad script',
        },
        {
          name: 'Tax Window',
          fact: 'Personalised follow-ups after client meetings',
        },
      ],
    },
    onScreen: [
      'Member emails. Marketing drafts. Meeting follow-ups.',
      'Published examples from Australian businesses',
    ],
    presenterScript: [
      'These are published examples from real Australian businesses. Genetics Fitness Club uses AI for member emails and spreadsheet formulas. Redline Trailers uses it for website and social content, and an advertisement script.',
      'Tax Window, an accounting business, worked with SMEC AI to turn client meetings into personalised follow-up emails. That involved implementation support; it was not a single magic prompt.',
      'The common thread is familiar work. For your business it might be an enquiry reply, a quote or a staff handover. Start with a job you already understand, so you can recognise a good answer.',
    ],
    cues: [
      'Business examples are reported uses, not a promise of the same results.',
      'Ask the room: which of these jobs follows you home?',
    ],
    factual: true,
    sources: [
      {
        label: 'NSW Small Business Commissioner: published business case studies',
        url: 'https://www.smallbusiness.nsw.gov.au/help/common-questions/can-artificial-intelligence-help-your-business',
        official: true,
      },
      {
        label: 'National AI Centre: Tax Window client follow-ups',
        url: 'https://www.ai.gov.au/practical-guides-and-learning/real-world-examples/automating-personalised-client-follow-ups',
        official: true,
        caveat:
          'Published case study and business account; not an independently audited savings result.',
      },
    ],
  },
  {
    id: 'shift-schedule',
    section: 'Everyday work',
    startSec: 120,
    durSec: 45,
    title: 'Your Monday briefing',
    kicker: 'Worked example — fictional',
    visual: {
      kind: 'schedule',
      time: '7:00',
      rows: [
        {
          app: 'Cafe owner',
          where: 'One page before opening',
          note: 'From approved stock and delivery notes: shortages, questions and today’s priorities.',
        },
        {
          app: 'Retail owner',
          where: 'A weekly sales summary',
          note: 'From a sample spreadsheet: compare totals, flag missing rows and show the calculation.',
        },
      ],
      modes: ['Draft', 'Check', 'Approve'],
    },
    onScreen: [
      'Give it the source notes and the output you need',
      'Test manually before scheduling',
    ],
    presenterScript: [
      'Imagine a cafe owner. Stock and delivery notes become one opening checklist: what is missing, who needs a call, what matters today. A retailer could ask for a weekly sales summary with the rows behind each number.',
      'The brief is: use only these files; give me one page; mark anything missing; don’t place orders or send messages. Run it yourself first. If you later schedule it, test where it runs, what must stay connected and who will check the result.',
    ],
    cues: [
      'These are suggested workflows, not observed customer outcomes.',
      'The clock is a proposed routine, not proof a task ran.',
    ],
    factual: false,
    sources: [],
  },
  {
    id: 'shift-connect',
    section: 'Everyday work',
    startSec: 165,
    durSec: 45,
    title: 'Give AI a clear brief',
    kicker: 'A prompt you can reuse',
    visual: {
      kind: 'connect',
      hub: 'Your brief',
      spokes: ['Task', 'Source', 'Format', 'Limits'],
      facts: [
        'Task + source: “Turn these job notes into a customer update.”',
        'Format: “Under 120 words. Plain Australian English. List the next step.”',
        'Limits: “Use only the notes. Flag gaps. Don’t promise dates or send.”',
      ],
    },
    onScreen: ['Task + source + format + limits', 'Ask what is missing, then check the source'],
    presenterScript: [
      'Think of briefing a new employee. What is the job? Which information can they use? What should the result look like? What must they leave to you?',
      'For a customer update: use only these notes, under 120 words, plain Australian English, list the next step. Flag missing details. Do not promise a completion date.',
      '“What assumptions did you make?” is a useful follow-up. It is not verification. You still compare the draft with the notes.',
    ],
    cues: [
      'Read the brief once, slowly.',
      'This pattern works without connecting the whole inbox.',
    ],
    factual: false,
    sources: [],
  },
  {
    id: 'ladder',
    section: 'The ladder',
    startSec: 210,
    durSec: 60,
    title: 'Six rungs for learning',
    kicker: 'A learning guide, one useful task at a time',
    visual: {
      kind: 'staircase',
      stepSeconds: 7,
    },
    onScreen: [
      'L0 Chat, L1 Documents, L2 Knows you',
      'L3 Connected, L4 Delegates, L5 Scheduled',
      'More access needs more checking',
    ],
    presenterScript: [
      'This is our learning guide, not an industry qualification. Chat first. Then documents. Then a workspace with your business rules. Connections, delegated tasks and schedules come later if they suit the job.',
      'You do not have to reach the top. A reliable enquiry reply at rung zero can be more useful than a complicated automation nobody checks.',
      'Pick the lowest rung that solves your problem. Repeat the task, check it, then decide whether more access would actually help.',
    ],
    cues: [
      'Let the six steps build.',
      'Ask owners to think of one repeated task as the examples appear.',
    ],
    factual: false,
    sources: [],
  },
  {
    id: 'rungs-0-2',
    section: 'The ladder',
    startSec: 270,
    durSec: 75,
    title: 'Replies, quotes and your rules',
    kicker: 'Rungs 0 to 2 — worked examples',
    visual: {
      kind: 'rung-panels',
      rungs: [0, 1, 2],
    },
    onScreen: [
      'L0: Draft an enquiry reply and ask missing questions',
      'L1: Build a quote from an approved price list',
      'L2: Reuse your services, tone and business rules',
    ],
    presenterScript: [
      'Rung zero: a salon enquiry says, “Can I book Friday?” Ask for a friendly reply that checks the service and preferred time, without confirming a booking. Read it before sending.',
      'Rung one: a cleaning quote. Eight office chairs, a fictional rate of 25 dollars each before GST. Ask for the line items, total and unanswered questions. We will work that through next.',
      'Rung two: keep current services, pricing rules and writing samples in a workspace. Date the files. An old price list can produce a beautifully written wrong quote.',
      '[YOUR STORY: Optional, 10 seconds. A real reusable instruction you use. No customer details; omit if not ready.]',
    ],
    cues: [
      'Prompts are in the companion handout.',
      'Check each price and each promise. A reusable workspace is not automatically accurate.',
    ],
    factual: false,
    sources: [],
  },
  {
    id: 'rungs-3-5',
    section: 'The ladder',
    startSec: 345,
    durSec: 75,
    title: 'Follow-ups and weekly paperwork',
    kicker: 'Rungs 3 to 5 — draft first',
    visual: {
      kind: 'rung-panels',
      rungs: [3, 4, 5],
      stamp: 'Draft only',
    },
    onScreen: [
      'L3: Find unanswered enquiries; draft replies',
      'L4: Turn job notes into a weekly handover',
      'L5: Prepare a Monday review for the owner',
    ],
    presenterScript: [
      'Connected: ask for unanswered enquiries older than two days, with a link to each source email. Draft replies; don’t send. Check the account and permissions first.',
      'Delegating: give it ten fictional job notes and ask for a handover table: job, status, next action, owner, due date. If there is no due date, write “not supplied”. Do not let it guess.',
      'Scheduled: prepare that same review on Monday. A person still owns it. Missing files, an expired connection or a task that never ran should be visible, not mistaken for a quiet week.',
      'Try it on sample data before granting access to real records.',
    ],
    cues: [
      'Suggested workflows depend on the tool and account.',
      'Use the smallest permissions the task needs; retain human approval.',
    ],
    factual: false,
    sources: [],
  },
  {
    id: 'demo',
    section: 'Demo',
    startSec: 420,
    durSec: 180,
    title: 'A quote you can check',
    kicker: 'Worked example — all data fictional',
    visual: {
      kind: 'demo-live',
      business: 'Example Cleaning Co — fictional',
      steps: [
        'Read the business rules',
        'Open the price list',
        'Paste the enquiry',
        'Check A$200 + A$20 = A$220',
        'Ask what is missing',
        'Approve before sending',
      ],
      example: {
        label: 'Worked example — fictional',
        input: '8 office chairs × A$25 each. Can you come Friday?',
        output:
          'A$200 + A$20 GST = A$220. Friday is not confirmed. Ask about fabric, access and stains.',
        check: 'Compare with the supplied price list. Never invent availability.',
      },
      fallback: [
        {
          trigger: 'No answer after 20 seconds',
          action: 'Use the prepared worked example; do not retry on stage.',
        },
        {
          trigger: 'No internet',
          action: 'Open the local demo pack; the arithmetic and checks still work.',
        },
      ],
    },
    onScreen: [
      '8 chairs × A$25 = A$200, plus A$20 GST',
      'A$220 total — availability still needs confirmation',
      'Illustrative draft; no live result is implied',
    ],
    presenterScript: [
      'Let’s do a job instead of talking about features. This business, enquiry and price list are fictional. The prepared answer is a worked example, not a recording of an AI result.',
      'The rules say: Australian dollars; show GST separately; never confirm a date; ask about missing details. The price list says 25 dollars per office chair before GST, with a demonstration rate of ten per cent.',
      'The enquiry is: eight office chairs; can you come Friday? Our prompt asks for a short reply, an itemised estimate and unanswered questions. It says to use only the supplied files.',
      'Eight times 25 is 200. The supplied ten per cent adds 20. Total: 220 dollars. Check that with a calculator, not another confident paragraph.',
      'Now look for the more expensive mistake: “Friday is booked.” We have no calendar evidence. The draft must say availability needs checking. Fabric, stains and access also need confirming.',
      'Ask what it assumed. If it invented a booking or a service, fix the reusable instruction and test again later. Today, the useful result is a draft you can verify and finish.',
      'You can apply the same pattern to a cafe catering enquiry, a salon booking or a retailer’s delivery question.',
    ],
    cues: [
      'Demo pack: public/ai-demonstration/demo/README.md.',
      '0:00–0:30 rules; 0:30–1:00 files; 1:00–1:45 prompt/result; 1:45–2:15 arithmetic; 2:15–2:40 missing information; 2:40–3:00 review.',
      'If using a live tool, use a prepared fictional workspace only. After 20 seconds without an answer, return to this prepared example.',
      'Do not open real inboxes, customer records or private account settings on the projector.',
    ],
    factual: false,
    sources: [],
  },
  {
    id: 'privacy-oaic',
    section: 'Safety and privacy',
    startSec: 600,
    durSec: 50,
    title: 'Keep private information private',
    kicker: 'Before you paste or connect',
    visual: {
      kind: 'privacy',
      headline: 'Use fictional data for your first test',
    },
    onScreen: [
      'Use fictional data for your first test',
      'Names are not the only identifying details',
      'Approve the tool and the use before real records',
    ],
    presenterScript: [
      'The OAIC recommends that organisations avoid entering personal information, particularly sensitive information, into publicly available generative AI tools.',
      'Removing a name is not enough if the address, photo, account number or unusual circumstances still identify someone. For the first experiment, make the data up.',
      '[YOUR STORY: Optional, 10 seconds. A real example of a detail you chose to leave out. Do not expose the detail itself; omit if not ready.]',
      'Before real records are used, check the tool, permissions, data handling and your obligations. This short talk cannot decide legal compliance for your business.',
    ],
    cues: [
      'This is a summary of OAIC guidance, not legal advice.',
      'Keep privacy advice separate from the fictional arithmetic example.',
    ],
    factual: true,
    sources: [
      {
        label: 'OAIC: commercially available AI products, best-practice recommendation',
        url: 'https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products',
        official: true,
      },
    ],
  },
  {
    id: 'training-switch',
    section: 'Safety and privacy',
    startSec: 650,
    durSec: 40,
    title: 'Check the account and settings',
    kicker: 'Training controls are only one check',
    visual: {
      kind: 'toggles',
      switches: [
        {
          app: 'Claude consumer accounts',
          setting: 'Model improvement',
          state: 'opt-in',
          detail: 'Consent, safety-review and feedback rules differ. Check the account policy.',
        },
        {
          app: 'Gemini personal accounts',
          setting: 'Keep Activity',
          state: 'keep-activity',
          detail: 'Off is not zero retention. Feedback can change how data is used.',
        },
      ],
    },
    onScreen: [
      'Personal and business accounts can have different rules',
      'Training off does not mean confidential or never retained',
    ],
    presenterScript: [
      'Settings matter, but a switch is not the whole privacy policy. Anthropic describes consent, safety-review and feedback routes for consumer data use. Google says personal Gemini chats with Keep Activity off are still retained for 72 hours; feedback can change how they are used.',
      'Check your actual account and current policy. Do not assume a personal account has your workplace’s protections, or that training off makes any customer upload acceptable.',
    ],
    cues: [
      'Use prepared text; do not expose a personal account on screen.',
      'Sources checked 07/11/2026; recheck before the event.',
    ],
    factual: true,
    sources: [
      {
        label: 'Anthropic Privacy Centre: consumer model training',
        url: 'https://privacy.claude.com/en/articles/10023580-is-my-data-used-for-model-training',
        official: true,
      },
      {
        label: 'Google: Gemini Apps Privacy Hub',
        url: 'https://support.google.com/gemini/answer/13594961',
        official: true,
      },
    ],
  },
  {
    id: 'policy',
    section: 'Safety and privacy',
    startSec: 690,
    durSec: 30,
    title: 'Your one-page AI rules',
    kicker: 'Give the work an owner',
    visual: {
      kind: 'policy',
      lines: ['Owner', 'Impact', 'Risk', 'Openness', 'Checks', 'Human sign-off'],
    },
    onScreen: [
      'Name the owner and permitted task',
      'Set data limits and checks',
      'A person approves customer-facing work',
    ],
    presenterScript: [
      'The National AI Centre has six essential practices. This is a plain-language starter, not a compliance certificate.',
      'Write down who owns AI, the task you allow, what could go wrong, what information stays out, how you explain its use, and who checks the output. For customer messages: no sending until someone reads it. Review after a mistake, not just at renewal time.',
    ],
    cues: [
      'The labels are a practical interpretation of the guidance.',
      'Use the starter policy in the handout; expand it for the actual risk.',
    ],
    factual: true,
    sources: [
      {
        label: 'National AI Centre: AI adoption foundations',
        url: 'https://www.ai.gov.au/staying-safe-and-responsible/essential-ai-practices/guidance-ai-adoption-foundations',
        official: true,
      },
    ],
  },
  {
    id: 'quiz',
    section: 'Find your rung',
    startSec: 720,
    durSec: 90,
    title: 'Choose your next useful task',
    kicker: 'A self-check — a learning guide',
    visual: {
      kind: 'score-bar',
      countdownSec: 60,
      override: 'Q3 to Q5 all A or B? Start at L2.',
    },
    onScreen: [
      '8 questions. Score 0 to 3 each.',
      'Use the score as a starting point, not a qualification.',
      'Choose the simplest task you can check.',
    ],
    presenterScript: [
      'Take sixty seconds for the eight-question self-check in the handout. It is a discussion guide, not a validated assessment. The score suggests a starting rung. If questions three to five are all A or B, begin with a reusable workspace before wider connections.',
      'Circle one repeated job you understand well enough to check.',
    ],
    cues: [
      'Allow the full 60 seconds.',
      'Do not interpret a high score as permission for autonomous work.',
      'No handout available? Ask owners to write one task, its input and who will check it.',
    ],
    factual: false,
    sources: [],
  },
  {
    id: 'actions',
    section: 'Close',
    startSec: 810,
    durSec: 60,
    title: 'One useful task this week',
    kicker: 'A small test you can measure',
    visual: {
      kind: 'actions',
      columns: [
        {
          who: 'New to AI',
          action: 'Draft one fictional enquiry reply',
        },
        {
          who: 'Already using AI',
          action: 'Test one repeatable workflow on five examples',
        },
      ],
    },
    onScreen: [
      'Pick one repeated job and name the reviewer',
      'Compare time, corrections and the final result',
      'Keep it only if it helps',
    ],
    presenterScript: [
      'If you are new, try one fictional enquiry reply. Ask for the missing questions. Check every promise before you use the pattern for real work.',
      'If you already use AI, choose one repeated job and test five sample cases. Include a missing price, an unclear date and contradictory notes. A useful tool should flag the gap.',
      'Record the time including your checking, the corrections you made and whether the final result was usable. Compare it with doing the task yourself. Fix the source or instruction when the same mistake repeats.',
    ],
    cues: [
      'No promised savings: measure the result in the owner’s actual workflow.',
      'The handout includes the five-case trial log.',
    ],
    factual: false,
    sources: [],
  },
  {
    id: 'prices',
    section: 'Close',
    startSec: 870,
    durSec: 30,
    title: 'Before you pay for another tool',
    kicker: 'Choose a workflow, then a plan',
    visual: {
      kind: 'prices',
      rows: [
        {
          vendor: 'Your task',
          summary: 'One repeated job with a clear input and output',
          gst: 'Keep checking time in the comparison',
        },
        {
          vendor: 'Your account',
          summary: 'Approved data, permissions and human review',
          gst: 'Check plan features and usage limits',
        },
        {
          vendor: 'Your decision',
          summary: 'Test it, measure it, then choose',
          gst: 'Check current currency, GST and renewal cost',
        },
      ],
      footnote:
        'Examples are illustrative. Product availability and terms vary. No vendor affiliation or endorsement.',
    },
    onScreen: [
      'Pick one job. Give a clear brief. Check the result.',
      'Prompts, fictional demo files and trial log in the handout',
    ],
    presenterScript: [
      'Before another subscription, decide what job it will do, what you may give it and who checks it. Use your existing approved tool where it fits. Check current price, currency, GST, limits and renewal terms before paying.',
      'The takeaway is simple: pick one job, give a clear brief, check the result. Thanks — what is the first job you would try?',
    ],
    cues: [
      'Leave this slide up for questions.',
      'No stale price quote or purchase recommendation is implied.',
    ],
    factual: false,
    sources: [],
  },
];
