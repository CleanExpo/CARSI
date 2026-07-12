/**
 * CARSI Course Advisor — the "employee" behind the AI Website.
 *
 * Grounded on the real CARSI disciplines and licence-correct wording (IICRC CEC Accredited,
 * CARSI Southern Hemisphere Restoration Designations — never bare "IICRC Accredited").
 *
 * This is a DETERMINISTIC knowledge-base responder: it needs no external LLM key, so it works in
 * production the moment the flag is on. The `answer()` signature is the seam for a live LLM upgrade —
 * see the `ANTHROPIC` note in docs/ai-website/RUNBOOK.md.
 */

export type Recommendation = { course: string; tier: string };
export type AdvisorReply = { text: string; recommendations: Recommendation[]; pathway: string | null };

type Path = { label: string; designation: string; earnsCec: boolean; courses: Recommendation[] };

const PATHS: Record<string, Path> = {
  water: {
    label: 'Water damage', designation: 'CARSI Water Restoration Practitioner', earnsCec: true,
    courses: [
      { course: 'Water Damage Restoration Fundamentals', tier: '$99' },
      { course: 'Structural Drying Fundamentals', tier: '$99' },
      { course: 'Psychrometry: Building Science for Drying', tier: '$99' },
      { course: 'Category 3 — Sewage & Black Water', tier: '$99' },
    ],
  },
  mould: {
    label: 'Mould', designation: 'CARSI Mould Remediation Practitioner', earnsCec: true,
    courses: [
      { course: 'Mould Remediation Fundamentals', tier: '$99' },
      { course: 'Containment & Negative-Air', tier: '$49' },
      { course: 'Creating a Clean Air Environment — Final Clearance', tier: '$49' },
      { course: 'Mould Level 3 (senior)', tier: '$149' },
    ],
  },
  fire: {
    label: 'Fire & smoke', designation: 'CARSI Fire & Smoke Restoration Practitioner', earnsCec: true,
    courses: [
      { course: 'Fire & Smoke Damage Restoration Fundamentals', tier: '$99' },
      { course: 'Odour Control & Deodorisation', tier: '$49' },
    ],
  },
  trauma: {
    label: 'Trauma & biohazard', designation: 'CARSI Trauma & Decontamination Practitioner', earnsCec: true,
    courses: [
      { course: 'Trauma & Crime-Scene Decontamination Fundamentals', tier: '$99' },
      { course: 'PPE & Respiratory Protection', tier: '$29' },
    ],
  },
  carpet: {
    label: 'Carpet & upholstery', designation: 'CARSI Cleaning Technician', earnsCec: true,
    courses: [
      { course: 'Carpet Cleaning Technician Fundamentals', tier: '$99' },
      { course: 'Pet Urine & Odour Decontamination', tier: '$29' },
      { course: 'Truckmount Operations', tier: '$99' },
    ],
  },
  drying: {
    label: 'Structural drying', designation: 'CARSI Structural Drying Practitioner', earnsCec: true,
    courses: [
      { course: 'Structural Drying Fundamentals', tier: '$99' },
      { course: 'Dehumidifier Selection & Psychrometrics', tier: '$49' },
      { course: 'Moisture Measurement & Documentation', tier: '$49' },
    ],
  },
  iaq: {
    label: 'Indoor air quality', designation: 'CARSI IAQ Practitioner', earnsCec: true,
    courses: [
      { course: 'Introduction to Air Quality Fundamentals', tier: '$29' },
      { course: 'HVAC Systems & IAQ', tier: '$49' },
      { course: 'Improving IAQ After Water Damage', tier: '$29' },
    ],
  },
  business: {
    label: 'Grow your business', designation: 'CARSI Business track (non-IICRC)', earnsCec: false,
    courses: [
      { course: 'AI for Service Businesses', tier: '$49' },
      { course: 'Speed to Lead: Job Conversion', tier: '$49' },
      { course: 'Google Business Profile Playbook', tier: '$49' },
      { course: 'Modern & AI Websites', tier: '$99' },
    ],
  },
};

const KEYWORDS: Array<[string, RegExp]> = [
  ['water', /\b(water|flood|burst|leak)\b/],
  ['mould', /\b(mould|mold|damp|spore)\b/],
  ['fire', /\b(fire|smoke|soot)\b/],
  ['trauma', /\b(trauma|biohazard|crime|decontam)\b/],
  ['carpet', /\b(carpet|upholstery|truckmount|steam)\b/],
  ['drying', /\b(dry|drying|psychro|dehumid|moisture)\b/],
  ['iaq', /\b(air quality|iaq|ventilation|hvac|odour|odor)\b/],
  ['business', /\b(business|marketing|leads?|customers|grow|ai website)\b/],
];

function pathwayReply(key: string): AdvisorReply {
  const p = PATHS[key];
  const cec = p.earnsCec ? ', which also earns IICRC CECs toward your existing certification' : '';
  return {
    text: `For ${p.label}, here's the pathway — it builds toward the ${p.designation}${cec}:`,
    recommendations: p.courses,
    pathway: key,
  };
}

/** Deterministic advisor. Returns a grounded reply for any message. */
export function answer(message: string): AdvisorReply {
  const q = (message || '').toLowerCase();
  const none: Recommendation[] = [];

  if (/\b(cec|credit|continuing)\b/.test(q)) {
    return {
      text:
        'Every CARSI course earns a CARSI Southern Hemisphere Restoration Designation — and also earns IICRC CECs toward maintaining your existing IICRC certification. CARSI is an accredited IICRC CEC provider; it does not issue IICRC certification itself. Which discipline are you tracking CECs in?',
      recommendations: none, pathway: null,
    };
  }
  if (/\b(price|cost|how much|cheap|fee)\b/.test(q) || q.includes('$')) {
    return {
      text:
        'Pricing is by course length: $29 up to an hour, $49 one-to-two hours, $99 two hours-plus, and $149 for senior courses like Mould Level 3. Or one subscription unlocks the whole library. Which discipline should I price up?',
      recommendations: none, pathway: null,
    };
  }
  if (/\b(subscribe|subscription|membership|all courses|unlimited)\b/.test(q)) {
    return {
      text:
        'The subscription unlocks every course, every tier — new courses included automatically on release. Great value if you are building a full designation. Which pathway would you start with?',
      recommendations: none, pathway: null,
    };
  }
  if (/\b(designation|certificate|qualif|credential)\b/.test(q)) {
    return {
      text:
        'CARSI issues its own Southern Hemisphere Restoration Designations — like the RIA issuing its own — e.g. CARSI Water Restoration Practitioner or CARSI Mould Remediation Practitioner. They stack CECs onto your existing IICRC certification. Which one are you aiming for?',
      recommendations: none, pathway: null,
    };
  }
  for (const [key, re] of KEYWORDS) {
    if (re.test(q)) return pathwayReply(key);
  }
  if (/\b(new|start|begin|no experience|beginner)\b/.test(q)) {
    return {
      text:
        'Welcome to the industry. Most people start with Water Damage Restoration Fundamentals — the backbone discipline — then branch into mould or drying. Tell me what work you will be doing first and I will map the rest.',
      recommendations: none, pathway: null,
    };
  }
  if (/\b(hi|hello|hey|g'day|gday)\b/.test(q)) {
    return {
      text:
        "G'day — I'm the CARSI Course Advisor. Tell me your role or discipline (water, mould, fire, drying, carpet, IAQ, or growing your business) and I'll map a pathway with the exact courses and the designation it earns.",
      recommendations: none, pathway: null,
    };
  }
  return {
    text:
      "Tell me your discipline or role — water damage, mould, fire & smoke, structural drying, carpet care, indoor air quality, or growing your business — and I'll map the pathway, the designation it earns, and the price. You can also ask about CECs or pricing.",
    recommendations: none, pathway: null,
  };
}

export const DISCIPLINES = Object.keys(PATHS);
