# Brisbane two-day carpet cleaning course — 4-5 September 2026

**Status 2026-08-26:** the product facts are now correct in code and shipped to a branch. The
promotion itself is mostly founder-gated, and this file says exactly which parts and why.

| Fact | Value | Source |
| --- | --- | --- |
| Dates | Friday 4 - Saturday 5 September 2026 | Founder, 2026-08-26 |
| Time | 8.30am - 4.30pm both days (AEST, UTC+10, no DST in QLD) | existing config |
| Venue | Carpet Cleaners Warehouse Boondall, D1-3/194 Zillmere Road, Boondall QLD 4034 | existing config |
| Capacity | 15 seats | existing config, matches founder |
| Sold | 5 of 15, so **10 remaining** | Founder, 2026-08-26 |
| Price | **$149 per seat (AUD)**, all locations | Founder, 2026-08-26 |
| Payment deadline | Before **Wednesday 2 September 2026** to hold a seat | Founder, 2026-08-26 |

---

## 1. What is done and committed

- **The dates were wrong and the page was live.** `carsi.com.au/events/ccw-roadshow` returned
  HTTP 200 advertising Brisbane as "11-12 August 2026" — fifteen days after it happened — and was
  still taking registrations. Corrected to 4-5 September.
- **All three listed events had already finished.** Brisbane was the least stale. Melbourne ended
  22-23 July, Sydney 30-31 July. Both are still listed and still bookable. Their dates were NOT
  invented; see §3.
- **Price set to $149/seat**, single and team-of-five (5 x $149 = $745), replacing $0. Verified
  first that `unitAmountCents` is display-only — it feeds `formatAudFromCents` on the page and in
  the booking email, and there is **no Stripe call anywhere in the roadshow booking path** — so
  this changes what a buyer is quoted, not what a card is charged.
- **Event schema completed.** The page was passing `isFree` to the structured data while charging
  $149, and the Offer it emitted had a url and availability but **no price and no currency**.
  Google was being told the event was free. `EventSchema` now emits `price`, `priceCurrency: AUD`,
  `availability` (InStock/SoldOut) and `validFrom`, with 7 tests including one that asserts the
  **absence** of any IICRC or CEC string.

## 2. Founder-only — nothing here can be done by an agent

| Action | Why it is gated |
| --- | --- |
| Create the Stripe Product and Price for $149/seat | Money configuration. `ENGINE.md`: never autonomous, ever — money, pricing. An agent may wire the code path and read a Price ID from config; it may not create the Stripe object |
| Move or recreate the Google Calendar event | It lives on `phill.mcgurk@gmail.com`. The stored id `1nnfc9hv164f4882q09krd1ies` is still the **11-12 August** event, so confirmed registrants are currently invited to the wrong dates |
| Post to CARSI or CCW social accounts | External publishing |
| Send any email to the 5 booked or to a list | External send |
| Backlink outreach to suppliers, associations, trade press | External send |
| Decide whether CCW customers still enter free | See §3 — a partnership term, not a price |

## 3. The open contradiction, stated rather than resolved

The events page is built around a **free entry offer for CCW customers**:
`ccwRoadshowFreeEntryOffer`, an `isFree` flag, "All CCW past and current customers can attend
free", and a "Claim your free entry token" call to action. The instruction was "$149/seat, all
locations". Those cannot both be true.

The price was changed as instructed. **The free-entry offer was left alone**, because retiring a
benefit CCW may have promised its own customers is a commercial decision with a partner, not a
price field. A page that says both is worse than a page that says either, so this needs a
decision before the page is promoted anywhere.

Melbourne and Sydney are the same shape of problem: both finished, both still listed. New dates
or a decision to retire the city are needed. A test now pins the expired set exactly, so it cannot
be forgotten and cannot silently grow.

## 4. Licence constraints that bind every asset

**This is a carpet cleaning course. It carries NO IICRC and NO CEC framing of any kind.**
`CLAUDE.md` names the CCW truckmount course as the exact prior incident where IICRC framing was
templated onto a course with no IICRC discipline. The CEC approvals registry is empty, so no
course may display CEC hours at all. If a disclaimer is ever needed, the wording is "not IICRC CEC
accredited" — never the bare banned literals, even negated.

Everything must be Australian-produced: Australian English, AUD, metric, AEST, and Australian
suppliers and standards. No US spelling, voltages or products.

## 5. The promotion plan, in the order that earns authority

**Owned surfaces first, because they are the only ones an agent can build and they are what the
rest links back to.**

1. **Event page depth.** One canonical page per city with the complete Offer schema (done),
   FAQPage schema answering the questions a buyer actually asks, and a visible seats-remaining
   count. Ten of fifteen left is genuine scarcity and needs no invention.
2. **AEO / GEO.** Answer-engine visibility comes from the page answering a question directly in
   its first 200 words, in the words a cleaner would use — "what does a two-day carpet cleaning
   course cost in Brisbane", "is there hands-on training near me". Add `llms.txt` coverage for the
   events path so answer engines can read the offer without guessing.
3. **Local SEO.** `Place` and `PostalAddress` are already emitted with `addressCountry: AU` and
   `addressRegion: QLD`. Boondall and greater Brisbane terms belong in the copy, not stuffed.
4. **Content that earns the link rather than asking for it.** A short article per practical topic
   taught on the day, each answering one question completely and linking to the event. This is
   what makes the backlink outreach in §2 land, and it is the part that compounds.
5. **QR codes.** Blocked on a technicality worth knowing: no QR library is installed, and adding
   an npm dependency from this Windows machine would produce a Windows `package-lock.json`, which
   fails CI `npm ci`. The lockfile must be regenerated on Linux with Node 22. Generate the codes
   from a Linux checkout, or produce them outside the repo.

## 6. The honest sequencing

Nothing should be promoted until §3 is resolved. Driving traffic to a page that offers a free seat
and a $149 seat in the same viewport wastes the spend and damages the authority this is meant to
build. The order is: settle the CCW free-entry question, create the Stripe Price, fix the calendar
event, then promote.
