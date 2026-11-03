import { PUBLIC_TOPIC_LIST } from '@/lib/server/public-catalogue-facts';

/** Homepage FAQ copy — GP-654: plain-English topics, never an IICRC discipline count. */
export function buildHomeFaqs(facts: { publishedCourseCount: number }) {
  const n = facts.publishedCourseCount;
  const coursePhrase =
    n > 0 ? `${n} published course${n === 1 ? '' : 's'}` : 'IICRC CEC Accredited courses';

  return [
    {
      question: 'What is CARSI?',
      answer: `CARSI is an Australian online training platform offering ${coursePhrase} across ${PUBLIC_TOPIC_LIST}, built for new starters, working technicians, and experienced professionals maintaining CECs.`,
    },
    {
      question: 'Can I complete training at my own pace?',
      answer:
        'Yes. CARSI courses are online, self-paced, and designed for technicians who need to study around site work and on-call schedules.',
    },
    {
      question: 'How do IICRC CECs work?',
      answer:
        'IICRC members and certified technicians continue their education through CECs. Where the IICRC has approved a CARSI course, its CEC value is shown on the course page, with certificates and progress available in the learner dashboard.',
    },
    {
      question: 'What industries does CARSI serve?',
      answer:
        'CARSI serves healthcare, hospitality, aged care, mining, commercial cleaning, government and defence, education, property management, strata, retail, childcare, construction, and more, with sector-specific training pathways.',
    },
    {
      question: 'Does CARSI run in-person events?',
      answer:
        'Yes. CARSI partners with Carpet Cleaners Warehouse on Business Growth Days in Melbourne, Sydney and Brisbane, and offers the 2-Day CCW Carpet Cleaning Workshop. Online courses remain available 24/7 between events.',
    },
  ];
}
