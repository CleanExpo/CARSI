import type { LucideIcon } from 'lucide-react';
import { Building2, HeartHandshake, HeartPulse, Hotel, Sparkles } from 'lucide-react';

export type FeaturedIndustrySlug =
  'healthcare' | 'aged-care' | 'hospitality' | 'government-defence' | 'commercial-cleaning';

export type FeaturedIndustryLink = {
  slug: FeaturedIndustrySlug;
  href: string;
  label: string;
  title: string;
  detail: string;
  icon: LucideIcon;
};

export const featuredIndustryLinks: FeaturedIndustryLink[] = [
  {
    slug: 'healthcare',
    href: '/industries/healthcare',
    label: 'Healthcare',
    title: 'Hospitals & clinical facilities',
    detail:
      'Mould, indoor air quality and water-damage training for crews working hospitals and clinics',
    icon: HeartPulse,
  },
  {
    slug: 'aged-care',
    href: '/industries/aged-care',
    label: 'Aged Care',
    title: 'Residential care facilities',
    detail:
      'Infection control, mould and carpet hygiene training for crews servicing aged care sites',
    icon: HeartHandshake,
  },
  {
    slug: 'hospitality',
    href: '/industries/hospitality',
    label: 'Hotels & Resorts',
    title: 'Guest-first property teams',
    detail: 'Water damage, carpet care, structural drying and odour control for hospitality',
    icon: Hotel,
  },
  {
    slug: 'government-defence',
    href: '/industries/government-defence',
    label: 'Government & Defence',
    title: 'Public sector accountability',
    detail: 'WHS-compliant training for councils, agencies and defence facilities',
    icon: Building2,
  },
  {
    slug: 'commercial-cleaning',
    href: '/industries/commercial-cleaning',
    label: 'Commercial Cleaning',
    title: 'Contractor growth & panels',
    detail:
      'carpet repair, carpet cleaning and odour control credentials for insurance work and tender differentiation',
    icon: Sparkles,
  },
];

export type IndustryAddonPanel = {
  name: string;
  requirement: string;
};

export type IndustryUpgradeRow = {
  base: string;
  addon: string;
  benefit: string;
};

export type IndustryAddonVariant = FeaturedIndustrySlug | 'default';

const healthcarePanels: IndustryAddonPanel[] = [
  {
    name: 'NSQHS Standard 3',
    requirement:
      'Facility-led environmental cleaning training, policies, audits and improvement actions',
  },
  {
    name: 'Site manager records',
    requirement:
      'CARSI completion records can supplement induction and role-specific competency evidence',
  },
  {
    name: 'Plant room and basement risk',
    requirement: 'Mould and moisture assessment in high-risk clinical zones',
  },
  {
    name: 'Roster-friendly learning',
    requirement: 'Self-paced modules between hospital shifts and call-outs',
  },
  {
    name: 'Water incident response',
    requirement: 'Category and drying decisions for pipe bursts in clinical areas',
  },
  {
    name: 'Indoor air quality handover',
    requirement: 'Monitoring and clearance thinking after a water or mould job',
  },
];

const agedCarePanels: IndustryAddonPanel[] = [
  {
    name: 'Quality Standard 4',
    requirement:
      'A safe, supportive environment that meets older people’s needs, including infection prevention controls',
  },
  {
    name: 'Mould in occupied rooms',
    requirement: 'Containment and air-quality records when residents cannot vacate',
  },
  {
    name: 'Carpet and soft furnishings',
    requirement: 'Hygiene and drying for corridors, dining rooms and lounges',
  },
  {
    name: 'PPE around residents',
    requirement: 'Personal protective equipment for wet work in care settings',
  },
  { name: 'Shift-friendly learning', requirement: 'Self-paced modules around 24/7 care rosters' },
  {
    name: 'Training records',
    requirement: 'Shareable completion records that sit beside induction and competency checks',
  },
];

const hospitalityPanels: IndustryAddonPanel[] = [
  {
    name: 'Guest room turnaround',
    requirement: 'Rapid water-damage response to minimise room downtime',
  },
  {
    name: 'High-traffic carpet care',
    requirement: 'Cleaning and repair for lobbies and conference floors',
  },
  { name: 'Pool and spa incidents', requirement: 'Structural drying for wet-area overflow events' },
  {
    name: 'Odour remediation',
    requirement: 'Source removal for enclosed guest bathrooms and suites',
  },
  { name: 'Chain bulk licensing', requirement: 'Team dashboards for multi-property hotel groups' },
  {
    name: 'Insurance documentation',
    requirement: 'Structured restoration records for property claims',
  },
];

const governmentPanels: IndustryAddonPanel[] = [
  { name: 'AusTender (Commonwealth)', requirement: 'IICRC credentials for pre-qualification' },
  { name: 'Defence maintenance', requirement: 'Base maintenance and heritage building work' },
  { name: 'NSW Construct NSW', requirement: 'Building remediation contracts' },
  { name: 'VIC Category C Panel', requirement: 'Required for restoration tenders' },
  { name: 'QLD QBuild', requirement: 'Government facility maintenance panels' },
  { name: 'Local council panels', requirement: '537 councils across Australia' },
];

const commercialPanels: IndustryAddonPanel[] = [
  {
    name: 'Insurance restoration panels',
    requirement: 'WRT and FSRT commonly required by adjusters',
  },
  { name: 'Tender differentiation', requirement: 'Verifiable CEC records in client proposals' },
  {
    name: 'ISSA + IICRC alignment',
    requirement: 'Complementary management and technician credentials',
  },
  { name: 'Team CEC tracking', requirement: 'Dashboard visibility across technicians' },
  { name: 'Service line expansion', requirement: 'Add restoration revenue to cleaning contracts' },
  { name: 'Digital credentials', requirement: 'Shareable proof for panel applications' },
];

export const industryAddonContent: Record<
  IndustryAddonVariant,
  {
    eyebrow: string;
    title: string;
    titleAccent: string;
    body: string;
    panels: IndustryAddonPanel[];
    showUpgrades: boolean;
  }
> = {
  healthcare: {
    eyebrow: 'Healthcare compliance',
    title: 'Built for',
    titleAccent: 'site-ready crews',
    body: 'Restoration subcontractors and hospital environmental services teams need task-specific training that supports facility infection-control procedures and training records. Not generic cleaning advice.',
    panels: healthcarePanels,
    showUpgrades: false,
  },
  'aged-care': {
    eyebrow: 'Aged care sites',
    title: 'Built for',
    titleAccent: 'occupied care wings',
    body: 'Crews who service residential aged care need mould, air quality and carpet hygiene skills that hold up when residents stay in the building.',
    panels: agedCarePanels,
    showUpgrades: false,
  },
  hospitality: {
    eyebrow: 'Property operations',
    title: 'Built for',
    titleAccent: 'guest-ready teams',
    body: 'Hotel and resort maintenance crews need fast, standards-based response across guest rooms, public areas, pool zones and high-traffic carpet assets.',
    panels: hospitalityPanels,
    showUpgrades: false,
  },
  'government-defence': {
    eyebrow: 'Tender pre-qualification',
    title: 'Government panel',
    titleAccent: 'requirements',
    body: 'IICRC certification is increasingly listed on Commonwealth, state and local procurement panels for restoration and remediation work.',
    panels: governmentPanels,
    showUpgrades: true,
  },
  'commercial-cleaning': {
    eyebrow: 'Contractor growth',
    title: 'Win more',
    titleAccent: 'restoration work',
    body: 'Cleaning companies use IICRC credentials to qualify for insurance panels, expand service lines and charge higher margins on technical work.',
    panels: commercialPanels,
    showUpgrades: true,
  },
  default: {
    eyebrow: 'Tender pre-qualification',
    title: 'Government panel',
    titleAccent: 'requirements',
    body: 'IICRC certification is increasingly required for government restoration contracts. Position your business for Commonwealth, state, and local government work.',
    panels: governmentPanels,
    showUpgrades: true,
  },
};

export const cleanerUpgrades: IndustryUpgradeRow[] = [
  {
    base: 'General cleaning',
    addon: 'WRT',
    benefit: 'Offer emergency flood response services',
  },
  {
    base: 'Carpet cleaning',
    addon: 'CRT',
    benefit: 'Insurance restoration work with higher margins',
  },
  {
    base: 'Commercial cleaning',
    addon: 'AMRT',
    benefit: 'Mould inspection and remediation services',
  },
  {
    base: 'Facility maintenance',
    addon: 'ASD',
    benefit: 'Structural drying for building managers',
  },
  {
    base: 'Specialised cleaning',
    addon: 'odour control and fire & smoke restoration',
    benefit: 'Odour and fire damage restoration',
  },
];
