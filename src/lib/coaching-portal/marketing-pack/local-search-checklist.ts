/** GP-634: local-search checklist, ticked where the review saw the item already in place. */
import { primaryTown, sanitizeVoice } from './site-review';
import type { ChecklistItem, SiteReview, TradeVoice } from './types';

export function buildLocalSearchChecklist(
  review: SiteReview,
  rawVoice: TradeVoice
): ChecklistItem[] {
  const voice = sanitizeVoice(rawVoice);
  const town = primaryTown(voice.town) || 'your town';
  const passed = (id: string) => review.checks.find((c) => c.id === id)?.passed ?? false;
  return [
    {
      id: 'gbp-claimed',
      label: 'Google Business Profile claimed and linked',
      detail: 'Claim the listing, verify it, and save the link in your coaching profile.',
      done: passed('google-business-profile'),
    },
    {
      id: 'gbp-category',
      label: `Main category matches your trade (${voice.trade || 'your trade'})`,
      detail:
        'Pick the closest primary category, then add secondary categories for other services.',
      done: false,
    },
    {
      id: 'gbp-service-area',
      label: `Service area lists ${town} and the suburbs you cover`,
      detail:
        'Add each suburb or postcode you travel to. Hide your home address if you work from home.',
      done: false,
    },
    {
      id: 'nap-consistent',
      label: 'Business name, phone and area are the same everywhere',
      detail: 'Website, Google, Facebook and directories should match word for word.',
      done: false,
    },
    {
      id: 'gbp-photos',
      label: 'At least 10 real job and team photos on your profile',
      detail: 'Your own photos of real jobs, your van and your team. No stock images.',
      done: false,
    },
    {
      id: 'reviews-ask',
      label: 'Ask every customer for an honest Google review',
      detail:
        'Send your review link to every customer by text the same day the job is finished, whatever the outcome. Never pick who to ask based on whether they seem happy. Reply to every review.',
      done: false,
    },
    {
      id: 'gbp-posts',
      label: 'Post on your Google profile weekly',
      detail: 'Reuse posts from your 30-day calendar. Fresh posts show the business is active.',
      done: false,
    },
    {
      id: 'site-town',
      label: `Website names ${town} and your services in plain text`,
      detail: 'A short "Areas we service" section and one line per main service.',
      done: passed('town'),
    },
    {
      id: 'site-tap-to-call',
      label: 'Tap-to-call phone number on every page',
      detail: 'Put it at the top of the page so it is visible on a phone without scrolling.',
      done: passed('tap-to-call'),
    },
    {
      id: 'site-title',
      label: 'Home page title says your trade and town',
      detail: 'For example: "Carpet cleaning Toowoomba | Business name".',
      done: passed('title'),
    },
    {
      id: 'site-schema',
      label: 'Local business details added to the website',
      detail: 'Ask your web person for LocalBusiness structured data matching your Google profile.',
      done: passed('local-business-schema'),
    },
  ];
}
