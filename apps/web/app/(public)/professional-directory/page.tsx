/**
 * app/(public)/professional-directory/page.tsx
 * Static Professional Directory — Track B (UNI-87).
 *
 * Renders stub professional data from lib/professionals.ts.
 * When NRPG credentials arrive (UNI-87 Track A), only getProfessionals()
 * needs to change — this page requires no structural edits.
 */

import type { Metadata } from 'next';
import { SchemaMarkup, buildPersonSchema, buildLocalBusinessSchema } from '@/lib/schema';
import { getProfessionals, type Professional } from '@/lib/professionals';

export const metadata: Metadata = {
  title: 'Professional Directory | CARSI Industry Hub',
  description:
    'Find NRPG-accredited restoration and indoor environment professionals across Australia. Browse certified water damage, mould remediation, fire restoration, and HVAC specialists.',
  keywords: [
    'NRPG professionals Australia',
    'restoration professionals directory',
    'certified water damage specialists',
    'mould remediation professionals',
    'IICRC certified technicians',
    'indoor environment professionals',
    'CARSI professional directory',
  ],
  openGraph: {
    title: 'Professional Directory | CARSI Industry Hub',
    description: 'Find NRPG-accredited restoration professionals across Australia.',
    type: 'website',
    url: 'https://carsi.com.au/professional-directory',
  },
  alternates: { canonical: 'https://carsi.com.au/professional-directory' },
};

const TIER_LABELS: Record<Professional['nrpg_membership_tier'], string> = {
  associate: 'Associate',
  member: 'Member',
  senior_member: 'Senior Member',
  fellow: 'Fellow',
};

const TIER_COLOURS: Record<Professional['nrpg_membership_tier'], string> = {
  associate: 'border-border text-muted-foreground',
  member: 'border-blue-500/30 text-blue-500',
  senior_member: 'border-indigo-500/35 text-indigo-400',
  fellow: 'border-amber-500/35 text-amber-400',
};

function ProfessionalCard({ pro }: { pro: Professional }) {
  const pageUrl = `https://carsi.com.au/professional-directory`;

  const personSchema = buildPersonSchema({
    name: pro.name,
    url: pageUrl,
    jobTitle: pro.industries[0] ?? 'Restoration Professional',
    locationCity: pro.location_city,
    locationState: pro.location_state,
    worksFor: pro.business_name,
    knowsAbout: pro.certifications,
    hasCredential: pro.certifications,
    memberOf: {
      name: 'National Restoration Professionals Guild',
      url: 'https://nrpg.org.au',
    },
  });

  const localBusinessSchema = buildLocalBusinessSchema({
    name: pro.business_name,
    url: pageUrl,
    locationCity: pro.location_city,
    locationState: pro.location_state,
    industry: pro.industries.join(', '),
  });

  return (
    <div className="relative rounded-sm border border-border bg-card/20 p-6 transition-colors hover:border-border/60 hover:bg-card/40">
      <SchemaMarkup schema={personSchema} />
      <SchemaMarkup schema={localBusinessSchema} />

      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground/90">{pro.name}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{pro.business_name}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TIER_COLOURS[pro.nrpg_membership_tier]}`}
        >
          {TIER_LABELS[pro.nrpg_membership_tier]}
        </span>
      </div>

      {/* Location */}
      <p className="mb-4 text-xs text-muted-foreground">
        {pro.location_city}, {pro.location_state}
      </p>

      {/* Certifications */}
      {pro.certifications.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground/50 uppercase">
            Certifications
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pro.certifications.map((cert) => (
              <span
                key={cert}
                className="rounded-sm border border-border bg-muted/10 px-2 py-0.5 text-xs text-muted-foreground"
              >
                {cert}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Industries */}
      {pro.industries.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground/50 uppercase">
            Specialties
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pro.industries.map((ind) => (
              <span
                key={ind}
                className="rounded-sm border border-primary/15 bg-primary/5 px-2 py-0.5 text-xs text-primary/80"
              >
                {ind}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Service areas */}
      {pro.service_areas.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground/50 uppercase">
            Service Areas
          </p>
          <p className="text-xs text-muted-foreground">{pro.service_areas.join(' · ')}</p>
        </div>
      )}

      {/* NRPG badge */}
      <div className="mt-5 flex items-center gap-1.5 border-t border-border pt-4">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-xs text-muted-foreground/50">
          NRPG {TIER_LABELS[pro.nrpg_membership_tier]} · {pro.nrpg_member_id}
        </span>
      </div>
    </div>
  );
}

export default async function ProfessionalDirectoryPage() {
  const professionals = await getProfessionals();

  return (
    <main className="min-h-screen bg-background">
      {/* Mesh background */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        {/* Header */}
        <p className="mb-2 text-xs tracking-wide text-muted-foreground/50 uppercase">
          Professional Directory
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground/95">
          Find NRPG-Accredited Professionals
        </h1>
        <p className="mb-10 max-w-2xl text-base text-muted-foreground">
          Browse certified restoration and indoor environment professionals across Australia,
          verified through the National Restoration Professionals Guild.
        </p>

        {/* Coming-soon banner */}
        <div className="mb-10 flex items-start gap-3 rounded-sm border border-primary/20 bg-primary/5 px-5 py-4">
          <span className="mt-0.5 text-primary">ℹ</span>
          <div>
            <p className="text-sm font-medium text-foreground/80">
              Directory powered by NRPG. Full live listing coming soon.
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              We are integrating directly with the NRPG member registry to provide verified,
              real-time professional profiles. Sample profiles are shown below.
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {professionals.map((pro) => (
            <ProfessionalCard key={pro.id} pro={pro} />
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-12 text-center text-xs text-muted-foreground/50">
          All professionals listed are NRPG members. Membership verification is updated
          periodically. Contact{' '}
          <a href="mailto:info@carsi.com.au" className="underline hover:text-muted-foreground">
            info@carsi.com.au
          </a>{' '}
          to report any inaccuracies.
        </p>
      </div>
    </main>
  );
}
