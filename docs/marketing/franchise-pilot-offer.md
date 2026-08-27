# First franchise pilot — target, offer, and draft letter

BACKLOG row 7. Prepared 26/08/2026. **Nothing has been sent.** The target choice is the founder's;
this proposes one with reasons, and drafts the letter so it is ready the moment he agrees.

---

## Recommended first target: Steamatic Australia

**Why this one, ahead of the larger networks.**

Steamatic's Australian master franchise was bought by **Johns Lyng Group** in March 2019. Johns
Lyng is an ASX-listed restoration and construction group whose core business is insurer-funded
repair work. That single fact is the whole argument:

- **It is restoration-native.** CARSI's catalogue is water damage, structural drying, mould, fire
  and smoke, odour control. That is Steamatic's actual work, not an adjacent service line. No
  translation needed in the pitch.
- **Its parent has to evidence technician competency to insurers.** An insurer-funded repair
  network lives or dies on being able to show who did the work and what they were trained to do.
  CARSI issues a verifiable credential with a public verification page. That is a procurement
  answer, not a training brochure.
- **A franchise network is one decision for many seats.** Selling to a master franchisor once
  beats selling to franchisees one at a time, which is the entire point of doing a franchise deal
  before a direct-sales push.

**Second choice: Chem-Dry Australia** — 200 Australian franchisees, and globally the largest
carpet cleaning franchise at around 4,000. The fit is CARSI's carpet cleaning and textile
catalogue rather than the restoration core, so the pitch is narrower, but the network is large and
already Australian-organised.

**Deliberately not first: Jim's Cleaning.** It is the biggest by headcount and heading toward
2,000 franchisees, so a headcount ranking would put it top. It is not the right first call,
because Jim's already runs its own franchisee training as a core part of its model. CARSI would be
competing with an in-house programme rather than filling a gap, which is a harder first
conversation and a worse first reference.

---

## The offer

Quote **the published Teams pricing and nothing else**. It is on carsi.com.au/pricing today:

| Tier | Price | Seats included | Expansion |
|---|---|---|---|
| Teams Starter | $299 / year | 5 | +$49/seat |
| Teams Growth | $799 / year | 15 | +$39/seat |
| Full library | $2,499 / year | 25 | +$29/seat |

All three are marked **"Coming soon"** on the live page. The letter below says "launching", not
"available", and offers the pilot as the reason to talk now rather than later.

**Do not invent a franchise discount in this letter.** Pricing concessions are the founder's call
and they set the anchor for every network that follows. The pilot's value to CARSI is the
reference and the completion data, so ask for those instead of discounting first.

### A pricing contradiction to resolve before this letter goes anywhere

`docs/marketing/association-partnerships.md` publishes a **different and much higher** group
licensing table: 10 seats at $1,750, 25 at $3,900, 50 at $6,900 — that is $138 to $175 per seat.

The live page sells **25 seats for $2,499**. The association document asks **$3,900 for the same
25 seats**, about 56% more.

Two partner-facing documents quoting incompatible prices for the same product is a live problem
independent of this letter. Whichever is right, they cannot both be. The live page and
`src/lib/lms/pricing-tiers.ts` agree with each other, so the association document is the outlier.

### And a claim in that same document that has to be corrected

`association-partnerships.md` used the word *approved* rather than *accredited* about CARSI's
courses, and offered co-branded certificates on the same footing. Both assert course-level CEC
approval.
`data/seed/cec-approvals.json` contains `"approvals": []` — no CARSI course has been approved. The
correct framing is the one the live site uses: CARSI is an IICRC CEC Accredited **provider**, and
per-course approval is applied for course by course.

The letter below is written to that standard.

---

## Draft letter — DRAFT ONLY, nothing sent

**To:** Steamatic Australia, care of the Johns Lyng Group franchise operations lead
**Subject:** Training pilot — CARSI credentials for your Australian franchisees

---

Dear [name],

I run CARSI, an Australian online training provider for the cleaning and restoration trade. I am
writing to propose a training pilot with a small number of your Australian franchisees.

The problem I built CARSI to solve is one your network will recognise. Keeping a restoration
technician's skills current in this country has meant flights, hotels and days off the tools. For
a franchise network that is not just a training cost, it is downtime across every territory that
sends someone away.

CARSI is online and self-paced. There are 80 published courses covering water damage restoration,
structural drying, mould, fire and smoke, odour control, carpet cleaning and carpet repair.
Everything is written for Australian conditions — 230 volt plant, metric units, AS/NZS and Safe
Work Australia, and products a technician can actually buy here.

What I think matters most to Johns Lyng specifically: every course finishes with a credential that
carries a public verification page. An insurer, a builder or your own compliance team can check a
technician's record without contacting us and without taking your word for it. For insurer-funded
work, that is an evidence trail rather than a training certificate in a filing cabinet.

To be straight with you about what CARSI is and is not. CARSI issues its own credentials, the
CARSI Southern Hemisphere Restoration Designations. We are an IICRC CEC Accredited provider. We do
not deliver IICRC certification and we do not claim to — that comes from an IICRC-approved school
and examination. Per-course CEC approval is applied for course by course, and I would rather tell
you that now than have you discover it later.

**What I am proposing.** A pilot with five to fifteen of your franchisees, on our Teams plan,
running for twelve months. You get an owner dashboard showing enrolment, completion and credential
status across the participating territories. Our Teams plans are $299 a year for five seats and
$799 for fifteen, and they are launching shortly — the pilot is why I am writing now rather than
after launch.

**What I would want back.** Honest feedback on whether the content matches the work your
technicians actually do, completion data so we can both see whether it sticks, and if it goes
well, permission to say Steamatic ran the pilot.

If this is worth twenty minutes, I will walk you through the platform and you can push back on it.
Have a look in the meantime — carsi.com.au.

Kind regards,

Phill McGurk
Founder, CARSI Pty Ltd
Centre for Australian Restoration and Standards Information
support@carsi.com.au · https://www.carsi.com.au

---

## Before this is sent

- The target is a recommendation, not a decision. Confirm Steamatic before anything goes out.
- Find the actual name and role. A letter addressed to "[name]" at a company this size will not
  reach the person who can say yes.
- Resolve the association-document pricing contradiction first. If that document has already gone
  to anyone, they hold a higher quote for the same product.
- Decide whether a pilot discount is on the table. The draft deliberately offers none.
- "Permission to say Steamatic ran the pilot" is a real commitment for them. Expect it to be the
  most negotiated sentence in the letter.

## Sources for the target research

- [The 10 biggest cleaning franchises in the Australian market](https://www.franchisebuyer.com.au/articles/the-10-biggest-cleaning-franchises-in-the-australian-market)
- [Steamatic — Restoration, Construction, Cleaning franchise](https://www.franchisesolutions.com/franchise/steamatic)
- [Chem-Dry Australia franchise opportunities](https://chemdryfranchise.com.au/)
- [Jim's Cleaning Group](https://www.topfranchise.com.au/franchise/jims-cleaning-group)
- [Top 10 Cleaning Franchises in Australia](https://thefranchiseaccountant.com.au/top-10-cleaning-franchises-in-australia/)
