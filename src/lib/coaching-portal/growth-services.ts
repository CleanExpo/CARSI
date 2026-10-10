/** Optional implementation services (not included in $495/mo coaching). Rates are indicative — final quotes confirmed in writing. */
export type GrowthServiceItem = {
  id: string;
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
        id: 'web-audit',
        title: 'Website audit',
        description: 'Review positioning, speed, and conversion basics.',
        rateLabel: 'From $295',
      },
      {
        id: 'web-build',
        title: 'Website development or redesign',
        description: 'Done-with-you or done-for-you builds.',
        rateLabel: 'From $2,500',
      },
      {
        id: 'web-maintenance',
        title: 'Website maintenance',
        description: 'Updates, security, and content changes.',
        rateLabel: 'From $149/mo',
      },
      {
        id: 'gbp-optimisation',
        title: 'Google Business Profile optimisation',
        description: 'Categories, photos, posts, and local visibility.',
        rateLabel: 'From $450',
      },
      {
        id: 'web-gbp-sprint',
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
        id: 'seo-local',
        title: 'SEO audit and local SEO',
        description: 'Practical fixes for how locals find you.',
        rateLabel: 'From $495',
      },
      {
        id: 'content-opt',
        title: 'Content optimisation',
        description: 'Service pages and offers that convert.',
        rateLabel: 'From $395',
      },
      {
        id: 'social-mgmt',
        title: 'Social media management',
        description: 'Rhythm and creative aligned to your business.',
        rateLabel: 'From $750/mo',
      },
      {
        id: 'google-ads',
        title: 'Google Ads',
        description: 'Campaign setup and optimisation with clear ROI targets.',
        rateLabel: 'From $350/mo + spend',
      },
      {
        id: 'marketing-strategy',
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
        id: 'ai-audit',
        title: 'AI readiness audit',
        description: 'Where AI helps vs. where it wastes time.',
        rateLabel: 'From $395',
      },
      {
        id: 'workflow-automation',
        title: 'Workflow automation',
        description: 'Quotes, follow-ups, and admin.',
        rateLabel: 'Quoted',
      },
      {
        id: 'crm-config',
        title: 'CRM configuration',
        description: 'Pipeline and customer records that match how you sell.',
        rateLabel: 'From $650',
      },
      {
        id: 'integrations-training',
        title: 'Integrations and staff training',
        description: 'Connect tools and train the team.',
        rateLabel: 'Quoted',
      },
    ],
  },
];

export function findGrowthServiceById(
  serviceId: string
): { category: GrowthServiceCategory; item: GrowthServiceItem } | null {
  const id = serviceId.trim();
  for (const category of COACHING_GROWTH_SERVICE_CATEGORIES) {
    const item = category.items.find((i) => i.id === id);
    if (item) return { category, item };
  }
  return null;
}
