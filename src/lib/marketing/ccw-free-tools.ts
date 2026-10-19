/**
 * Free tools Carpet Cleaners Warehouse (CCW) publishes on ccwonline.com.au (both pages read
 * 19/10/2026). Each description says only what the page offers. CCW branding is allowed in
 * CCW-CARSI training and marketing, never in a CEC-approved course (npm run check:cec-course-brand).
 */
export type CcwFreeTool = { title: string; url: string; description: string };

export const ccwFreeTools: readonly CcwFreeTool[] = [
  {
    title: 'Hydro-Force sprayer dilution chart and calculator',
    url: 'https://ccwonline.com.au/blogs/news/hydroforce-sprayer-dilutions-made-easy',
    description:
      'Works out how much liquid concentrate or powder to put in a Hydro-Force injection sprayer bottle, using the nominal injection ratio for your incoming pressure and metering tip.',
  },
  {
    title: 'Chemical dilution ratio calculator',
    url: 'https://ccwonline.com.au/blogs/news/chemical-dilution-ratio-calculator',
    description:
      'Turns the dilution on a chemical label (1:X, 1 in X, a percentage or mL per litre) into millilitres of concentrate for a pump-up sprayer, bucket or bottle.',
  },
];
