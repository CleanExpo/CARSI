import Link from 'next/link';
import { BellRing, ClipboardList, ShieldCheck, Users } from 'lucide-react';

import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import {
  PROFESSIONAL_DIRECTORY_NOTIFY_HREF,
  PROFESSIONAL_DIRECTORY_SUBMIT_HREF,
} from '@/lib/professional-directory-links';
import {
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingPanel,
  marketingTextMuted,
} from '@/lib/marketing/marketing-ui';

export function ProfessionalDirectoryComingSoon() {
  return (
    <div className="space-y-10">
      <MarketingSectionHeader
        eyebrow="Professional directory"
        title="Verified NRPG professionals — coming soon"
        body="We are integrating with the National Restoration Professionals Guild member registry. Every profile listed here will be a real, verified member — no placeholder listings."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: 'Registry-verified only',
            body: 'Profiles sync from the NRPG member registry. We will not show fabricated or sample member data.',
          },
          {
            icon: Users,
            title: 'Find specialists by trade',
            body: 'Search by discipline, location, and service area when the directory goes live.',
          },
          {
            icon: ClipboardList,
            title: 'List your practice',
            body: 'Submit your professional profile now and we will guide you through verification at launch.',
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className={`${marketingPanel} flex flex-col gap-3 p-5`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2490ed]/10 text-[#2490ed]">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white/95">{title}</h2>
            <p className={`text-sm leading-relaxed ${marketingTextMuted}`}>{body}</p>
          </div>
        ))}
      </div>

      <div
        className={`${marketingPanel} flex flex-col gap-4 border border-[#2490ed]/20 bg-[#2490ed]/4 p-6 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="space-y-1">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-[#2490ed] uppercase">
            <BellRing className="h-3.5 w-3.5" aria-hidden />
            Not live yet
          </p>
          <p className="text-sm font-medium text-slate-900 dark:text-white/90">
            No professionals are listed while we complete the NRPG integration.
          </p>
          <p className={`max-w-xl text-sm ${marketingTextMuted}`}>
            Want a heads-up when verified listings go live, or ready to submit your profile for
            review?
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link href={PROFESSIONAL_DIRECTORY_NOTIFY_HREF} className={marketingBtnPrimary}>
            Notify me at launch
          </Link>
          <Link href={PROFESSIONAL_DIRECTORY_SUBMIT_HREF} className={marketingBtnSecondary}>
            Submit a professional profile
          </Link>
        </div>
      </div>
    </div>
  );
}
