import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Courses Courses | CARSI',
  description: 'IICRC-approved Free Courses courses with CEC credits. 24/7 self-paced online training.',
};

export default function free_coursesPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">Free Courses</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
        Browse our Free Courses courses. IICRC-approved with CEC credits.
      </p>
      {/* TODO: Filter courses by category from database */}
    </div>
  );
}
