import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  HeartPulse,
  Hotel,
  Sparkles,
} from 'lucide-react';

export type FeaturedIndustrySlug =
  | 'healthcare'
  | 'hospitality'
  | 'government-defence'
  | 'commercial-cleaning';

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
    detail: 'NSQHS-aligned AMRT, WRT, FSRT and ASD training for environmental services teams',
    icon: HeartPulse,
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
    detail: 'RRT, CCT and OCT credentials for insurance work and tender differentiation',
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
  { name: 'NSQHS Standard 3', requirement: 'Infection prevention competency for environmental services' },
  { name: 'JCI accreditation', requirement: 'Verifiable IICRC credentials for clinical facility audits' },
  { name: 'Plant room & basement risk', requirement: 'AMRT mould assessment in high-risk clinical zones' },
  { name: '24/7 shift-friendly learning', requirement: 'Self-paced modules between hospital shifts' },
  { name: 'Water incident response', requirement: 'WRT protocols for pipe bursts in clinical areas' },
  { name: 'Fire & smoke readiness', requirement: 'FSRT evidence for equipment room emergencies' },
];

const hospitalityPanels: IndustryAddonPanel[] = [
  { name: 'Guest room turnaround', requirement: 'Rapid WRT response to minimise room downtime' },
  { name: 'High-traffic carpet care', requirement: 'RRT maintenance for lobbies and conference floors' },
  { name: 'Pool & spa incidents', requirement: 'ASD drying for wet-area overflow events' },
  { name: 'Odour remediation', requirement: 'OCT methods for enclosed guest bathrooms and suites' },
  { name: 'Chain bulk licensing', requirement: 'Team dashboards for multi-property hotel groups' },
  { name: 'Insurance documentation', requirement: 'Structured restoration records for property claims' },
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
  { name: 'Insurance restoration panels', requirement: 'WRT and FSRT commonly required by adjusters' },
  { name: 'Tender differentiation', requirement: 'Verifiable CEC records in client proposals' },
  { name: 'ISSA + IICRC alignment', requirement: 'Complementary management and technician credentials' },
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
    titleAccent: 'accreditation evidence',
    body: 'Hospital environmental services teams need training that maps to infection prevention, clinical risk and audit-ready documentation — not generic cleaning advice.',
    panels: healthcarePanels,
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
    addon: 'RRT',
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
    addon: 'OCT + FSRT',
    benefit: 'Odour and fire damage restoration',
  },
];
