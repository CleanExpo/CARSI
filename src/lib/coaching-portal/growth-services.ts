/** Optional implementation services (not included in $495/mo coaching). Rates are indicative — final quotes confirmed in writing. */
export type GrowthServiceItem = {
  title: string;
  description: string;
  /** Indicative pricing shown in the portal; not a checkout price. */
  rateLabel: string;
};

export type GrowthServiceCategory = {
  id: string;
  title: string;
  items: GrowthServiceItem[];
};

export const COACHING_GROWTH_SERVICE_CATEGORIES: GrowthServiceCategory[] = [
  {
    id: 'web',
    title: 'Website and digital presence',
    items: [
      {
        title: 'Website audit',
        description: 'Review positioning, speed, and conversion basics.',
        rateLabel: 'From $295',
      },
      {
        title: 'Website development or redesign',
        description: 'Done-with-you or done-for-you builds.',
        rateLabel: 'From $2,500',
      },
      {
        title: 'Website maintenance',
        description: 'Updates, security, and content changes.',
        rateLabel: 'From $149/mo',
      },
      {
        title: 'Google Business Profile optimisation',
        description: 'Categories, photos, posts, and local visibility.',
        rateLabel: 'From $450',
      },
      {
        title: 'Website + GBP done-with-you sprint',
        description: 'Focused implementation block with handover checklist.',
        rateLabel: '$1,850',
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing and customer acquisition',
    items: [
      {
        title: 'SEO audit and local SEO',
        description: 'Practical fixes for how locals find you.',
        rateLabel: 'From $495',
      },
      {
        title: 'Content optimisation',
        description: 'Service pages and offers that convert.',
        rateLabel: 'From $395',
      },
      {
        title: 'Social media management',
        description: 'Rhythm and creative aligned to your business.',
        rateLabel: 'From $750/mo',
      },
      {
        title: 'Google Ads',
        description: 'Campaign setup and optimisation with clear ROI targets.',
        rateLabel: 'From $350/mo + spend',
      },
      {
        title: 'Marketing strategy',
        description: 'Channel plan tied to your coaching goals.',
        rateLabel: 'From $450',
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI and business systems',
    items: [
      {
        title: 'AI readiness audit',
        description: 'Where AI helps vs. where it wastes time.',
        rateLabel: 'From $395',
      },
      {
        title: 'Workflow automation',
        description: 'Quotes, follow-ups, and admin.',
        rateLabel: 'Quoted',
      },
      {
        title: 'CRM configuration',
        description: 'Pipeline and customer records that match how you sell.',
        rateLabel: 'From $650',
      },
      {
        title: 'Integrations and staff training',
        description: 'Connect tools and train the team.',
        rateLabel: 'Quoted',
      },
    ],
  },
];
