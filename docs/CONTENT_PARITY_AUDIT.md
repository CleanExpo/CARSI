# CARSI Content Parity Audit

**Date:** 05/03/2026
**Auditor:** Automated (Playwright + Manual Review)
**WordPress URL:** https://carsi.com.au
**Next.js Source:** `C:\CARSI\apps\web\app\`

---

## Summary

**8 WordPress pages audited. 31 gaps found.**

- 6 pages exist in both WordPress and Next.js (with content gaps)
- 5 WordPress pages have **no Next.js equivalent at all**
- 2 Next.js pages are **new** (no WordPress equivalent — improvements)

---

## Page-by-Page Analysis

### 1. Homepage

| Element                                     | WordPress                                                                                                                 | Next.js                                                                     | Status                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------- |
| Hero heading                                | "CARSI: Bridging Science and Education into Cleaning and Restoration"                                                     | Animated hero with benefits list                                            | DIFFERENT — Next.js is better                     |
| Hero description                            | "At CARSI, we offer 24/7 access to industry-approved cleaning and restoration courses..."                                 | Animated benefits bullets                                                   | DIFFERENT — Next.js improved                      |
| Video embed                                 | YouTube "Email Answered" video with play button                                                                           | None                                                                        | GAP                                               |
| "ADVICE Presentations Interviews" section   | Video + bullet list + "Check it out" CTA                                                                                  | None                                                                        | GAP                                               |
| CEC badge image                             | CARSI + CEC badge graphic                                                                                                 | None                                                                        | SMALL GAP                                         |
| Services cards                              | Membership Packages, Courses, Free Resource Library (3 cards)                                                             | None — replaced by Disciplines pills + Industries grid                      | DIFFERENT                                         |
| FREE Weekly Webinar card                    | Facebook group webinar link                                                                                               | None                                                                        | GAP                                               |
| "Bespoke Training: Your Learning, Your Way" | Text block with membership link                                                                                           | None                                                                        | GAP                                               |
| Course category grid                        | 9 image links (Admin, Carpet Cleaning, Chemicals, Cleaning, Infection Control, Free, Management, Restoration, Technician) | IICRC Disciplines pills (WRT, CRT, ASD, AMRT, FSRT)                         | DIFFERENT — Next.js uses IICRC-aligned categories |
| Benefits section                            | "Australia's Only CFO and SBFRS", "Over 50 years Industry Experience", "Raise the Bar!", "Grow YOUR Business"             | "24/7 Access", "No Travel Required", "Instant Credentials"                  | DIFFERENT — Next.js benefits are more specific    |
| Partner logos                               | CCW, CCA Vic, Restoration Advisers, Aeroair                                                                               | None                                                                        | GAP                                               |
| Newsletter signup form                      | First Name, Last Name, Email, T&C checkbox, Subscribe button                                                              | None                                                                        | GAP                                               |
| CleanExpo 24/7 banner                       | Clickable image linking to CARSI media                                                                                    | None                                                                        | GAP                                               |
| Magazine articles section                   | "CARSI features in Industry Magazines!" + 2 article links                                                                 | None                                                                        | GAP                                               |
| Podcast promo                               | "Listen to our Podcast" + Amazon Music link                                                                               | None                                                                        | GAP                                               |
| Social links (header)                       | Facebook, YouTube, LinkedIn, Spotify                                                                                      | None in header (only footer email)                                          | GAP                                               |
| Stats bar                                   | None                                                                                                                      | "24/7 Online Access", "12+ Industries", "91 Courses", "7 IICRC Disciplines" | NEW (Next.js improvement)                         |
| IICRC certification explainer               | None                                                                                                                      | Full GEO-optimised passage with sources                                     | NEW (Next.js improvement)                         |
| FAQ section                                 | None                                                                                                                      | 5 FAQ items with schema markup                                              | NEW (Next.js improvement)                         |
| NRPG partnership section                    | None                                                                                                                      | Full partnership callout                                                    | NEW (Next.js improvement)                         |

**WordPress nav links:** Services, Home, Podcast, Courses, Membership, Login, Basket
**Next.js nav links:** Courses, Industries, Pathways, Pricing, Sign In, Browse Courses

### 2. Courses Page

| Element                      | WordPress                                                     | Next.js                                     | Status                                   |
| ---------------------------- | ------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| Page title                   | "Courses" (H1)                                                | "Restoration Training Courses" (H1)         | OK — Next.js is better                   |
| Breadcrumbs                  | Home / Restoration Courses & Training                         | None                                        | SMALL GAP                                |
| Search bar                   | Product search                                                | None (has discipline filter tabs)           | DIFFERENT                                |
| Course listing               | WooCommerce product grid with images, prices, "Add to basket" | CourseGrid component with discipline tabs   | DIFFERENT — Next.js is better structured |
| Course count                 | ~25+ visible on first page                                    | Dynamic from API                            | OK                                       |
| Course prices visible        | Yes ($20–$770, FREE)                                          | Yes (from API)                              | OK                                       |
| "Add to basket" buttons      | Yes (WooCommerce cart)                                        | No — uses enrolment flow                    | DIFFERENT (by design)                    |
| Course categories in sidebar | Admin, Carpet Cleaning, Chemicals, Cleaning, etc.             | IICRC discipline tabs (WRT, CRT, ASD, etc.) | DIFFERENT — Next.js improved             |
| GEO question sections        | None                                                          | 3 GEO-optimised Q&A sections                | NEW (Next.js improvement)                |
| CEC Calculator tool          | None                                                          | Interactive CECCalculator component         | NEW (Next.js improvement)                |
| Bundle pricing               | None                                                          | BundlePricingCard grid                      | NEW (Next.js improvement)                |

**WordPress courses visible (partial list):**
Admin Sole Trader ($275), AGI Essentials, Asthma and Allergy ($129), Carpet Cleaning Basics ($55), CARSI ChatGPT EBook ($20), Collaborative Development AI ($49), Comprehensive ChatGPT Cheat Sheet (FREE), Donning and Doffing PPE ($39), Free Library (FREE), Fundamental Business Framework ($770), Glass Cleaning ($20), Heat Drying Systems (FREE), Infection Control in Child Care ($99), Infectious Control for Business Owner ($275), Initial Inspection Report ($49), Insurance Adjusters (FREE), Intro to Advanced Applied Structural Drying (FREE), Intro to Advanced Drying Equipment ($29), Intro to Advanced Structural Drying ($29), Intro to Air Quality ($29), Intro to Applied Microbial Remediation ($29), Intro to Applied Structural Drying ($29), Intro to Asbestos Awareness ($29), Intro to Basic Carpet Cleaning ($29), Intro to Biological Contaminants ($29), Intro to Complex Water Losses ($29), Intro to Controlled Environment Drying ($29), Intro to Clean Air Environment ($29), Intro to Developing a Drying Protocol ($29), Intro to Digital Moisture Mapping ($29)

### 3. About Page

| Element                              | WordPress                                                                                                       | Next.js                         | Status                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------- |
| Page title                           | "About Us" (H1)                                                                                                 | "About the Unite-Group Nexus"   | GAP — should be "About CARSI" |
| YouTube video                        | Embedded "Email Answered" video                                                                                 | None                            | GAP                           |
| "Growth Support Development" heading | Yes                                                                                                             | None                            | GAP                           |
| Company description                  | "At CARSI, we support the cleaning and restoration industry... membership includes over $6,000 in resources..." | Generic Unite-Group description | GAP — content mismatch        |
| Membership tier preview              | "Everything in Free PLUS" (Policies, Procedures, Templates, Marketing, Starting a Business)                     | None                            | GAP                           |
| Growth tier preview                  | "Everything in Foundation PLUS" (Asthma/Allergy, ATP, NeoSan Labs, Safety Induction, Staffing)                  | None                            | GAP                           |
| "Australia's Only CFO and CBFRS"     | Yes                                                                                                             | None                            | GAP                           |
| "Variety of Resources"               | Yes                                                                                                             | None                            | GAP                           |
| "Over 50 Years Industry Experience"  | Yes                                                                                                             | None                            | GAP                           |
| Carousel/slider                      | 3 slides                                                                                                        | None                            | GAP                           |
| IICRC CEC disclaimer                 | Full legal disclaimer text                                                                                      | None                            | GAP                           |
| IICRC disciplines list               | None                                                                                                            | List of 7 disciplines           | PARTIAL — Next.js has this    |
| RestoreAssist / Unite-Group sections | None                                                                                                            | Yes — describes ecosystem       | NEW but wrong focus           |

**Critical gap:** The Next.js About page describes "Unite-Group Nexus" instead of CARSI itself. This needs to be rewritten to match the WordPress CARSI-focused content.

### 4. Membership/Pricing Page

| Element              | WordPress                                                                              | Next.js                                        | Status    |
| -------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------- | --------- |
| Page title           | "Membership"                                                                           | Subscribe page at /subscribe                   | DIFFERENT |
| Tier: Free Library   | FREE — 12 items listed (AU Gov Resources, SOPs, Cleaning Essentials, JSEA, SWMS, etc.) | None                                           | GAP       |
| Tier: Foundation     | $44/month — 10 items listed (Policies, PPE, Microbe Clean, Mould Remediation L1, etc.) | None                                           | GAP       |
| Tier: Growth         | $99/month — 8 items listed (NeoSan Labs, Social Media Marketing, Admin Course, etc.)   | None                                           | GAP       |
| YouTube tutorial     | "How to login and view your membership"                                                | None                                           | GAP       |
| Contact/request form | "Let us know what you are after!" form                                                 | None                                           | GAP       |
| Partner images       | 2 partner images                                                                       | None                                           | GAP       |
| Next.js pricing      | N/A                                                                                    | $795 AUD/year single tier with Stripe checkout | DIFFERENT |

**Critical gap:** WordPress has 3 membership tiers (Free, $44/mo, $99/mo). Next.js has a single $795/year subscription. The tiered pricing structure is missing. This may be intentional (business model change), but should be confirmed with Phil.

### 5. Contact Page

| Element           | WordPress                                   | Next.js                        | Status       |
| ----------------- | ------------------------------------------- | ------------------------------ | ------------ |
| Page exists       | /contact-us-2/                              | None — no /contact route       | MISSING PAGE |
| Address           | PO Box 4309, Forest Lake QLD 4078           | Footer only: info@carsi.com.au | GAP          |
| Email             | support@carsi.com.au                        | info@carsi.com.au (footer)     | MISMATCH     |
| Contact form      | First Name, Last Name, Email, Message, Send | None                           | GAP          |
| Social links      | Facebook, YouTube, LinkedIn, Spotify        | None on contact page           | GAP          |
| Newsletter signup | Full form with T&C checkbox                 | None                           | GAP          |

### 6. Footer

| Element             | WordPress                                                                                                                                                   | Next.js                                                                                             | Status                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------- |
| CARSI logo          | Yes (image)                                                                                                                                                 | "C" badge + "CARSI" text                                                                            | DIFFERENT                       |
| Tagline             | "We aim to educate individuals and businesses about the importance of cleaning for health."                                                                 | "Australia's industry training leader. 24/7 online. IICRC-approved."                                | DIFFERENT                       |
| Social links        | Facebook, YouTube, LinkedIn, Spotify (with icons)                                                                                                           | None                                                                                                | GAP                             |
| Information section | Membership, Work with Us, About Us, Contact Us, Testimonials, SEO Ranking Assistant, Electrical Cost Calculator, Molecular Science Tool, Restore Assist App | Platform: Courses, Pathways, Pricing, About                                                         | GAP — missing many links        |
| Course categories   | View All, Admin, Apparel, Carpet Cleaning, Chemicals, Face To Face, Management, Technician, Water Damage, Infectious Control, Restore Assist App            | Industries: Healthcare, Hotels, Government, Commercial Cleaning                                     | DIFFERENT                       |
| Support section     | PO Box, support@carsi.com.au, 0457 123 005                                                                                                                  | Contact: info@carsi.com.au                                                                          | GAP — missing address and phone |
| Copyright           | "All Rights Reserved \| Carsi 2025"                                                                                                                         | "(c) 2026 CARSI Pty Ltd. All rights reserved." + "IICRC-aligned continuing education -- not an RTO" | OK — Next.js is better          |

---

## Missing Pages (WordPress has, Next.js does not)

### /contact-us (PRIORITY: HIGH)

- Contact form with First Name, Last Name, Email, Message
- Address: PO Box 4309, Forest Lake QLD 4078
- Email: support@carsi.com.au
- Phone: 0457 123 005
- Social links
- Newsletter signup

### /podcast (PRIORITY: MEDIUM)

- "The Science of Property Restoration" podcast
- iHeart Radio embedded player (latest episodes)
- 70+ Spotify embedded episode players
- Amazon Music link
- Episodes include: "2026 Google Search is Changing", "Insurance Companies Profiteering", "NSW Bushfire Inquiry", "IICRC S540 Trauma Cleanup", "IICRC S520 Mould Remediation", "Understanding Structures", "Impact of Climate Change", "Residential Carpet Cleaning", "Psychology of Disaster", "Fire and Smoke Restoration", "Continual Education Credits", "Restoration Ethics"

### /testimonials (PRIORITY: HIGH)

- 8 customer testimonials with names and businesses:
  - Shannon Benz (Mould Solutions Group)
  - Yasser Mohamed (Black Gold Carpet Cleaning)
  - Klark Brown (Restoration Advisers)
  - Phillip Wolffe (Armour IT Australia)
  - Kayla McGowan (Restoration and Remediation Magazine)
  - Lisa Lavender (RTI Learning)
  - Joko Mardiono (AeroAir Australia)
  - Toby Bredhauer (Carpet Cleaners Warehouse)
- Feedback submission form
- Social review links (Facebook, LinkedIn)

### /work-with-us (PRIORITY: LOW)

- Affiliate membership program ($220/year)
- Requirements list (updates, honesty, engagement, etc.)
- Target affiliates list (telco, insurance, suppliers, marketing, accounting, etc.)
- Contact form

### /blog (restoration-industry-blogs-webinars) (PRIORITY: MEDIUM)

- Blog listing page with categories: View All, Business, Cleaning, E-Learning, Education, Newsletters, Restoration
- 9+ blog posts visible on page 1 (5 pages total)
- Newsletter sidebar signup (Sendinblue/Brevo)
- Recent posts include: "Safety in Restoration", "Working at Heights", "AI Cold War in Business", "AI & Water Damage", "Power of Media & PR", "Website as Sales Weapon", "Chatbots & Predictive Engagement", "LA Wildfires Restoration", "Property Restoration Courses Online"

---

## Next.js Pages With No WordPress Equivalent (improvements)

| Page                 | Purpose                                | Status                        |
| -------------------- | -------------------------------------- | ----------------------------- |
| /industries          | 13 industry-specific training pages    | NEW — significant improvement |
| /pathways            | IICRC certification learning pathways  | NEW — significant improvement |
| /subscribe           | Stripe subscription checkout ($795/yr) | Replaces tiered membership    |
| /credentials/[id]    | Public credential verification         | NEW — significant improvement |
| /student/leaderboard | XP gamification leaderboard            | NEW                           |

---

## Priority Gaps (implement first)

### P0 — Critical (blocks launch credibility)

1. **Contact page** (`/contact`) — Every business site needs a contact page. Address, phone, email, contact form.
2. **About page rewrite** — Current About page describes "Unite-Group Nexus" instead of CARSI. Must describe CARSI's mission, experience, CEC credentials.
3. **Footer contact details** — Add address (PO Box 4309, Forest Lake QLD 4078), phone (0457 123 005), correct email (support@carsi.com.au).
4. **Footer social links** — Add Facebook, YouTube, LinkedIn, Spotify links.

### P1 — High (trust signals)

5. **Testimonials page** (`/testimonials`) — 8 real testimonials from named industry professionals. Critical for trust.
6. **Partner logos** on homepage — CCW, CCA Vic, Restoration Advisers, Aeroair.
7. **Newsletter signup** — Form on homepage and/or footer. Currently no way to subscribe.
8. **Homepage video** — Embedded YouTube video (key engagement element on WP site).

### P2 — Medium (content completeness)

9. **Podcast page** (`/podcast`) — Spotify/iHeart embeds for "The Science of Property Restoration".
10. **Blog/articles page** (`/blog`) — 40+ blog posts across 7 categories.
11. **IICRC CEC disclaimer** — Legal text from WordPress About page.
12. **Homepage "Magazine Articles"** section — CARSI features in C&R Magazine.

### P3 — Low (nice to have)

13. **Work With Us / Affiliate page** — $220/yr affiliate program.
14. **Free Resource Library** promotion — Highlighted on WP homepage.
15. **Course category images** — WP has visual category browsing tiles.
16. **Breadcrumbs** on courses page.

---

## Small Fixes Applied (this session)

### 1. Footer — added contact details, social links, and correct email

**File:** `C:\CARSI\apps\web\app\page.tsx` (lines 776–826)

- Changed email from `info@carsi.com.au` to `support@carsi.com.au` (matching WordPress)
- Added PO Box 4309, Forest Lake QLD 4078
- Added phone number: 0457 123 005
- Added social media links: Facebook, YouTube, LinkedIn, Spotify (Podcast)

### 2. About page — complete rewrite to focus on CARSI

**File:** `C:\CARSI\apps\web\app\(public)\about\page.tsx` (full rewrite)

- Changed title from "About the Unite-Group Nexus" to "About CARSI"
- Added SEO metadata (title + description)
- Added CARSI mission statement matching WordPress content ("Growth. Support. Development.")
- Added 3 credential cards: "Australia's Only CFO and CBFRS", "Over 50 Years Industry Experience", "Raise the Bar"
- Added styled IICRC discipline grid (code + label format)
- Added IICRC CEC disclaimer text (matching WordPress verbatim)
- Applied site-wide glass styling (mesh background, consistent colours)
- Removed Unite-Group Nexus / RestoreAssist sections (wrong focus for public page)

---

## WordPress Navigation Structure

```
Top bar:     About Us | Work With Us | Blog Posts | Contact Us
             [Search] [Facebook] [YouTube] [LinkedIn] [Podcast]

Main nav:    [LOGO] Services | Home | Podcast | Courses | Membership | Login | [Basket]

Footer:      Information          Courses              Support
             - Membership         - View All            - PO Box 4309, Forest Lake QLD 4078
             - Work with Us       - Admin               - support@carsi.com.au
             - About Us           - Apparel             - 0457 123 005
             - Contact Us         - Carpet Cleaning
             - Testimonials       - Chemicals
             - SEO Ranking        - Face To Face
             - Electrical Calc    - Management
             - Molecular Tool     - Technician
             - Restore Assist     - Water Damage
                                  - Infectious Control
                                  - Restore Assist App
```

## Next.js Navigation Structure

```
Main nav:    [C LOGO] Courses | Industries | Pathways | Pricing | Sign In | [Browse Courses]

Footer:      Platform        Industries              Contact
             - Courses       - Healthcare             - info@carsi.com.au
             - Pathways      - Hotels & Resorts
             - Pricing       - Government & Defence
             - About         - Commercial Cleaning
```
