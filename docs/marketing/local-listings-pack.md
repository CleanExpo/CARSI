# CARSI local listings pack: Google Business Profile and Bing Places

Prepared 18/10/2026 on branch `feat/reviews-ask`. Nothing here has been submitted. Phill
applies it from his own accounts.

## Read this first: is CARSI eligible for a Google Business Profile?

Google's rule, quoted from its
[Business eligibility and ownership guidelines](https://support.google.com/business/answer/13763036)
(read 18/10/2026):

> "To qualify for a Business Profile, a business must make in-person contact with customers during its stated hours."

The same page lists these as **ineligible**:

> "Brands, organizations, artists, and other online-only businesses."
>
> "An ongoing service, class, or meeting at a location that you don't own or have the authority to represent."

So:

- **If CARSI is online-only, it is not eligible.** That means learners study online, nobody visits a CARSI premises, and CARSI staff do not travel to learners. Do not create a profile. A profile created anyway can be suspended, and any reviews on it are lost with it.
- **Workshops at a venue CARSI neither owns nor has authority to represent do not make it eligible.** A CCW roadshow at a hotel, or a training room hired for a day, is "an ongoing service, class, or meeting at a location that you don't own or have the authority to represent". A location CARSI leases or is authorised to represent can qualify if it is staffed and open to learners at its stated hours. The test is the staffed location, not ownership.
- **A rented mailing address does not count.** Google's [representation guidelines](https://support.google.com/business/answer/3038177) say a virtual office "isn't eligible for a Business Profile".

**Phill, the question only you can answer:**

> Does CARSI meet learners in person, either at a place CARSI runs and staffs, or by travelling to them (for example on-site training at a client's business), during set, published hours?

- **Yes, at a staffed CARSI location:** use section A with that street address and the real hours.
- **Yes, CARSI travels to clients:** use section A as a service-area business with the address hidden.
- **No:** skip Google Business Profile. Collect reviews on the course pages (now live on this branch) and Facebook. Use section B for Bing only if Bing accepts the listing (see the note there).

## NAP: name, address, phone (must match everywhere)

These values come from the live Organization schema on https://carsi.com.au/ (JSON-LD, read 18/10/2026). Every listing must use exactly these.

| Field | Value | Note |
|---|---|---|
| Name | **CARSI** | The real-world name. Do not add keywords or a tagline. Google: "Including unnecessary information in your business name isn't permitted". |
| Long name | Centre for Australian Restoration and Standards Information | Use only where a field asks for the legal or long name. |
| Website | https://carsi.com.au | |
| Email | support@carsi.com.au | |
| Address | Forest Lake QLD, Australia | The schema has **no street address**. Google needs a real street address to verify. A service-area business hides it from the public. Do not use a PO box. |
| Phone | **none published** | The schema has no telephone. If you add one to a listing, add the same number to the site's Organization schema so the two match. That schema belongs to the GEO thread, so hand it over rather than editing it here. |
| Hours | only if in person | Publish hours only for times someone is actually available to meet customers in person. |
| Service area (if a service-area business) | The Australian states and territories you genuinely travel to | The schema says Australia-wide (all 8 states and territories). Pick only the places you really visit. |

## A. Google Business Profile (only if the answer above is yes)

**Steps (Phill, in his own Google account):**

1. Go to business.google.com and search for "CARSI" to check an unclaimed listing does not already exist. If one exists, request ownership. Do not create a duplicate.
2. Enter the name **CARSI**.
3. Choose a primary category. Google says: "Use as few categories as possible to describe your overall core business from the provided list."
   - Recommended primary: **Training centre**.
   - Optional secondary: **Educational institution**.
   - Type the label into Google's picker and choose the closest exact match. The picker's wording was not verified from here.
   - Do not add categories as keywords. For example, there is no "water damage" category.
4. Location:
   - **Staffed CARSI location:** enter the street address.
   - **Travels to clients:** choose "I deliver goods and services to my customers", hide the address, and add the service areas.
5. Contact: website https://carsi.com.au. Phone only if one is published (see NAP).
6. Verify with the method Google offers (often a video of the premises or work).
7. Paste the description below. No links are allowed in the description.
8. Add hours only if in-person contact happens at those times.
9. **Only after verification:** copy the review link (Profile, then "Ask for reviews") and send it to the build thread to set as `GOOGLE_REVIEW_URL`.
   - It must look like `https://g.page/r/...` or `https://search.google.com/local/writereview?placeid=...`. Anything else is rejected by the site.
   - The site then offers that link to every reviewer after any star rating, never only to happy ones.

**Google description (paste exactly; 576 characters, under Google's 750 limit):**

> CARSI is an Australian training provider for restoration and cleaning technicians, and an IICRC CEC Accredited provider. Our online courses cover water damage restoration, structural drying, mould remediation, indoor air quality, odour control, fire and smoke restoration, and carpet and upholstery cleaning. Courses are written for Australian conditions, using AS/NZS standards, Safe Work Australia guidance, metric units and 230 V equipment. Learners study at their own pace and receive a CARSI certificate on completion. Each course page shows its details before you enrol.

Copy rules this description keeps:

- It always pairs "Accredited" with "CEC", describing CARSI's standing as a CEC provider.
- It does not claim CARSI delivers IICRC certification.
- It names no IICRC discipline acronyms.
- It makes no claim that a course earns CECs and states no CEC hours. Only 38 catalogue courses hold IICRC CEC approval (`data/seed/cec-approvals.json`, 18/10/2026), and the course pages already show which ones.
- It makes no "leading" or "best" claim, and no price or promotion. Google: the description must not "focus on special promotions, prices, and offer sales".

## B. Bing Places for Business

- **Where:** bing.com/forbusiness (bingplaces.com now redirects there).
- **Eligibility: UNVERIFIED.** Bing's rules page renders only in a browser, so its exact wording was not read for this pack. Do not rely on Bing accepting an online-only business.
- **Recommended path:**
  - **If a Google Business Profile exists and is verified:** use Bing's "import from Google" option for a single-location business. One microsoft.com community answer says Google imports are not always accepted. If the import fails, add the listing manually with the values below.
  - **If there is no Google profile:** add manually.
- **Values (identical to the NAP above):**
  - Name: CARSI
  - Website: https://carsi.com.au
  - Email: support@carsi.com.au
  - Category: Training centre (or Bing's nearest "Education > training" category)
  - Address: the same street address, or hidden if CARSI is a service-area business
  - Phone: none, unless one is published everywhere
- **Bing description:** paste the Google description above unchanged, so the wording is identical on every platform.
- **Verification:** use the method Bing offers (postcard, phone or email).

## Reviews on any listing: what CARSI must never do

These are the same rules the site's review ask follows. They come from the ACCC's online-review guidance and Google's review policy.

- Ask every learner the same way. Never ask only learners you expect to be happy, and never put a "were you happy?" screen first.
- Never offer anything for a review: no discount, voucher, prize draw, free course or upgrade.
- Never write, suggest or pre-fill review text, including "pick a review" lists and wheels.
- Never hide, delete or report a genuine negative review because it is negative. On the site, hiding needs one of four recorded reasons: offensive, personal information, not about this course, or spam or fake.
- Never post reviews for CARSI yourself, through staff, or through friends.

## Open items for Phill

1. **The eligibility question above.** Yes means section A. No means skip Google.
2. **A phone number.** Publish one or not. If one is published, it must match on the site schema and every listing.
3. **The street address.** If a profile is created, which address is it, and is it staffed? It is hidden if CARSI is a service-area business.
4. **The live Organization schema** says "Australia's leading online training platform". "Leading" is a comparative claim that needs evidence under the Australian Consumer Law. This pack does not repeat it. Whether to keep it on the site is a decision for the GEO thread and Phill.
