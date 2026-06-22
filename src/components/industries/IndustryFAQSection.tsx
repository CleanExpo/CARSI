import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import { marketingPanel, marketingSection, marketingTextMuted, marketingTextStrong } from '@/lib/marketing/marketing-ui';

export type IndustryFaq = {
  question: string;
  answer: string;
};

interface IndustryFAQSectionProps {
  industryName: string;
  faqs: IndustryFaq[];
}

export function IndustryFAQSection({ industryName, faqs }: IndustryFAQSectionProps) {
  if (faqs.length === 0) return null;

  return (
    <section className={marketingSection}>
      <MarketingSectionHeader
        eyebrow="Frequent questions"
        title={`${industryName} training FAQs`}
        body="Clear answers for facility teams, contractors and procurement leads researching IICRC CEC training."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {faqs.map((faq) => (
          <details key={faq.question} className={`p-4 ${marketingPanel}`}>
            <summary className={`cursor-pointer text-sm font-semibold ${marketingTextStrong}`}>
              {faq.question}
            </summary>
            <p className={`mt-3 text-sm leading-6 ${marketingTextMuted}`}>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
