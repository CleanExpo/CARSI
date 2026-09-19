import { HomeFaqSection } from '@/components/landing/HomeFaqSection';

export type IndustryFaq = {
  question: string;
  answer: string;
};

interface IndustryFAQSectionProps {
  industryName: string;
  faqs: IndustryFaq[];
}

export function IndustryFAQSection({ faqs }: IndustryFAQSectionProps) {
  if (faqs.length === 0) return null;
  return <HomeFaqSection faqs={faqs} />;
}
