import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Podcast — The Science of Property Restoration | CARSI',
  description: 'Listen to The Science of Property Restoration podcast on Amazon Music and more.',
};

export default function PodcastPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">The Science of Property Restoration</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
        Our podcast covering all things cleaning, restoration, and indoor environments.
      </p>
      {/* TODO: Embed Amazon Music player + episode list */}
    </div>
  );
}
