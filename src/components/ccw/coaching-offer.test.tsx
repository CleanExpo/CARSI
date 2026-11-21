// GP-734: /ccw-training advertises only what can be bought. While add-on booking is not live,
// the rendered page shows no add-on rows and no "coming soon" promises.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CcwBusinessCoachingClient } from '@/components/ccw/CcwBusinessCoachingClient';
import {
  carsiCoachingAddOns,
  carsiCoachingAddOnsComingSoon,
  publicCoachingOffer,
} from '@/lib/marketing/carsi-coaching-program';

const paidAddOns = carsiCoachingAddOns.filter((a) => !a.includedInBase);

describe('GP-734 public coaching offer', () => {
  it('lists no add-ons and no add-on portal feature while booking is not live', () => {
    const offer = publicCoachingOffer(true);
    expect(offer.addOnsBookable).toBe(false);
    expect(offer.addOns).toEqual([]);
    expect(offer.portalFeatures.map((f) => f.title)).not.toContain('Add-ons & upgrades');
  });

  it('lists every paid add-on once booking is live', () => {
    const offer = publicCoachingOffer(false);
    expect(offer.addOnsBookable).toBe(true);
    expect(offer.addOns.map((a) => a.id)).toEqual(paidAddOns.map((a) => a.id));
    expect(offer.addOns.some((a) => a.includedInBase)).toBe(false);
  });

  it('the rendered /ccw-training page shows no coming-soon add-ons today', () => {
    expect(carsiCoachingAddOnsComingSoon).toBe(true);
    const html = renderToStaticMarkup(<CcwBusinessCoachingClient checkoutEnabled={false} />);
    expect(html).not.toMatch(/coming soon/i);
    expect(html).not.toContain('(soon)');
    for (const addOn of paidAddOns) {
      expect(html).not.toContain(addOn.title);
    }
    expect(html).not.toContain('Are add-ons included');
    expect(html).toContain('One clear price');
  });
});
