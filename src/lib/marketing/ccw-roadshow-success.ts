/**
 * Pure presentation logic for the roadshow success page. Decides what a
 * registrant sees based on their registration status, so a waitlisted attendee
 * is never told to show a token at the door.
 */

export type RoadshowSuccessVariant = 'waitlisted' | 'free-confirmed' | 'paid-confirmed';

export type RoadshowSuccessView = {
  variant: RoadshowSuccessVariant;
  eyebrow: string;
  heading: string;
  body: string;
  showTokenBlock: boolean;
  tokenLabel: string;
  tokenIsValidForEntry: boolean;
};

export function getRoadshowSuccessView(input: {
  status: string | undefined;
  hasToken: boolean;
  eventTitle: string;
}): RoadshowSuccessView {
  const { status, hasToken, eventTitle } = input;

  if (hasToken && status === 'waitlisted') {
    return {
      variant: 'waitlisted',
      eyebrow: "You're on the waitlist",
      heading: `You're on the waitlist for ${eventTitle}`,
      body: "This city is currently full, so your place is on the waitlist. We'll email you if a seat opens up — the reference below is not yet valid for entry.",
      showTokenBlock: true,
      tokenLabel: 'Waitlist reference',
      tokenIsValidForEntry: false,
    };
  }

  if (hasToken) {
    return {
      variant: 'free-confirmed',
      eyebrow: 'Free Entry Confirmed',
      heading: `Your free entry token for ${eventTitle} is ready`,
      body: 'No payment is required for CCW past and current customers. Save this token and show it at check-in when you arrive at the CCW location.',
      showTokenBlock: true,
      tokenLabel: 'Free Entry Token',
      tokenIsValidForEntry: true,
    };
  }

  return {
    variant: 'paid-confirmed',
    eyebrow: 'Booking Confirmed',
    heading: `You are booked for ${eventTitle}`,
    body: 'Payment has been sent through Stripe. Keep an eye on the booking email for your receipt and event details.',
    showTokenBlock: false,
    tokenLabel: '',
    tokenIsValidForEntry: false,
  };
}
