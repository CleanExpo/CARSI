import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact CARSI',
  description: 'Get in touch with CARSI for cleaning and restoration training enquiries.',
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
      {/* TODO: Contact form + details from WordPress */}
    </div>
  );
}
