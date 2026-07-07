import type { VerifiedProfessional } from '@/lib/server/professional-directory';

import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import { marketingPanel, marketingTextMuted } from '@/lib/marketing/marketing-ui';

function tierLabel(tier: VerifiedProfessional['membershipTier']): string {
  switch (tier) {
    case 'fellow':
      return 'Fellow';
    case 'senior_member':
      return 'Senior member';
    case 'member':
      return 'Member';
    case 'associate':
      return 'Associate';
    default:
      return 'Member';
  }
}

export function ProfessionalDirectoryListing({
  professionals,
}: {
  professionals: VerifiedProfessional[];
}) {
  return (
    <div className="space-y-8">
      <MarketingSectionHeader
        eyebrow="Professional directory"
        title="NRPG-verified professionals"
        body={`${professionals.length} verified profile${professionals.length === 1 ? '' : 's'} from the National Restoration Professionals Guild registry.`}
      />

      <ul className="grid gap-4 md:grid-cols-2">
        {professionals.map((professional) => (
          <li key={professional.id} className={`${marketingPanel} space-y-3 p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white/95">
                  {professional.name}
                </h2>
                <p className={`text-sm ${marketingTextMuted}`}>{professional.businessName}</p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                {tierLabel(professional.membershipTier)}
              </span>
            </div>
            <p className={`text-sm ${marketingTextMuted}`}>
              {professional.locationCity}, {professional.locationState}
              {professional.serviceAreas.length > 0
                ? ` · ${professional.serviceAreas.slice(0, 3).join(', ')}`
                : ''}
            </p>
            {professional.industries.length > 0 ? (
              <p className="text-sm text-slate-700 dark:text-white/75">
                {professional.industries.join(' · ')}
              </p>
            ) : null}
            {professional.certifications.length > 0 ? (
              <p className={`text-xs ${marketingTextMuted}`}>
                {professional.certifications.join(' · ')}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
