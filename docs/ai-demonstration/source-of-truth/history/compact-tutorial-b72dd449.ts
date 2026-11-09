/**
 * The existing 14-scene AI in Business talk, revised as a concrete ChatGPT walkthrough.
 *
 * Kept free of imports (types only, erased at runtime) so `export-text.mjs` can load this file
 * with plain `node`. Tool instructions cite official OpenAI guides read on 7 Nov 2026; dated facts retain their sources.
 * Human-host instructions are current. Earlier generated Margot narration is a separate overview edition.
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
      kind: 'cinematic-tutorial';
      label: string;
      headline: string;
      body: string;
      actionLabel: string;
      action: string;
      phase: number;
      composition: 'split' | 'film';
      feature: string;
      image: string;
      video?: string;
      sheet?: { label: string; headline?: string; lines: string[]; note?: string };
    }
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
      stepSeconds?: number[];
      example?: {
        label: string;
        input: string;
        output: string;
        check: string;
        inputLabel?: string;
        outputLabel?: string;
      };
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
  | {
      kind: 'prices';
      rows: { vendor: string; summary: string; gst: string }[];
      footnote: string;
      headings?: [string, string, string];
      caption?: string;
    };

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

export const TALK_EDITION = 'cinematic-chatgpt-tutorial-2026-11-07';
export const TALK_TITLE = 'AI in Business';
export const TALK_SPEAKER = 'Phill McGurk';
export const TALK_PLACE = 'Melbourne Trade Night';
export const TOTAL_SEC = 900;

export const SCENES: Scene[] = [
  {
    id: 'hook',
    section: 'Introduction',
    startSec: 0,
    durSec: 60,
    title: 'AI in Business',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'AI in Business',
      headline: 'One enquiry.\nA checked reply.',
      body: 'A fictional café enquiry becomes a draft you can check, correct and approve.',
      actionLabel: 'Your next action',
      action: 'Follow one complete workflow.',
      phase: 0,
      composition: 'film',
      feature: 'photo',
      image: '/ai-demonstration/cinematic/cafe.jpg',
      video: '/ai-demonstration/cinematic/cafe.mp4',
    },
    onScreen: [],
    presenterScript: [
      'I’m Margot, your AI presenter. Today we will use ChatGPT to turn one fictional café enquiry into a checked reply. Follow the steps on screen.',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
      'Margot narration uses the compact14chapter script; detailed task guide remains available for practice.',
    ],
    factual: true,
    sources: [
      {
        label: 'OpenAI: ChatGPT quickstart — read 07/11/2026',
        url: 'https://learn.chatgpt.com/docs/quickstart',
        official: true,
      },
    ],
  },
  {
    id: 'shift-agents',
    section: 'ChatGPT walkthrough',
    startSec: 60,
    durSec: 60,
    title: 'One tool. One complete task.',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'ChatGPT by OpenAI',
      headline: 'ChatGPT is\nthe tool.',
      body: 'OpenAI makes ChatGPT. Margot is the AI presenter. We stay in one application throughout.',
      actionLabel: 'Your next action',
      action: 'Use ChatGPT for this walkthrough.',
      phase: 0,
      composition: 'split',
      feature: 'identity',
      image: '/ai-demonstration/cinematic/cafe.jpg',
      sheet: {
        label: 'The application and the presenter',
        lines: [
          'OpenAI makes the application.',
          'Margot presents the lesson.',
          'Claude is an alternative.',
        ],
        headline: 'ChatGPT',
      },
    },
    onScreen: [],
    presenterScript: [
      'ChatGPT is the application; OpenAI makes it. Margot presents the lesson. Claude is an alternative. This demonstration stays in ChatGPT.',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
    ],
    factual: true,
    sources: [
      {
        label: 'OpenAI: ChatGPT quickstart — read 07/11/2026',
        url: 'https://learn.chatgpt.com/docs/quickstart',
        official: true,
      },
    ],
  },
  {
    id: 'shift-schedule',
    section: 'ChatGPT walkthrough',
    startSec: 120,
    durSec: 45,
    title: 'Our café enquiry',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'ChatGPT by OpenAI',
      headline: 'Start with\nthe facts.',
      body: 'One café enquiry. Supplied prices. Missing details kept visible.',
      actionLabel: 'Your next action',
      action: 'Keep the unknowns as questions.',
      phase: 1,
      composition: 'film',
      feature: 'calculation',
      image: '/ai-demonstration/cinematic/cafe.jpg',
      sheet: {
        label: 'Fictional café enquiry',
        lines: ['A$385', '20 lunch boxes × A$18 = A$360', '+ A$25 delivery'],
        note: 'GST, date, address, availability and allergy requirements are unknown.',
      },
    },
    onScreen: [],
    presenterScript: [
      'Twenty lunch boxes at eighteen dollars, plus twenty-five dollars delivery, gives three hundred and eighty-five dollars. GST, date, address, availability and allergy requirements are unknown.',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
    ],
    factual: false,
    sources: [],
  },
  {
    id: 'shift-connect',
    section: 'ChatGPT walkthrough',
    startSec: 165,
    durSec: 45,
    title: 'Open a new chat',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'ChatGPT by OpenAI',
      headline: 'Open a\nnew chat.',
      body: 'Go to chatgpt.com and sign in to your existing approved account.',
      actionLabel: 'Your next action',
      action: 'Click the message box.',
      phase: 0,
      composition: 'split',
      feature: 'web',
      image: '/ai-demonstration/cinematic/cafe.jpg',
      sheet: {
        label: 'ChatGPT · the sequence',
        lines: ['New chat', 'If Chat / Work appears, choose Chat.', 'Then click the message box.'],
        headline: 'chatgpt.com',
        note: 'Screen layout may vary. No developer tools or inbox connection needed.',
      },
    },
    onScreen: [],
    presenterScript: [
      'Open chatgpt.com and sign in. Choose New chat. If Chat and Work appear, choose Chat. Click the message box.',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
    ],
    factual: true,
    sources: [
      {
        label: 'OpenAI: ChatGPT quickstart — read 07/11/2026',
        url: 'https://learn.chatgpt.com/docs/quickstart',
        official: true,
      },
      {
        label: 'OpenAI: ChatGPT web guide — read 07/11/2026',
        url: 'https://learn.chatgpt.com/docs/web',
        official: true,
      },
    ],
  },
  {
    id: 'ladder',
    section: 'ChatGPT walkthrough',
    startSec: 210,
    durSec: 60,
    title: 'Give it the facts',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'ChatGPT by OpenAI',
      headline: 'Give it\nthe facts.',
      body: 'Paste the sample facts into the message box. Add the instructions underneath before sending.',
      actionLabel: 'Your next action',
      action: 'Paste facts first. Then the prompt.',
      phase: 1,
      composition: 'split',
      feature: 'facts',
      image: '/ai-demonstration/cinematic/cafe.jpg',
      sheet: {
        label: 'Message to paste · fictional facts',
        lines: [
          '20 lunch boxes at A$18 each.',
          'Delivery charge: A$25.',
          'Enquiry: “Can you supply 20 lunch boxes?”',
          'NOT PROVIDED: GST, date, address, availability, dietary or allergy requirements.',
        ],
        note: 'Copy-ready text is in the companion guide.',
      },
    },
    onScreen: [],
    presenterScript: [
      'Paste the fictional facts shown here. Include prices and unknown details. Label missing information NOT PROVIDED. Do not send yet.',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
    ],
    factual: true,
    sources: [
      {
        label: 'OpenAI: prompting guide — read 07/11/2026',
        url: 'https://learn.chatgpt.com/docs/prompting',
        official: true,
      },
    ],
  },
  {
    id: 'rungs-0-2',
    section: 'ChatGPT walkthrough',
    startSec: 270,
    durSec: 75,
    title: 'Tell it what to produce',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'ChatGPT by OpenAI',
      headline: 'Tell it what\nto produce.',
      body: 'A good brief names the task, source facts, output and limits.',
      actionLabel: 'Your next action',
      action: 'Add this beneath the facts.',
      phase: 1,
      composition: 'split',
      feature: 'prompt',
      image: '/ai-demonstration/cinematic/cafe.jpg',
      sheet: {
        label: 'Prompt to type',
        lines: [
          'Draft a café enquiry reply in under 120 words. Use only the facts above.',
          'Show the price breakdown. Ask for missing details.',
          'Do not add GST, invent availability, confirm the order or promise allergy suitability.',
          'Return a draft for a person to approve.',
        ],
      },
    },
    onScreen: [],
    presenterScript: [
      'Add the prompt below the facts: draft a short reply, show the breakdown and ask for missing details. Do not invent, add GST, confirm an order or promise allergy suitability.',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
    ],
    factual: true,
    sources: [
      {
        label: 'OpenAI: prompting guide — read 07/11/2026',
        url: 'https://learn.chatgpt.com/docs/prompting',
        official: true,
      },
    ],
  },
  {
    id: 'rungs-3-5',
    section: 'ChatGPT walkthrough',
    startSec: 345,
    durSec: 75,
    title: 'Send. Then read.',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'ChatGPT by OpenAI',
      headline: 'Send.\nThen read.',
      body: 'Press Send. Read the whole answer in the same conversation. Treat the words as a draft.',
      actionLabel: 'Your next action',
      action: 'Compare your answer with the facts.',
      phase: 2,
      composition: 'split',
      feature: 'reply',
      image: '/ai-demonstration/cinematic/cafe.jpg',
      sheet: {
        label: 'Prepared example · not a live result',
        lines: [
          'Thank you for your enquiry.',
          '20 lunch boxes: A$360. Delivery: A$25. Supplied-price subtotal: A$385, with GST treatment to clarify.',
          'Please confirm the date, address, dietary and allergy requirements. Availability and your order are not confirmed.',
        ],
        note: 'Your actual ChatGPT answer may differ. Check it.',
      },
    },
    onScreen: [],
    presenterScript: [
      'Press Send and read the whole answer. This slide is a prepared example, not a live result. Your answer may differ.',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
    ],
    factual: true,
    sources: [
      {
        label: 'OpenAI: prompting guide — read 07/11/2026',
        url: 'https://learn.chatgpt.com/docs/prompting',
        official: true,
      },
      {
        label: 'OpenAI: ChatGPT web guide — read 07/11/2026',
        url: 'https://learn.chatgpt.com/docs/web',
        official: true,
      },
    ],
  },
  {
    id: 'demo',
    section: 'ChatGPT walkthrough',
    startSec: 420,
    durSec: 180,
    title: 'Check before you use it',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'ChatGPT by OpenAI',
      headline: 'Check.\nThen correct.',
      body: 'Use a calculator: 20 × 18 + 25 = 385. Compare every fact and promise with the source.',
      actionLabel: 'Your next action',
      action: 'Send the correction. Check again.',
      phase: 4,
      composition: 'split',
      feature: 'correction',
      image: '/ai-demonstration/cinematic/cafe.jpg',
      sheet: {
        label: 'Follow-up prompt to type',
        lines: [
          'Those details were not supplied. Remove any invented date or tax amount and ask the customer to clarify.',
        ],
        headline: 'Stay in the same chat',
        note: 'If the revised answer is still wrong, edit it yourself.',
      },
    },
    onScreen: [],
    presenterScript: [
      'Check with a calculator: twenty times eighteen, plus twenty-five, equals three hundred and eighty-five. If details are invented, type the correction shown here in the same chat. Send, then check again.',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
    ],
    factual: true,
    sources: [
      {
        label: 'OpenAI: prompting guide — read 07/11/2026',
        url: 'https://learn.chatgpt.com/docs/prompting',
        official: true,
      },
    ],
  },
  {
    id: 'privacy-oaic',
    section: 'Working safely',
    startSec: 600,
    durSec: 45,
    title: 'Start with fictional information',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'ChatGPT by OpenAI',
      headline: 'Practise with\nfictional facts.',
      body: 'Use fictional information while learning. Real customer details need your business’s approval.',
      actionLabel: 'Your next action',
      action: 'Keep this first exercise fictional.',
      phase: 1,
      composition: 'film',
      feature: 'photo',
      image: '/ai-demonstration/cinematic/salon.jpg',
      video: '/ai-demonstration/cinematic/salon.mp4',
    },
    onScreen: [],
    presenterScript: [
      'Practise with fictional information. Real customer details need your business’s approval. Removing a name may not remove identifying information.',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
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
    section: 'Working safely',
    startSec: 645,
    durSec: 45,
    title: 'Know the account you are using',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'ChatGPT by OpenAI',
      headline: 'Know the\naccount you use.',
      body: 'Review its current information-handling rules, terms and connected apps.',
      actionLabel: 'Your next action',
      action: 'Use your approved account.',
      phase: 0,
      composition: 'split',
      feature: 'photo',
      image: '/ai-demonstration/cinematic/cafe.jpg',
    },
    onScreen: [],
    presenterScript: [
      'Use your approved account. Check its current information-handling rules and connected apps. This exercise needs no inbox connection.',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
    ],
    factual: true,
    sources: [
      {
        label: 'OpenAI: ChatGPT quickstart — read 07/11/2026',
        url: 'https://learn.chatgpt.com/docs/quickstart',
        official: true,
      },
    ],
  },
  {
    id: 'policy',
    section: 'Working safely',
    startSec: 690,
    durSec: 30,
    title: 'A person approves the reply',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'ChatGPT by OpenAI',
      headline: 'A person\napproves.',
      body: 'Check every fact, price and promise. Copy the approved draft into your own email.',
      actionLabel: 'Your next action',
      action: 'Read it once more. Send manually.',
      phase: 5,
      composition: 'split',
      feature: 'approval',
      image: '/ai-demonstration/cinematic/cafe.jpg',
      sheet: {
        label: 'The decision stays with you',
        lines: [
          'Facts match the source.',
          'Prices match your calculator.',
          'Unknown details stay as questions.',
          'Promises have human approval.',
        ],
        headline: 'Ready to send?',
        note: 'Add the recipient in your own email application.',
      },
    },
    onScreen: [],
    presenterScript: [
      'A person checks every fact, price and promise. After approval, copy the draft into your own email, add the recipient, read it again and send manually.',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
    ],
    factual: false,
    sources: [],
  },
  {
    id: 'quiz',
    section: 'Practice',
    startSec: 720,
    durSec: 90,
    title: 'Use the sequence again',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'ChatGPT by OpenAI',
      headline: 'Use the\nsequence again.',
      body: 'Six complete task sequences, with fictional inputs, exact prompts and checks.',
      actionLabel: 'Your next action',
      action: 'Open the companion task guide.',
      phase: 1,
      composition: 'film',
      feature: 'photo',
      image: '/ai-demonstration/cinematic/cafe.jpg',
      video: '/ai-demonstration/cinematic/cafe.mp4',
    },
    onScreen: [],
    presenterScript: [
      'The guide gives six task sequences, with inputs, prompts and checks. Try a handover, meeting follow-up or weekly review. Keep missing information visible.',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
    ],
    factual: true,
    sources: [
      {
        label: 'OpenAI: prompting guide — read 07/11/2026',
        url: 'https://learn.chatgpt.com/docs/prompting',
        official: true,
      },
    ],
  },
  {
    id: 'actions',
    section: 'Practice',
    startSec: 810,
    durSec: 60,
    title: 'Test whether it helps',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'ChatGPT by OpenAI',
      headline: 'Test whether\nit helps.',
      body: 'Try five sample cases. Record checking time and corrections, as well as drafting time.',
      actionLabel: 'Your next action',
      action: 'Keep it only if the result helps.',
      phase: 3,
      composition: 'split',
      feature: 'trial',
      image: '/ai-demonstration/cinematic/cafe.jpg',
      sheet: {
        label: 'A practical trial',
        lines: ['Missing prices.', 'Unclear dates.', 'Contradictory notes.'],
        headline: 'Five cases. One workflow.',
        note: 'Compare the checked result with doing the task yourself.',
      },
    },
    onScreen: [],
    presenterScript: [
      'Test five sample cases, including missing prices and contradictory notes. Record checking time and corrections. Keep the workflow only if the checked result helps.',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
    ],
    factual: false,
    sources: [],
  },
  {
    id: 'prices',
    section: 'Close',
    startSec: 870,
    durSec: 30,
    title: 'One useful task',
    kicker: 'AI in Business · ChatGPT by OpenAI',
    visual: {
      kind: 'cinematic-tutorial',
      label: 'ChatGPT by OpenAI',
      headline: 'One useful\ntask.',
      body: 'Open. Brief. Send. Check. Correct. Approve. Start with the fictional café example.',
      actionLabel: 'Your next action',
      action: 'What will you try first?',
      phase: 5,
      composition: 'film',
      feature: 'photo',
      image: '/ai-demonstration/cinematic/cafe.jpg',
      video: '/ai-demonstration/cinematic/cafe.mp4',
    },
    onScreen: [],
    presenterScript: [
      'Open. Brief. Send. Check. Correct. Approve. You have completed one workflow in ChatGPT. Use the guide to practise. Which everyday task will you try first?',
    ],
    cues: [
      'Required instructions stay visible when paused.',
      'Authored example sheets are not simulated live product screenshots.',
    ],
    factual: false,
    sources: [],
  },
];
