export type AssessmentFieldType = 'text' | 'textarea' | 'select' | 'url';

export type AssessmentField = {
  id: string;
  label: string;
  type: AssessmentFieldType;
  placeholder?: string;
  options?: string[];
  optional?: boolean;
};

export type AssessmentSection = {
  id: string;
  title: string;
  description: string;
  fields: AssessmentField[];
};

export const COACHING_ASSESSMENT_SECTIONS: AssessmentSection[] = [
  {
    id: 'background',
    title: 'Business background',
    description: 'Help Phill understand how your business runs today.',
    fields: [
      { id: 'owner_role', label: 'Your role in the business', type: 'text' },
      { id: 'typical_week', label: 'What does a typical week look like?', type: 'textarea' },
      {
        id: 'years_operating',
        label: 'How long have you been operating?',
        type: 'select',
        options: ['Under 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years'],
      },
    ],
  },
  {
    id: 'revenue',
    title: 'Revenue and profitability',
    description: 'Rough picture only — choose “Prefer not to say” if you are not sure.',
    fields: [
      {
        id: 'revenue_band',
        label: 'Approximate annual revenue',
        type: 'select',
        options: [
          'Prefer not to say',
          'Not sure',
          'Under $100k',
          '$100k–$250k',
          '$250k–$500k',
          '$500k–$1M',
          '$1M+',
        ],
      },
      {
        id: 'profitability',
        label: 'How would you describe profitability right now?',
        type: 'select',
        options: [
          'Prefer not to say',
          'Not sure',
          'Breaking even',
          'Modest profit',
          'Strong profit',
          'Under pressure',
        ],
      },
      {
        id: 'revenue_notes',
        label: 'Anything else about money in the business?',
        type: 'textarea',
        optional: true,
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing and online visibility',
    description:
      'Share your links so we can review how you show up online — paste full URLs where you can.',
    fields: [
      { id: 'lead_sources', label: 'Where do most enquiries come from today?', type: 'textarea' },
      {
        id: 'website_url',
        label: 'Business website',
        type: 'url',
        placeholder: 'https://yourbusiness.com.au',
        optional: true,
      },
      {
        id: 'google_business_url',
        label: 'Google Business Profile',
        type: 'url',
        placeholder: 'https://maps.google.com/... or business.google.com/...',
        optional: true,
      },
      {
        id: 'facebook_url',
        label: 'Facebook page',
        type: 'url',
        placeholder: 'https://facebook.com/yourpage',
        optional: true,
      },
      {
        id: 'instagram_url',
        label: 'Instagram',
        type: 'url',
        placeholder: 'https://instagram.com/yourbusiness',
        optional: true,
      },
      {
        id: 'linkedin_url',
        label: 'LinkedIn',
        type: 'url',
        placeholder: 'https://linkedin.com/company/...',
        optional: true,
      },
      {
        id: 'tiktok_url',
        label: 'TikTok',
        type: 'url',
        placeholder: 'https://tiktok.com/@...',
        optional: true,
      },
      {
        id: 'youtube_url',
        label: 'YouTube',
        type: 'url',
        placeholder: 'https://youtube.com/@...',
        optional: true,
      },
      {
        id: 'x_url',
        label: 'X (Twitter)',
        type: 'url',
        placeholder: 'https://x.com/...',
        optional: true,
      },
      {
        id: 'social_notes',
        label: 'Other listings or social (Yelp, Houzz, etc.)',
        type: 'textarea',
        optional: true,
      },
      { id: 'marketing_efforts', label: 'What marketing are you doing now?', type: 'textarea' },
    ],
  },
  {
    id: 'sales',
    title: 'Enquiries and sales',
    description: 'From first contact to booked job.',
    fields: [
      { id: 'enquiry_process', label: 'How do you handle new enquiries?', type: 'textarea' },
      {
        id: 'conversion_challenges',
        label: 'Where do you lose people in the process?',
        type: 'textarea',
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    description: 'Quoting, scheduling, delivery, and quality.',
    fields: [
      { id: 'ops_strengths', label: 'What works well operationally?', type: 'textarea' },
      { id: 'ops_pain', label: 'What causes stress or rework?', type: 'textarea' },
    ],
  },
  {
    id: 'technology',
    title: 'Technology and automation',
    description: 'Tools, admin, and where AI might help.',
    fields: [
      { id: 'tools_used', label: 'Software and tools you rely on', type: 'textarea' },
      {
        id: 'automation_interest',
        label: 'What would you automate if you could?',
        type: 'textarea',
      },
    ],
  },
  {
    id: 'goals',
    title: 'Goals and priorities',
    description: 'What success looks like over the next 12 months.',
    fields: [
      { id: 'top_priorities', label: 'Top 3 priorities right now', type: 'textarea' },
      { id: 'success_12m', label: 'What would make this year a win?', type: 'textarea' },
    ],
  },
];

export type AssessmentResponses = Record<string, string>;

export function emptyAssessmentResponses(): AssessmentResponses {
  const out: AssessmentResponses = {};
  for (const section of COACHING_ASSESSMENT_SECTIONS) {
    for (const field of section.fields) {
      out[field.id] = '';
    }
  }
  return out;
}

export function parseAssessmentResponsesJson(raw: string | null | undefined): AssessmentResponses {
  const base = emptyAssessmentResponses();
  if (!raw?.trim()) return base;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of Object.keys(base)) {
      const v = parsed[key];
      if (typeof v === 'string') base[key] = v;
    }
    return base;
  } catch {
    return base;
  }
}
