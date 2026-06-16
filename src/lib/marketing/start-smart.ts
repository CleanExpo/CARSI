export type StartSmartSource = {
  label: string;
  url: string;
  note: string;
};

export type StartSmartFaq = {
  question: string;
  answer: string;
};

export type StartSmartPage = {
  slug: string;
  title: string;
  shortTitle: string;
  eyebrow: string;
  description: string;
  directAnswer: string;
  audience: string;
  intent: string;
  outcome: string;
  risks: string[];
  learnFirst: string[];
  actionSteps: string[];
  cta: {
    title: string;
    body: string;
    href: string;
    label: string;
  };
  faqs: StartSmartFaq[];
  sources: StartSmartSource[];
  keywords: string[];
};

export type StartSmartReadinessPillar = {
  label: string;
  shortLabel: string;
  summary: string;
  connection: string;
  proofQuestion: string;
  href: string;
};

export type StartSmartOperatingConnection = {
  pillar: StartSmartReadinessPillar['label'];
  impact: string;
  decision: string;
  evidence: string;
};

export const startSmartBasePath = '/start-carpet-cleaning-business';

export const startSmartReadinessLoop: StartSmartReadinessPillar[] = [
  {
    label: 'Professional Equipment',
    shortLabel: 'Equipment',
    summary:
      'Machines, tools and accessories should be chosen from the work you intend to sell, not from horsepower, price or a supplier bundle alone.',
    connection:
      'Equipment follows the service model, must support the chemistry and only performs well when a trained operator understands method, access, drying and maintenance.',
    proofQuestion:
      'Can you explain which jobs this equipment is for, which jobs it is not for and what chemicals or training it depends on?',
    href: `${startSmartBasePath}/equipment-before-you-buy`,
  },
  {
    label: 'Service',
    shortLabel: 'Service',
    summary:
      'The service model is the promise you make to the customer: residential rooms, commercial maintenance, upholstery, rugs, odour, spotting or restoration-adjacent work.',
    connection:
      'Service defines the equipment capacity, chemical range, quoting method, documentation and training depth required before you advertise the offer.',
    proofQuestion:
      'Can you describe the exact service, inclusions, exclusions, risks, aftercare and escalation point before quoting it?',
    href: `${startSmartBasePath}/service-models`,
  },
  {
    label: 'Chemicals',
    shortLabel: 'Chemicals',
    summary:
      'Chemical choice is not a shopping list. It is a decision based on fibre, soil, stain history, pH, dwell time, agitation, rinse, safety and customer sensitivity.',
    connection:
      'Chemicals bridge the service promise and the equipment method, while training keeps product choice from becoming guesswork.',
    proofQuestion:
      'Can you justify the product, dilution, dwell time, rinse and safety controls for the fibre and soil in front of you?',
    href: `${startSmartBasePath}/chemistry-for-beginners`,
  },
  {
    label: 'Training',
    shortLabel: 'Training',
    summary:
      'Training is the decision layer that turns gear, products and a service menu into professional judgement customers can trust.',
    connection:
      'Training connects the other three: it tells you what to buy, what to sell, what to apply and when to stop or escalate.',
    proofQuestion:
      'Can a customer, employer or buyer see evidence that the operator understands the method, risk and limits behind the service?',
    href: '/courses?discipline=CCT',
  },
];

export const startSmartReadinessRules = [
  'Do not buy equipment until the first service model and target job types are clear.',
  'Do not sell a service until the chemistry, method, limits and aftercare can be explained.',
  'Do not choose chemicals without fibre, soil, stain, safety and equipment context.',
  'Do not treat training as optional; it is the link that makes equipment, service and chemicals professional.',
];

export const startSmartOperatingConnectionsBySlug: Record<string, StartSmartOperatingConnection[]> = {
  'no-experience': [
    {
      pillar: 'Professional Equipment',
      impact: 'First-time operators should choose starter equipment only after they know their first job types and access limits.',
      decision: 'Delay major purchases until the learner can explain method, drying, maintenance and which jobs the machine should not be used on.',
      evidence: 'A written job profile, supplier questions and a practice record before paid customer work.',
    },
    {
      pillar: 'Service',
      impact: 'The first service promise should be narrow, low-risk and easy to explain before the operator expands.',
      decision: 'Define inclusions, exclusions, aftercare and escalation before publishing prices.',
      evidence: 'A simple service menu with clear boundaries for stains, odour, rugs, upholstery and restoration-adjacent work.',
    },
    {
      pillar: 'Chemicals',
      impact: 'Beginners need product logic before product volume, because the wrong chemical can damage fibres or trust.',
      decision: 'Select chemicals only after fibre, soil, stain history, pH, dwell, agitation and rinse have been considered.',
      evidence: 'A basic product decision tree and notes from practice on sample materials.',
    },
    {
      pillar: 'Training',
      impact: 'Training is the control layer that turns interest into safer judgement.',
      decision: 'Complete structured learning before taking paid jobs that involve customer property, difficult stains or unclear risks.',
      evidence: 'CARSI course progress, practice notes and a list of situations that require help from a senior technician.',
    },
  ],
  'cleaners-adding-carpet-cleaning': [
    {
      pillar: 'Professional Equipment',
      impact: 'Existing cleaners should not assume general cleaning tools translate to carpet results.',
      decision: 'Choose equipment that matches the add-on service, staff transport, commercial access and drying expectations.',
      evidence: 'A pilot equipment list matched to residential, bond or commercial maintenance work.',
    },
    {
      pillar: 'Service',
      impact: 'Carpet cleaning should be sold as a defined add-on, not a vague extra on a general cleaning invoice.',
      decision: 'Create a pilot offer with intake questions, exclusions and referral rules before rolling it to every customer.',
      evidence: 'A documented add-on workflow that staff can follow without improvising.',
    },
    {
      pillar: 'Chemicals',
      impact: 'Carpet chemistry is different from hard-surface cleaning and needs its own product logic.',
      decision: 'Train staff on fibre, spotting, residue, rinse and safety before they use chemicals in customer homes or facilities.',
      evidence: 'Product notes, SDS awareness and before-after job records from supervised work.',
    },
    {
      pillar: 'Training',
      impact: 'Training lets an existing cleaning team add revenue without weakening trust.',
      decision: 'Nominate a lead operator first, then scale the service after method and quality checks are stable.',
      evidence: 'Lead operator completion records, team checklist adoption and callback tracking.',
    },
  ],
  'buying-a-cleaning-business': [
    {
      pillar: 'Professional Equipment',
      impact: 'Equipment value only matters if it suits the revenue being purchased and is maintained well enough to keep earning.',
      decision: 'Audit condition, service history, consumables and fit for the claimed service mix before valuation.',
      evidence: 'A due diligence equipment register with maintenance notes and replacement risk.',
    },
    {
      pillar: 'Service',
      impact: 'A buyer needs to know whether revenue comes from repeatable services or from seller-dependent know-how.',
      decision: 'Map every service line to staff capability, margin, contracts, complaint history and handover risk.',
      evidence: 'A service capability matrix tied to revenue, staff names or roles, and customer expectations.',
    },
    {
      pillar: 'Chemicals',
      impact: 'Chemical practices can reveal hidden quality, safety or documentation risk in an acquisition.',
      decision: 'Review product range, SDS access, dilution habits, stain promises and how technicians document method choice.',
      evidence: 'Chemical inventory, SDS folder, job notes and callback evidence.',
    },
    {
      pillar: 'Training',
      impact: 'Training records show whether the business has transferable capability after the seller leaves.',
      decision: 'Treat missing training evidence as an operational risk and build a 90-day upskill plan into the acquisition.',
      evidence: 'Certificates, CARSI/IICRC records, staff interviews and post-acquisition training milestones.',
    },
  ],
  'equipment-before-you-buy': [
    {
      pillar: 'Professional Equipment',
      impact: 'This page is the equipment gate: the machine has to fit the service, not the other way around.',
      decision: 'Buy only after target jobs, access, power, water, transport, drying and maintenance are understood.',
      evidence: 'A written equipment brief comparing must-have tools, later upgrades and jobs to avoid.',
    },
    {
      pillar: 'Service',
      impact: 'The service model decides whether a portable, truckmount, spotter, agitation tool or encapsulation setup makes sense.',
      decision: 'Define the first three services before speaking to suppliers or accepting bundle recommendations.',
      evidence: 'A service-to-method map for residential, commercial, upholstery, odour or restoration-adjacent work.',
    },
    {
      pillar: 'Chemicals',
      impact: 'Equipment performance depends on compatible chemistry, dwell, agitation, extraction and rinse.',
      decision: 'Check chemical compatibility and residue controls before choosing the machine and accessories.',
      evidence: 'Supplier questions covering chemical range, training needs and method limits.',
    },
    {
      pillar: 'Training',
      impact: 'Training helps the buyer understand what sales brochures leave out.',
      decision: 'Use CARSI learning to separate genuine operating needs from marketing claims.',
      evidence: 'Course notes that explain method choice, maintenance, risk and customer communication.',
    },
  ],
  'chemistry-for-beginners': [
    {
      pillar: 'Professional Equipment',
      impact: 'Chemistry changes how equipment is used, rinsed and maintained.',
      decision: 'Choose tools and processes that support the products, fibres and rinse standards required by the job.',
      evidence: 'Method notes linking product, dilution, dwell, agitation, rinse and drying.',
    },
    {
      pillar: 'Service',
      impact: 'The service promise must match what chemistry can safely achieve.',
      decision: 'Qualify stain, odour and restoration promises before the customer hears a guarantee.',
      evidence: 'Customer intake and limitation wording for common stains, fibres and sensitivities.',
    },
    {
      pillar: 'Chemicals',
      impact: 'This page is the chemical decision gate: product choice follows inspection, not habit.',
      decision: 'Assess fibre, soil, stain history, pH, dwell, agitation, rinse, safety and sensitivity before applying product.',
      evidence: 'A chemical decision tree, SDS access and documented product choices.',
    },
    {
      pillar: 'Training',
      impact: 'Training keeps chemical selection from becoming trial and error on customer property.',
      decision: 'Practise and learn the logic before using stronger products or promising difficult outcomes.',
      evidence: 'CARSI learning records and supervised practice on sample materials.',
    },
  ],
  'quoting-and-pricing': [
    {
      pillar: 'Professional Equipment',
      impact: 'Pricing must recover the real cost of equipment ownership, transport, setup, consumables and maintenance.',
      decision: 'Include equipment time and limitations in the quote instead of pricing only by room count.',
      evidence: 'A quote checklist that includes setup, pack-down, drying and access constraints.',
    },
    {
      pillar: 'Service',
      impact: 'The quote is the written version of the service promise.',
      decision: 'Separate base service, add-ons, exclusions and escalation before the customer approves work.',
      evidence: 'Quote templates with inclusions, exclusions, aftercare and limitation language.',
    },
    {
      pillar: 'Chemicals',
      impact: 'Chemical complexity changes cost, risk and customer expectations.',
      decision: 'Price spotting, odour, residue, sensitivity and special product requirements separately when needed.',
      evidence: 'Job notes showing product choice, dilution, dwell and extra risk factors.',
    },
    {
      pillar: 'Training',
      impact: 'Training supports confident explanations that justify professional pricing.',
      decision: 'Use technical understanding to compete on trust and process, not only cheap prices.',
      evidence: 'Credentials, clear inspection language and tracked margins from early jobs.',
    },
  ],
  'certification-and-trust': [
    {
      pillar: 'Professional Equipment',
      impact: 'Customers trust equipment more when the operator can explain why it is suitable.',
      decision: 'Avoid using machine ownership as a substitute for competence.',
      evidence: 'Visible training records and plain-English method explanations.',
    },
    {
      pillar: 'Service',
      impact: 'Trust is earned when the service promise is honest about limits, credentials and local requirements.',
      decision: 'Present CARSI, CECs and IICRC-aligned learning accurately without overstating legal status.',
      evidence: 'Website, quote and credential wording that avoids licence or RTO confusion.',
    },
    {
      pillar: 'Chemicals',
      impact: 'Chemical safety and limitation language is a trust signal, especially for homes, facilities and sensitive occupants.',
      decision: 'Explain product choices and safety controls without making unsupported stain or health claims.',
      evidence: 'SDS awareness, customer notes and documented limitations.',
    },
    {
      pillar: 'Training',
      impact: 'This page is the trust gate: education must be visible, accurate and applied.',
      decision: 'Keep certificates, continuing education and credential records available for customers, employers and buyers.',
      evidence: 'CARSI records, IICRC CEC references and public credential verification where applicable.',
    },
  ],
  'service-models': [
    {
      pillar: 'Professional Equipment',
      impact: 'Each service model needs a different equipment profile.',
      decision: 'Match tools to residential, commercial, upholstery, rug, odour or restoration-adjacent work before expanding.',
      evidence: 'A service-to-equipment matrix with must-have tools and deferred upgrades.',
    },
    {
      pillar: 'Service',
      impact: 'This page is the service gate: the niche defines the promise and risk.',
      decision: 'Choose one primary model and one add-on before trying to sell every service at once.',
      evidence: 'A 90-day service menu with boundaries, aftercare and referral rules.',
    },
    {
      pillar: 'Chemicals',
      impact: 'Different service models change chemical range, safety controls and documentation.',
      decision: 'Select products for the chosen niche instead of carrying a broad range with unclear use cases.',
      evidence: 'Product notes linked to each service model and job type.',
    },
    {
      pillar: 'Training',
      impact: 'Training decides when a service model is ready to sell and when it needs escalation.',
      decision: 'Close knowledge gaps before adding rugs, upholstery, odour, commercial maintenance or restoration-adjacent work.',
      evidence: 'A staged learning plan tied to each service expansion.',
    },
  ],
};

export const startSmartSources = {
  iicrcCct: {
    label: 'IICRC Carpet Cleaning Technician (CCT)',
    url: 'https://iicrc.org/cct/',
    note: 'Covers fibre, yarn and carpet construction, soiling, cleaning science, methodology and troubleshooting.',
  },
  bizCoverStartup: {
    label: 'BizCover: starting a carpet cleaning business',
    url: 'https://www.bizcover.com.au/blog/starting-carpet-cleaning-business/',
    note: 'Frames training, business planning, registration, insurance and equipment as early startup decisions.',
  },
  issaTraining: {
    label: 'ISSA: training for carpet cleaning',
    url: 'https://www.issa.com/articles/training-for-carpet-cleaning/',
    note: 'Positions carpet cleaning training as knowledge across fibres, chemistry, equipment and safety.',
  },
  serviceMonsterProfit: {
    label: 'ServiceMonster: carpet cleaning profitability',
    url: 'https://www.servicemonster.com/blog/is-carpet-cleaning-profitable',
    note: 'Summarises startup costs, equipment, pricing, repeat customers and add-on service strategy.',
  },
  aspireBuying: {
    label: 'Aspire: buying a cleaning business',
    url: 'https://www.youraspire.com/blog/how-to-buy-cleaning-business',
    note: 'Highlights due diligence areas such as financial health, contracts, client retention, liabilities and operations.',
  },
  carsiPricing: {
    label: 'CARSI pricing',
    url: 'https://carsi.com.au/pricing',
    note: 'CARSI offers online restoration and cleaning education with memberships, course access and credential tracking.',
  },
};

export const startSmartPages: StartSmartPage[] = [
  {
    slug: 'no-experience',
    title: 'Start a Carpet Cleaning Business With No Experience',
    shortTitle: 'No Experience Starter',
    eyebrow: 'For first-time operators',
    description:
      'A practical CARSI pathway for people exploring carpet cleaning as a low-barrier service business before they buy equipment or take paid jobs.',
    directAnswer:
      'You can start learning carpet cleaning without prior experience, but you should understand fibres, soil, chemistry, equipment limits, quoting and safety before taking customer work.',
    audience: 'New starters, career changers, side-hustle operators and people researching low-cost service businesses.',
    intent: 'Help beginners move from interest to informed action without selling them a get-rich-quick promise.',
    outcome: 'Know what to learn first, what to practise, what equipment questions to ask and when to seek hands-on mentoring.',
    risks: [
      'Buying a machine before understanding job types, fibre risks or chemical limits.',
      'Underquoting jobs because setup, drying, travel, spotting and callbacks are not priced.',
      'Damaging carpet, upholstery or customer trust through poor inspection and method choice.',
      'Relying only on YouTube or AI prompts without structured training or practical supervision.',
    ],
    learnFirst: [
      'Carpet construction, fibre behaviour and common soiling conditions.',
      'The difference between cleaning methods such as hot water extraction, encapsulation and spot treatment.',
      'Basic cleaning chemistry, pH, dwell time, agitation and rinse principles.',
      'Customer intake, site inspection, quoting and expectation setting.',
      'When a job is outside your current competence and needs a senior technician or specialist referral.',
    ],
    actionSteps: [
      'Complete a beginner CARSI learning pathway before purchasing major equipment.',
      'Practise on sample carpet and non-customer environments before paid work.',
      'Create a simple service menu with clear inclusions, exclusions and escalation rules.',
      'Talk to an equipment supplier after you know the job types you want to serve.',
    ],
    cta: {
      title: 'Build knowledge before you buy gear',
      body: 'Use CARSI to understand the work, the language and the risk areas before committing capital.',
      href: '/courses?discipline=CCT',
      label: 'Explore carpet cleaning courses',
    },
    faqs: [
      {
        question: 'Can I start carpet cleaning with no experience?',
        answer:
          'You can begin learning with no experience, but taking paid jobs without training is risky. Start with carpet basics, cleaning chemistry, equipment selection, inspection and quoting before working in customer homes.',
      },
      {
        question: 'Should I buy equipment before training?',
        answer:
          'Training should come first. It helps you understand which machine suits your target jobs, which chemicals are appropriate and what mistakes can damage carpet or margins.',
      },
      {
        question: 'Is CARSI a get-rich-quick business course?',
        answer:
          'No. CARSI is positioned as professional education. The goal is to help you understand the work before you risk money, reputation or customer property.',
      },
    ],
    sources: [startSmartSources.iicrcCct, startSmartSources.bizCoverStartup, startSmartSources.issaTraining],
    keywords: [
      'start carpet cleaning business no experience',
      'carpet cleaning business training',
      'carpet cleaning startup course',
      'learn carpet cleaning online',
    ],
  },
  {
    slug: 'cleaners-adding-carpet-cleaning',
    title: 'Add Carpet Cleaning to an Existing Cleaning Business',
    shortTitle: 'Cleaners Adding Services',
    eyebrow: 'For cleaners with existing customers',
    description:
      'A CARSI guide for house cleaners, bond cleaners, commercial cleaners and facility teams who want to add carpet cleaning safely.',
    directAnswer:
      'Existing cleaners have a strong advantage because they already have customers, but carpet cleaning adds fibre, chemistry, equipment and liability decisions that general cleaning does not cover.',
    audience: 'Residential cleaners, bond cleaners, commercial cleaners, janitorial operators and facility teams.',
    intent: 'Convert existing cleaning audiences into educated carpet cleaning upskill leads.',
    outcome: 'Add carpet cleaning as a service without guessing at chemistry, pricing, equipment or job boundaries.',
    risks: [
      'Treating carpet like a general surface and using the wrong product or method.',
      'Adding a service before staff know inspection, pre-test and customer disclosure steps.',
      'Buying entry equipment that cannot deliver the expected commercial result.',
      'Offering carpet cleaning without adjusting insurance, job records or aftercare instructions.',
    ],
    learnFirst: [
      'How carpet differs from hard floors, upholstery and general cleaning surfaces.',
      'Spotting, pre-spray, extraction, encapsulation and drying considerations.',
      'Job intake questions for pets, stains, odour, flooding, mould concerns and previous treatments.',
      'How to quote add-on carpet jobs without eroding existing cleaning margins.',
      'What to document before and after the job for customer trust.',
    ],
    actionSteps: [
      'Create a pilot add-on service for low-risk residential or commercial maintenance jobs.',
      'Train one lead operator before rolling the service out to the whole team.',
      'Use CARSI modules to standardise terms, inspection habits and escalation rules.',
      'Build a referral loop to specialists for jobs outside your scope.',
    ],
    cta: {
      title: 'Turn existing customers into better opportunities',
      body: 'CARSI can help your cleaning team add carpet cleaning with more discipline and less guesswork.',
      href: '/courses?discipline=CCT',
      label: 'Start the CCT pathway',
    },
    faqs: [
      {
        question: 'Is carpet cleaning a good add-on for house cleaners?',
        answer:
          'It can be, especially when you already have customer trust. The key is learning carpet-specific inspection, chemistry, equipment limits and pricing before offering the service broadly.',
      },
      {
        question: 'Can commercial cleaners add carpet cleaning?',
        answer:
          'Yes, but commercial carpet maintenance often needs a different service model, schedule and method choice than one-off residential jobs.',
      },
      {
        question: 'What should cleaners learn first?',
        answer:
          'Start with fibre identification, soiling, cleaning chemistry, method selection, safety, drying and customer communication.',
      },
    ],
    sources: [startSmartSources.iicrcCct, startSmartSources.issaTraining, startSmartSources.serviceMonsterProfit],
    keywords: [
      'add carpet cleaning to cleaning business',
      'cleaners adding carpet cleaning',
      'commercial cleaner carpet cleaning training',
      'janitorial carpet cleaning course',
    ],
  },
  {
    slug: 'buying-a-cleaning-business',
    title: 'Buying a Carpet Cleaning or Cleaning Business: Training Due Diligence',
    shortTitle: 'Business Buyer Due Diligence',
    eyebrow: 'For acquisition research',
    description:
      'A due diligence guide for buyers assessing a carpet cleaning, commercial cleaning or restoration business before purchase.',
    directAnswer:
      'Before buying a cleaning or carpet cleaning business, assess not only revenue and equipment, but also staff skill, repeat work, training records, methods, liabilities and whether the owner is the real operating system.',
    audience: 'Business buyers, investors, operators acquiring a local cleaning company and family buyers considering a small service business.',
    intent: 'Insert CARSI as a trusted education checkpoint in the business sales and acquisition journey.',
    outcome: 'Know which operational and training questions to ask before signing a deal.',
    risks: [
      'Buying revenue that depends entirely on the seller or one technician.',
      'Overvaluing equipment without checking condition, maintenance or fit for target work.',
      'Missing hidden liabilities from poor workmanship, uninsured work or weak documentation.',
      'Assuming staff are trained because the business has been operating for years.',
    ],
    learnFirst: [
      'The technical services the business actually performs and which ones drive margin.',
      'Whether staff can explain method choice, chemistry, drying, odour and escalation decisions.',
      'What records exist for training, certificates, complaints, callbacks and repeat clients.',
      'How equipment, chemicals, service areas and pricing support the claimed revenue.',
      'Which CARSI or IICRC-aligned learning gaps should be closed after acquisition.',
    ],
    actionSteps: [
      'Audit the service menu against staff capability and equipment condition.',
      'Ask for training evidence, not only sales reports.',
      'Create a 90-day upskill plan for the acquired team.',
      'Use CARSI as a post-acquisition standardisation layer for terminology and processes.',
    ],
    cta: {
      title: 'Do not buy blind',
      body: 'Use training due diligence to understand whether the business has transferable skill or just seller knowledge.',
      href: '/contact',
      label: 'Ask CARSI about team training',
    },
    faqs: [
      {
        question: 'What training questions should I ask before buying a cleaning business?',
        answer:
          'Ask what formal and informal training staff have completed, which methods they use, how quality is checked, how callbacks are handled and whether certificates or training records can be verified.',
      },
      {
        question: 'Why does training matter in a business acquisition?',
        answer:
          'Training affects customer retention, quality control, risk, staff independence and whether the business can keep operating after the seller leaves.',
      },
      {
        question: 'Can CARSI help after buying a business?',
        answer:
          'CARSI can support post-acquisition upskilling by giving staff a common education baseline in cleaning and restoration topics.',
      },
    ],
    sources: [startSmartSources.aspireBuying, startSmartSources.serviceMonsterProfit, startSmartSources.iicrcCct],
    keywords: [
      'buy carpet cleaning business due diligence',
      'buy cleaning business training',
      'carpet cleaning business acquisition',
      'cleaning business staff training',
    ],
  },
  {
    slug: 'equipment-before-you-buy',
    title: 'Carpet Cleaning Equipment: What Beginners Should Know Before Buying',
    shortTitle: 'Equipment Before Buying',
    eyebrow: 'For equipment research',
    description:
      'A beginner equipment guide that helps new operators understand job type, method, chemistry and training before purchasing machinery.',
    directAnswer:
      'The best carpet cleaning equipment depends on the work you plan to do. Beginners should learn methods, job types, fibre risks, chemistry and maintenance before buying extractors, spotters, rotary machines or truckmounts.',
    audience: 'Prospective operators comparing machines, chemicals, accessories and startup packages.',
    intent: 'Capture equipment research traffic and route it toward education before purchase decisions.',
    outcome: 'Ask better equipment questions and avoid buying machinery that does not fit your first market.',
    risks: [
      'Buying for power or price instead of target job type.',
      'Ignoring maintenance, transport, electrical, water access and drying constraints.',
      'Using equipment without understanding chemistry, agitation or dwell time.',
      'Assuming the machine solves customer trust, quoting or inspection problems.',
    ],
    learnFirst: [
      'Residential versus commercial maintenance needs.',
      'Portable extractors, truckmounts, spotters, agitation tools and encapsulation systems.',
      'Chemical compatibility, residue, drying and odour considerations.',
      'Maintenance, warranties, consumables and total cost of ownership.',
      'How training changes the equipment conversation with suppliers.',
    ],
    actionSteps: [
      'Define the first three job types you want to serve.',
      'Map each job type to method, equipment, chemical and time requirements.',
      'Use training to separate must-have tools from later upgrades.',
      'Speak to a trusted supplier with a written job profile, not a vague wish list.',
    ],
    cta: {
      title: 'Learn the work before the machine',
      body: 'A machine is only useful when the operator understands why, when and how to use it.',
      href: '/ccw-training',
      label: 'View CCW-linked training',
    },
    faqs: [
      {
        question: 'What carpet cleaning machine should a beginner buy?',
        answer:
          'There is no single beginner machine for every operator. The right choice depends on residential or commercial work, access, drying expectations, budget, maintenance and the cleaning method you plan to offer.',
      },
      {
        question: 'Should I rent or buy carpet cleaning equipment first?',
        answer:
          'Renting, practising and learning can reduce the chance of buying the wrong equipment. Training helps you understand whether a purchase suits the jobs you want.',
      },
      {
        question: 'Does training help with equipment selection?',
        answer:
          'Yes. Training gives you the vocabulary and method knowledge to ask better supplier questions and avoid buying based only on price or marketing claims.',
      },
    ],
    sources: [startSmartSources.bizCoverStartup, startSmartSources.issaTraining, startSmartSources.serviceMonsterProfit],
    keywords: [
      'carpet cleaning equipment for beginners',
      'best carpet cleaning machine startup',
      'carpet cleaning equipment training',
      'before buying carpet cleaning machine',
    ],
  },
  {
    slug: 'chemistry-for-beginners',
    title: 'Carpet Cleaning Chemistry for Beginners',
    shortTitle: 'Chemistry for Beginners',
    eyebrow: 'For safer method choice',
    description:
      'A beginner-friendly guide to why carpet cleaning chemistry matters before paid work, equipment purchases or chemical selection.',
    directAnswer:
      'Carpet cleaning chemistry matters because soil, fibre, stain type, pH, dwell time, agitation and rinsing all affect whether a job is safe, effective and profitable.',
    audience: 'New operators, cleaners adding carpet cleaning and staff who need a practical language for chemical decisions.',
    intent: 'Own beginner chemistry searches with a clear, safe, non-hype CARSI resource.',
    outcome: 'Understand why products are not interchangeable and why inspection comes before chemical choice.',
    risks: [
      'Using a strong product because it worked on a different surface or stain.',
      'Leaving residue that attracts soil or creates customer complaints.',
      'Ignoring fibre type, dye stability, pH or previous treatments.',
      'Promising stain removal without first identifying risk and limitations.',
    ],
    learnFirst: [
      'Soil suspension, pH, dwell time, agitation and rinse principles.',
      'Why fibre identification and pre-testing affect chemical selection.',
      'Spotting versus general cleaning and why stains can return.',
      'Safety data sheets, PPE and ventilation basics.',
      'How to explain limitations to customers before the job starts.',
    ],
    actionSteps: [
      'Build a small decision tree for common soil and stain scenarios.',
      'Practise on sample materials before paid work.',
      'Document product choice, dilution, dwell time and result.',
      'Use CARSI courses to connect chemistry to method and customer outcomes.',
    ],
    cta: {
      title: 'Chemistry is part of professionalism',
      body: 'Learn the logic behind products so you can make safer decisions on real jobs.',
      href: '/courses?discipline=CCT',
      label: 'Study carpet cleaning basics',
    },
    faqs: [
      {
        question: 'Do beginners need to learn carpet cleaning chemistry?',
        answer:
          'Yes. You do not need to become a chemist, but you do need enough knowledge to choose products safely, avoid residue and understand why some stains or fibres need caution.',
      },
      {
        question: 'What is pH in carpet cleaning?',
        answer:
          'pH helps describe how acidic or alkaline a cleaning solution is. It matters because product strength, fibre type, dye stability and rinsing can all affect the result.',
      },
      {
        question: 'Can I use one chemical for every carpet job?',
        answer:
          'No. Job conditions vary. Fibre, soil, stain history, odour, customer sensitivity and method all influence product selection.',
      },
    ],
    sources: [startSmartSources.iicrcCct, startSmartSources.issaTraining],
    keywords: [
      'carpet cleaning chemistry for beginners',
      'carpet cleaning pH training',
      'carpet stain chemistry course',
      'learn carpet cleaning chemicals',
    ],
  },
  {
    slug: 'quoting-and-pricing',
    title: 'How to Quote Carpet Cleaning Jobs Without Losing Money',
    shortTitle: 'Quoting and Pricing',
    eyebrow: 'For business confidence',
    description:
      'A practical quoting guide for new carpet cleaners who need to price time, risk, setup, travel, drying, spotting and customer expectations.',
    directAnswer:
      'A good carpet cleaning quote prices the job scope, access, soil level, spotting risk, travel, setup, drying expectations, chemicals and aftercare - not just the number of rooms.',
    audience: 'New owners, side-hustle operators, cleaners adding carpet services and business buyers reviewing service menus.',
    intent: 'Capture commercial intent around pricing and route it into CARSI business training.',
    outcome: 'Build a quote that protects margin and sets customer expectations before work begins.',
    risks: [
      'Charging per room without accounting for soil, access, stains, furniture or travel.',
      'Promising stain or odour outcomes that should have been qualified.',
      'Forgetting setup, pack-down, chemical use, drying and admin time.',
      'Competing only on cheap prices instead of trust and process.',
    ],
    learnFirst: [
      'How inspection changes the price.',
      'Residential, commercial, upholstery, rug and restoration-adjacent differences.',
      'How to price add-ons, minimum callouts and repeat maintenance.',
      'How to explain limitations, exclusions and aftercare.',
      'How training and credentials support premium positioning.',
    ],
    actionSteps: [
      'Create a quote checklist before publishing prices.',
      'Separate base service, add-ons and exclusions.',
      'Track time and margin on every early job.',
      'Use CARSI business modules to improve quoting language and customer trust.',
    ],
    cta: {
      title: 'Price the work like a professional',
      body: 'Training helps new operators quote with more confidence and fewer costly surprises.',
      href: '/pricing',
      label: 'View CARSI membership options',
    },
    faqs: [
      {
        question: 'How should beginners quote carpet cleaning?',
        answer:
          'Beginners should quote from a checklist: room size, soil level, stain risk, access, travel, setup, chemicals, drying, furniture movement, aftercare and exclusions.',
      },
      {
        question: 'Is per-room pricing enough?',
        answer:
          'Per-room pricing is simple but can undercharge complex jobs. Use it carefully and define what is included, what costs extra and when inspection changes the quote.',
      },
      {
        question: 'Can training help me charge more?',
        answer:
          'Training can support clearer inspection, better explanations and more credible service positioning, which helps you compete on trust rather than only price.',
      },
    ],
    sources: [startSmartSources.serviceMonsterProfit, startSmartSources.bizCoverStartup],
    keywords: [
      'how to quote carpet cleaning jobs',
      'carpet cleaning pricing beginner',
      'carpet cleaning business pricing',
      'quote carpet cleaning without losing money',
    ],
  },
  {
    slug: 'certification-and-trust',
    title: 'Do You Need Certification to Clean Carpets?',
    shortTitle: 'Certification and Trust',
    eyebrow: 'For trust-building',
    description:
      'A practical explanation of carpet cleaning certification, continuing education and customer trust for new or growing operators.',
    directAnswer:
      'Many places do not require a formal licence just to clean carpets, but training and recognised education help build customer trust, improve decisions and support commercial or insurer-facing work.',
    audience: 'Beginners, cleaners, employers, property managers and buyers comparing training options.',
    intent: 'Answer certification questions without overstating CARSI as an RTO or licence provider.',
    outcome: 'Understand the difference between legal permission, professional education, CECs and customer trust.',
    risks: [
      'Assuming no licence means no training is needed.',
      'Overclaiming credentials or confusing CECs with nationally accredited VET qualifications.',
      'Missing commercial client expectations for documented competence.',
      'Using certification as a badge without applying the learning on real jobs.',
    ],
    learnFirst: [
      'What IICRC and CECs are in the cleaning and restoration sector.',
      'What CARSI does and does not provide.',
      'How to present training honestly in marketing and quotes.',
      'Why customers, insurers and property managers value evidence of competence.',
      'How continuing education supports long-term professionalism.',
    ],
    actionSteps: [
      'Check your local legal and insurance requirements before operating.',
      'Complete relevant CARSI training for your service path.',
      'Keep certificates and training records available for customers or employers.',
      'Avoid claiming licences or qualifications you do not hold.',
    ],
    cta: {
      title: 'Build trust the honest way',
      body: 'CARSI helps learners track training and credentials without pretending education replaces local compliance.',
      href: '/testimonials',
      label: 'See student outcomes',
    },
    faqs: [
      {
        question: 'Do I need certification to clean carpets?',
        answer:
          'Requirements vary by location and job type. Even where formal certification is not legally required, training can help you work more safely, explain your process and build trust.',
      },
      {
        question: 'Is CARSI an RTO?',
        answer:
          'No. CARSI provides online continuing education and IICRC-aligned CEC training. It does not award nationally accredited VET qualifications.',
      },
      {
        question: 'Why do customers care about training?',
        answer:
          'Training gives customers evidence that you understand the work, not just the equipment. It can help when quoting, explaining risk and winning more serious accounts.',
      },
    ],
    sources: [startSmartSources.iicrcCct, startSmartSources.carsiPricing],
    keywords: [
      'do you need certification to clean carpets',
      'carpet cleaning certification Australia',
      'IICRC CCT training',
      'CARSI CEC carpet cleaning',
    ],
  },
  {
    slug: 'service-models',
    title: 'Carpet Cleaning Business Models: Residential, Commercial, Upholstery and Restoration',
    shortTitle: 'Service Models',
    eyebrow: 'For choosing a niche',
    description:
      'A guide to carpet cleaning service models and the training questions behind residential, commercial, upholstery, rug, odour and restoration-adjacent work.',
    directAnswer:
      'Carpet cleaning is not one business model. Residential rooms, commercial maintenance, upholstery, rugs, odour, pet issues and restoration-adjacent jobs each need different training, equipment, quoting and risk controls.',
    audience: 'Starters choosing a niche, cleaners expanding services and business buyers reviewing growth options.',
    intent: 'Help CARSI appear for broad business-model and niche-selection queries.',
    outcome: 'Choose a first service model based on skill, market, equipment, risk and repeatability.',
    risks: [
      'Trying every service too early and becoming average at all of them.',
      'Taking restoration-adjacent work without moisture, drying or microbial knowledge.',
      'Underestimating commercial scheduling, documentation and maintenance plans.',
      'Selling add-ons without knowing their technical and customer-service requirements.',
    ],
    learnFirst: [
      'Residential maintenance and move-out cleaning basics.',
      'Commercial carpet maintenance schedules and method choice.',
      'Upholstery, rug, pet stain and odour boundaries.',
      'When water damage, mould or structural drying knowledge becomes relevant.',
      'How to build a staged learning pathway instead of a scattered service menu.',
    ],
    actionSteps: [
      'Pick one primary market and one add-on for the first 90 days.',
      'Map the skills, equipment and risk controls for that market.',
      'Use CARSI to close knowledge gaps before expanding.',
      'Review customer demand and margin before adding the next service.',
    ],
    cta: {
      title: 'Choose the service model before the marketing',
      body: 'CARSI helps you understand which service path you are actually preparing for.',
      href: '/pathways',
      label: 'Browse learning pathways',
    },
    faqs: [
      {
        question: 'What is the best carpet cleaning niche for beginners?',
        answer:
          'The best niche depends on your market, equipment, budget and skill level. Many beginners start with lower-risk residential or maintenance work before moving into complex stains, odour, rugs, commercial contracts or restoration-adjacent services.',
      },
      {
        question: 'Can carpet cleaners move into restoration?',
        answer:
          'Some do, but restoration work introduces moisture, drying, microbial, insurance and documentation requirements. It should be treated as a separate capability path, not a casual add-on.',
      },
      {
        question: 'Why choose a niche first?',
        answer:
          'A focused niche helps you buy suitable equipment, train properly, quote consistently and market with clearer promises.',
      },
    ],
    sources: [startSmartSources.serviceMonsterProfit, startSmartSources.iicrcCct, startSmartSources.issaTraining],
    keywords: [
      'carpet cleaning business models',
      'residential carpet cleaning business',
      'commercial carpet cleaning business',
      'carpet cleaning niches',
    ],
  },
];

export function getStartSmartPage(slug: string) {
  return startSmartPages.find((page) => page.slug === slug);
}

export function getStartSmartOperatingConnections(slug: string): StartSmartOperatingConnection[] {
  return (
    startSmartOperatingConnectionsBySlug[slug] ??
    startSmartReadinessLoop.map((pillar) => ({
      pillar: pillar.label,
      impact: pillar.connection,
      decision: pillar.summary,
      evidence: pillar.proofQuestion,
    }))
  );
}

export function getStartSmartPageFaqs(page: StartSmartPage): StartSmartFaq[] {
  const readinessAnswer = getStartSmartOperatingConnections(page.slug)
    .map(({ pillar, impact }) => `${pillar}: ${impact}`)
    .join(' ');

  return [
    ...page.faqs,
    {
      question: `How does ${page.shortTitle.toLowerCase()} connect equipment, service, chemicals and training?`,
      answer: readinessAnswer,
    },
  ];
}

export const startSmartHubFaqs = [
  {
    question: 'What is the CARSI Start Smart pathway?',
    answer:
      'Start Smart is a CARSI content pathway for people researching carpet cleaning as a business, add-on service or acquisition. It explains the knowledge to build before spending money or taking customer work.',
  },
  {
    question: 'Who is this pathway for?',
    answer:
      'It is for no-experience starters, existing cleaners, business buyers, side-hustle operators, equipment researchers and teams that need a structured carpet cleaning knowledge baseline.',
  },
  {
    question: 'Does CARSI replace hands-on practice?',
    answer:
      'No. CARSI helps build technical and business understanding. Practical supervision, local compliance checks and real-world practice are still important before paid work.',
  },
  {
    question: 'How do professional equipment, service, chemicals and training connect?',
    answer:
      'They should be treated as one operating system. The service model defines the work, equipment supports the method, chemicals solve the fibre and soil problem, and training connects the decisions so the operator can work safely, quote honestly and know when to escalate.',
  },
  {
    question: 'Can learners use CARSI from outside Australia?',
    answer:
      'Yes. CARSI is online and useful globally as a trusted education resource, but learners should always check local legal, insurance and certification requirements in their own market.',
  },
];

export const startSmartHubKeywords = [
  'start carpet cleaning business',
  'carpet cleaning business training',
  'carpet cleaning startup',
  'cleaners adding carpet cleaning',
  'buy carpet cleaning business',
  'carpet cleaning equipment for beginners',
  'carpet cleaning chemistry',
  'carpet cleaning certification',
  'professional carpet cleaning equipment',
  'carpet cleaning chemicals training',
  'carpet cleaning service model',
];
