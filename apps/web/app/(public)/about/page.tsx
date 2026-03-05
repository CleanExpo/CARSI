import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About CARSI | Cleaning and Restoration Science Institute',
  description: 'Australia\'s only CFO and SBFRS with over 50 years industry experience. IICRC approved education provider.',
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">About CARSI</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
        Bridging Science and Education into Cleaning and Restoration.
      </p>
      {/* TODO: Implement from WordPress about content */}
    </div>
  );
}
