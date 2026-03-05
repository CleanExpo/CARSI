import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chemicals & Equipment Courses | CARSI',
  description: 'IICRC-approved Chemicals & Equipment courses with CEC credits. 24/7 self-paced online training.',
};

export default function chemicals_and_equipmentPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">Chemicals & Equipment</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
        Browse our Chemicals & Equipment courses. IICRC-approved with CEC credits.
      </p>
      {/* TODO: Filter courses by category from database */}
    </div>
  );
}
