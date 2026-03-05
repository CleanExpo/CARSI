import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Resources | CARSI',
  description: 'Free webinars, resource library, and industry tools for cleaning and restoration professionals.',
};

export default function ResourcesPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">Resources</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
        Free webinars, downloads, and industry resources to grow your business.
      </p>
      {/* TODO: Webinar library, resource downloads from WordPress */}
    </div>
  );
}
