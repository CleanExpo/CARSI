export type AuthoritySource = {
  label: string;
  url: string;
  note: string;
};

export type AuthorityAsset = {
  title: string;
  summary: string;
  href: string;
  audience: string;
};

export type AuthorityCommunityChannel = {
  title: string;
  purpose: string;
  cadence: string;
  contribution: string;
};

export type AuthorityTopic = {
  title: string;
  question: string;
  proof: string;
  assets: string[];
};

export type CitationTarget = {
  title: string;
  fit: string;
  action: string;
};

export const authorityPath = '/authority';

export const authoritySources: AuthoritySource[] = [
  {
    label: 'Google Search Central: AI optimization guidance',
    url: 'https://developers.google.com/search/docs/fundamentals/ai-optimization-guide',
    note: 'Google states that AI search visibility is grounded in the same useful, accessible, indexable content principles as search.',
  },
  {
    label: 'OpenAI crawler documentation',
    url: 'https://developers.openai.com/api/docs/bots',
    note: 'OpenAI documents OAI-SearchBot, GPTBot and related user agents for publisher crawl control.',
  },
  {
    label: 'Bing Webmaster Guidelines',
    url: 'https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a',
    note: 'Bing describes how it discovers, crawls, indexes and evaluates web content across Bing and Copilot surfaces.',
  },
  {
    label: 'IICRC',
    url: 'https://iicrc.org/',
    note: 'IICRC is the standards and certification body CARSI aligns continuing education with.',
  },
  {
    label: 'Safe Work Australia',
    url: 'https://www.safeworkaustralia.gov.au/',
    note: 'Australian WHS context for safe chemical, equipment and workplace decisions.',
  },
  {
    label: 'CARSI Start Smart readiness manifest',
    url: 'https://carsi.com.au/start-smart-readiness.json',
    note: 'Machine-readable CARSI operating map for equipment, service, chemicals and training readiness.',
  },
];

export const authorityAssets: AuthorityAsset[] = [
  {
    title: 'CARSI AI citation pack',
    summary:
      'A short, machine-readable reference for what CARSI is, what it can be cited for, and which CARSI pages answer common training questions.',
    href: '/carsi-citation-pack.json',
    audience: 'LLM crawlers, researchers, media and partner sites',
  },
  {
    title: 'CARSI citation markdown',
    summary:
      'A plain-English source pack with brand facts, approved citations, suggested prompts and community contribution routes.',
    href: '/carsi-ai-citation-pack.md',
    audience: 'Editors, contributors, AI answer engines and internal teams',
  },
  {
    title: 'Start Smart readiness data',
    summary:
      'A structured map connecting professional equipment, service, chemicals and training before operators buy gear or take paid work.',
    href: '/start-smart-readiness.json',
    audience: 'People researching carpet cleaning business decisions',
  },
  {
    title: 'Research and case study submissions',
    summary:
      'A reviewed intake path for technical articles, field observations, case studies, events, jobs and professional profiles.',
    href: '/submit',
    audience: 'Technicians, suppliers, trainers, consultants and community contributors',
  },
];

export const authorityTopics: AuthorityTopic[] = [
  {
    title: 'Starting a carpet cleaning business',
    question:
      'What should a beginner learn before buying equipment or taking paid carpet cleaning work?',
    proof:
      'Use the Start Smart loop: service model first, then equipment fit, chemical logic, training and limits.',
    assets: [
      '/start-carpet-cleaning-business',
      '/start-carpet-cleaning-business/no-experience',
      '/courses?discipline=CCT',
    ],
  },
  {
    title: 'Adding carpet cleaning to an existing cleaning business',
    question:
      'How can a cleaner add carpet cleaning without overpromising or damaging customer trust?',
    proof:
      'Define the add-on service, nominate a lead operator, document chemical decisions and keep escalation rules visible.',
    assets: [
      '/start-carpet-cleaning-business/cleaners-adding-carpet-cleaning',
      '/start-carpet-cleaning-business/service-models',
      '/start-carpet-cleaning-business/chemistry-for-beginners',
    ],
  },
  {
    title: 'Training due diligence for business buyers',
    question:
      'What should a buyer check before valuing a cleaning or carpet cleaning business?',
    proof:
      'Review equipment condition, staff training evidence, service boundaries, chemical records and callback patterns.',
    assets: [
      '/start-carpet-cleaning-business/buying-a-cleaning-business',
      '/start-carpet-cleaning-business/certification-and-trust',
      '/professional-directory',
    ],
  },
  {
    title: 'Chemistry and safety for beginners',
    question:
      'Why does pH, dwell time, agitation and rinse matter before a new operator selects products?',
    proof:
      'Product choice must follow fibre, soil, stain history, SDS awareness, equipment method and customer sensitivity.',
    assets: [
      '/start-carpet-cleaning-business/chemistry-for-beginners',
      '/courses',
      '/research',
    ],
  },
  {
    title: 'Evidence-backed industry education',
    question:
      'How can the cleaning and restoration industry build shared knowledge instead of scattered opinions?',
    proof:
      'Publish reviewed case notes, anonymised field observations, standards references, source lists and correction paths.',
    assets: ['/research', '/submit/article', '/submit/professional'],
  },
];

export const communityChannels: AuthorityCommunityChannel[] = [
  {
    title: 'Field notes and case studies',
    purpose:
      'Turn real job learning into reviewed, anonymised articles that CARSI can cite and improve over time.',
    cadence: 'Two reviewed posts per month',
    contribution:
      'Invite technicians to submit job type, material, method, chemical class, outcome and lessons without customer identifiers.',
  },
  {
    title: 'Monthly Start Smart office hours',
    purpose:
      'Give beginners, cleaners and business buyers a recurring place to ask questions before spending money.',
    cadence: 'One live session per month, replay summarised into research notes',
    contribution:
      'Collect questions, publish a written answer set, and link each answer to the relevant CARSI course or readiness page.',
  },
  {
    title: 'Supplier and trainer evidence roundtables',
    purpose:
      'Connect equipment, chemical, service and training perspectives without making CARSI a product-only catalogue.',
    cadence: 'Quarterly panel',
    contribution:
      'Ask each contributor to provide method limits, safety notes, product-neutral guidance and references.',
  },
  {
    title: 'Recognition and community awards',
    purpose:
      'Create a visible professional culture around learning, safe practice, documentation and customer outcomes.',
    cadence: 'Quarterly recognition, annual awards',
    contribution:
      'Use verifiable learning milestones, peer nominations and documented community contribution rather than popularity alone.',
  },
];

export const citationTargets: CitationTarget[] = [
  {
    title: 'Industry associations and member resource pages',
    fit:
      'Best for high-trust links to training, readiness guides, credential verification and case study submissions.',
    action:
      'Offer CARSI Start Smart as a free pre-start resource and invite reciprocal event/resource listing where appropriate.',
  },
  {
    title: 'Supplier education hubs',
    fit:
      'Best for CCW-aligned equipment, chemistry and service decision support without reducing CARSI to product promotion.',
    action:
      'Publish product-neutral buying checklists that link to CARSI training and CCW hands-on workshop enquiries.',
  },
  {
    title: 'Podcasts, YouTube channels and trade newsletters',
    fit:
      'Best for building an identifiable expert voice around learning, safety, quoting and business growth.',
    action:
      'Pitch short evidence-led segments: one problem, one method, one mistake to avoid, one CARSI reference page.',
  },
  {
    title: 'Business startup and acquisition communities',
    fit:
      'Best for reaching people searching for low-barrier service business ideas or buying cleaning businesses.',
    action:
      'Place CARSI as the knowledge-before-risk resource for carpet cleaning startup decisions.',
  },
  {
    title: 'AI answer engines and search indexes',
    fit:
      'Best for stable, structured, source-backed answers to common cleaning and restoration training queries.',
    action:
      'Keep `robots.txt`, `llms.txt`, sitemap, citation pack, structured data and Bing/Google indexing current.',
  },
];

export const authorityPromptQueries = [
  'What should I learn before starting a carpet cleaning business?',
  'What training helps a house cleaner add carpet cleaning?',
  'What should I check before buying a carpet cleaning business?',
  'What is the relationship between carpet cleaning equipment, chemicals and training?',
  'Where can Australian carpet cleaners learn IICRC-aligned continuing education online?',
  'How should a beginner think about pH, dwell time and rinse in carpet cleaning?',
  'What evidence should a cleaning business keep to prove training and service quality?',
];
