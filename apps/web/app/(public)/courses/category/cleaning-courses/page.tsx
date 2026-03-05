import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cleaning Courses Courses | CARSI',
  description: 'IICRC-approved Cleaning Courses courses with CEC credits. 24/7 self-paced online training.',
};

export default function cleaning_coursesPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">Cleaning Courses</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
        Browse our Cleaning Courses courses. IICRC-approved with CEC credits.
      </p>
      {/* TODO: Filter courses by category from database */}
    </div>
  );
}
