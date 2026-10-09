export type CoachingBusinessProfileForm = {
  businessName: string;
  industry: string;
  location: string;
  serviceAreas: string;
  yearsInBusiness: string;
  businessSize: string;
  employeeCount: string;
  mainServices: string;
  website: string;
  googleBusinessUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  xUrl: string;
  socialNotes: string;
  challenges: string;
  shortTermGoals: string;
  longTermVision: string;
};

export const EMPTY_COACHING_BUSINESS_PROFILE: CoachingBusinessProfileForm = {
  businessName: '',
  industry: '',
  location: '',
  serviceAreas: '',
  yearsInBusiness: '',
  businessSize: '',
  employeeCount: '',
  mainServices: '',
  website: '',
  googleBusinessUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  linkedinUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
  xUrl: '',
  socialNotes: '',
  challenges: '',
  shortTermGoals: '',
  longTermVision: '',
};

export const COACHING_INDUSTRY_OPTIONS = [
  'Pressure washing',
  'Exterior / house washing',
  'Carpet & upholstery cleaning',
  'Restoration (water / fire / mould)',
  'Commercial cleaning',
  'Window cleaning',
  'Landscaping / exterior maintenance',
  'Other trade or service',
] as const;

export const COACHING_YEARS_OPTIONS = [
  'Not started yet',
  'Under 1 year',
  '1–3 years',
  '3–5 years',
  '5–10 years',
  '10+ years',
] as const;

export const COACHING_BUSINESS_SIZE_OPTIONS = [
  'Sole operator',
  '2–5 staff',
  '6–15 staff',
  '16+ staff',
] as const;

export const COACHING_SOCIAL_FIELDS: Array<{
  key: keyof Pick<
    CoachingBusinessProfileForm,
    | 'googleBusinessUrl'
    | 'facebookUrl'
    | 'instagramUrl'
    | 'linkedinUrl'
    | 'tiktokUrl'
    | 'youtubeUrl'
    | 'xUrl'
  >;
  label: string;
  placeholder: string;
}> = [
  {
    key: 'googleBusinessUrl',
    label: 'Google Business Profile',
    placeholder: 'https://maps.google.com/... or business.google.com/...',
  },
  {
    key: 'facebookUrl',
    label: 'Facebook page',
    placeholder: 'https://facebook.com/yourpage',
  },
  {
    key: 'instagramUrl',
    label: 'Instagram',
    placeholder: 'https://instagram.com/yourbusiness',
  },
  {
    key: 'linkedinUrl',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/company/...',
  },
  {
    key: 'tiktokUrl',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@...',
  },
  {
    key: 'youtubeUrl',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@...',
  },
  {
    key: 'xUrl',
    label: 'X (Twitter)',
    placeholder: 'https://x.com/...',
  },
];

const REQUIRED_KEYS: (keyof CoachingBusinessProfileForm)[] = [
  'businessName',
  'industry',
  'location',
  'mainServices',
  'challenges',
  'shortTermGoals',
];

export function coachingProfileCompletionPercent(form: CoachingBusinessProfileForm): number {
  const allKeys = Object.keys(
    EMPTY_COACHING_BUSINESS_PROFILE
  ) as (keyof CoachingBusinessProfileForm)[];
  const filled = allKeys.filter((k) => form[k].trim().length > 0).length;
  return Math.round((filled / allKeys.length) * 100);
}

export function coachingProfileMeetsRequired(form: CoachingBusinessProfileForm): boolean {
  return REQUIRED_KEYS.every((k) => form[k].trim().length > 0);
}

export function profileFromApiRow(
  row: Record<string, string | null | undefined>
): CoachingBusinessProfileForm {
  const base = { ...EMPTY_COACHING_BUSINESS_PROFILE };
  for (const key of Object.keys(base) as (keyof CoachingBusinessProfileForm)[]) {
    const camel = key;
    const v = row[camel];
    if (typeof v === 'string') base[key] = v;
  }
  return base;
}
