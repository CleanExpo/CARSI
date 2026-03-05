import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Membership Packages | CARSI',
  description: 'CARSI membership packages with over $5000 worth of resources. Grow your cleaning and restoration business.',
};

export default function MembershipPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">Membership Packages</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
        Get the support and resources needed to grow your business and achieve your goals.
      </p>
      {/* TODO: Implement membership tiers from WordPress content */}
    </div>
  );
}
