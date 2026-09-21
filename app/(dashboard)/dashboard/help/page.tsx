import type { Metadata } from 'next';

import { dash } from '@/lib/dashboard-light-ui';

import { HelpTopics } from './HelpTopics';

export const metadata: Metadata = {
  title: 'Help | CARSI Learning',
  description: 'Get help with your courses, certificates and account.',
};

export default function DashboardHelpPage() {
  return (
    <div className="max-w-9xl mx-auto w-full space-y-8 pb-16">
      <header>
        <h1 className={dash.h1}>How can we help?</h1>
        <p className={`mt-2 ${dash.lead}`}>Search help or ask Margot about your learning.</p>
      </header>
      <HelpTopics />
    </div>
  );
}
