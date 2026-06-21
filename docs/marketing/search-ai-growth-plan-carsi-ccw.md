# CARSI + CCW Search and AI Visibility Growth Plan

Research snapshot: 18 June 2026

This plan translates the latest official Google and Bing guidance into the practical work required to improve CARSI visibility, strengthen the CCW/CARSI relationship, and make both brands easier for search engines and AI answer systems to cite.

## Strategic conclusion

The winning strategy is not a separate "AI SEO trick." Google now says generative search visibility is still built on core Search quality systems: crawlable pages, useful expert content, and clear technical structure. Bing is giving publishers more measurable AI-specific feedback through Bing Webmaster Tools AI Performance, grounding query phrases, cited pages, and IndexNow.

For CARSI and CCW, the strongest opportunity is to become the practical evidence source for people who are:

- starting a carpet cleaning business with little experience;
- already cleaning and wanting to add carpet, tile, stain, rug, or restoration work;
- comparing equipment, chemicals, service support, and training before they buy;
- searching for trusted Australian training linked to real suppliers and real field practice;
- looking for free CCW customer training days, Roadshow events, and business growth sessions.

The CCW/CARSI link should be positioned as one connected operating system:

Training builds competence. CCW equipment and chemicals turn competence into field capability. CCW service keeps the machines working. CARSI keeps the operator improving.

## What Google is saying now

Google's current generative AI guidance says:

- AI Overviews and AI Mode are rooted in Google's core Search ranking and quality systems.
- RAG/grounding and query fan-out mean one user question can trigger multiple related searches before an AI answer is assembled.
- The best long-term lever is unique, expert-led, non-commodity content that goes beyond generic summaries.
- Technical clarity still matters: indexed pages, crawlability, snippets, semantic structure, and JavaScript SEO are still foundational.
- Google does not use `llms.txt` or special AI-only files for Google Search visibility, although keeping such files for other AI systems is acceptable.
- Structured data is not required for generative AI visibility, but it remains useful for rich results and entity clarity.
- Inauthentic mentions and artificial citation campaigns are risky and should not be used.

Implication for CARSI:

CARSI should not create thin pages for every phrase. It should create a small number of excellent, evidence-backed pages that answer high-intent questions better than generic SEO pages can.

## What Bing is saying now

Bing's public AI Performance reporting gives us more direct tactical levers:

- Bing Webmaster Tools can show total AI citations, average cited pages, grounding queries, page-level citation activity, and visibility trends.
- Bing recommends strengthening expertise, structure, claim support, freshness, and consistency across text, images, and video.
- IndexNow helps Bing and participating engines discover new, updated, or deleted URLs faster.
- Bing notes local business data matters for location-based AI answers, so CCW locations and event details need clean local business signals.

Implication for CARSI:

Bing should become the measurement lab. If CARSI pages start appearing as cited pages or grounding query sources, those phrases should guide new page improvements and CCW/CARSI internal linking.

## Current repo position

Already present in the CARSI build:

- dynamic sitemap in `app/sitemap.ts`;
- robots route in `app/robots.ts`;
- authority hub path included in the sitemap;
- Roadshow event path included in the sitemap;
- `public/llms.txt` and citation packs for non-Google AI systems;
- authority content data in `src/lib/marketing/authority.ts`;
- schema helpers for organization, person, event, and article-style data.

Important correction:

`llms.txt` is worth keeping for non-Google AI tools and crawler-friendly summaries, but it should not be counted as a Google ranking or Google AI Overview lever.

## Content architecture to build

### 1. The CARSI/CCW bridge page

Create a pillar page that explicitly connects:

- professional equipment;
- machine servicing;
- chemicals and chemistry;
- CARSI training;
- Roadshow/customer days;
- business growth support.

Recommended page intent:

`/industry-training-equipment-chemicals-service`

Recommended page title:

`Training, Equipment, Chemicals and Service for Carpet Cleaning Businesses`

This should be the page both brands can point to when the market asks: "What do I actually need to start or grow properly?"

### 2. Start Smart cluster

Strengthen the existing Start Smart pages around query fan-out, but keep them substantial:

- How to start a carpet cleaning business with no experience.
- What equipment do I need before taking my first paid job?
- What carpet cleaning chemicals should a beginner understand?
- How do I quote carpet, stain, rug, and tile cleaning work?
- What training should I complete before buying expensive machinery?
- How do I avoid damaging carpet, upholstery, tile, or stone?
- How CCW customers can use free CARSI/CCW Roadshow training days.

Each page should include:

- an expert answer in plain language;
- a practical checklist;
- a CCW equipment/service/chemical connection where relevant;
- a CARSI course or Roadshow next step;
- visible references or source notes where claims rely on standards, suppliers, or external guidance.

### 3. Evidence library

Build a lightweight public library of evidence-backed resources:

- field notes from training days;
- anonymised common mistakes and fixes;
- chemical comparison explainers;
- machine maintenance intervals;
- before/after process writeups;
- pricing and quoting frameworks;
- safety and compliance notes;
- course outlines and learning outcomes.

This library becomes the proof base for AI citations, social posts, email campaigns, and internal sales conversations.

### 4. Community and authority loop

Create recurring contribution paths:

- Roadshow Q&A recap pages after Melbourne and Sydney;
- "Ask CARSI" question submissions;
- CCW customer case studies;
- supplier/trainer roundtable notes;
- company days and industry appreciation days;
- awards nomination pages for high-quality operators;
- CARSI newsletters that summarize the best new learning each month.

This turns CARSI into a living industry source, not just a static course catalogue.

## Structured data priorities

Implement and validate these in order:

1. `Organization` for CARSI, with `sameAs`, logo, contact, social, and relationship to CCW where appropriate.
2. `LocalBusiness` or CCW location references on event/location-specific pages.
3. `Course` and `CourseInstance`/course list data for core CARSI courses.
4. `Event` data for Melbourne and Sydney Roadshow pages, including free entry for eligible CCW customers where represented on-page.
5. `FAQPage` or visible Q&A content on Start Smart and Roadshow pages.
6. `ProfilePage`/`Person` for Toby, Phill, trainers, and recognised experts once bios are approved.
7. `Article`/`NewsArticle` for evidence library updates and Roadshow recap articles.
8. `VideoObject` for any training clips, Roadshow previews, and YouTube embeds.

Structured data should mirror visible page content. Do not add claims to schema that are not visible and supportable on the page.

## Technical discovery tasks

P0:

- Validate `https://www.carsi.com.au/sitemap.xml` in Google Search Console.
- Validate the sitemap in Bing Webmaster Tools.
- Use Google URL Inspection on priority URLs after publication.
- Use Bing URL Inspection on priority URLs after publication.
- Generate an IndexNow key and host the key file on `www.carsi.com.au`.
- Add an IndexNow submit workflow for new/updated CARSI pages. The repo now includes `npm run seo:submit-indexnow`; run it without `--send` to preview the URL payload and with `--send` after `INDEXNOW_KEY` and the hosted key file are ready.
- Submit the Roadshow, authority hub, Start Smart, and bridge page URLs after deployment.

P1:

- Check Google Rich Results Test for courses, events, organization, FAQ/Q&A, profile pages, and articles.
- Add image alt text and Open Graph imagery to all major pillar pages.
- Ensure canonical URLs are stable between `carsi.com.au` and `www.carsi.com.au`.
- Make CCW links back to CARSI use consistent, descriptive anchors.
- Make CARSI links to CCW use practical anchors like `professional carpet cleaning machines`, `carpet cleaning chemicals`, `machine servicing`, and `CCW customer training days`.

P2:

- Add video transcripts to training/event pages.
- Create downloadable course outline PDFs with matching page content.
- Add citation packs for each major pillar, not just a single generic pack.
- Run a monthly crawl audit for broken links, missing titles, duplicate descriptions, and schema validation.

## Measurement plan

Google:

- Search Console performance by page cluster.
- Search Console query growth for Start Smart and Roadshow terms.
- Generative AI performance reports when available to the CARSI property.
- Indexed pages and page eligibility via URL Inspection.
- Rich Results Test eligibility for course, event, organization, and article markup.

Bing:

- Bing Webmaster Tools AI Performance: total citations, cited pages, grounding query phrases, and visibility trend.
- Bing URL Inspection for new pages.
- IndexNow submission success and recrawl behaviour.
- Bing Places accuracy for CCW physical locations.

Manual AI visibility checks:

Run a monthly prompt set in Google AI Mode, Bing Copilot, ChatGPT Search, Perplexity, and Gemini. Track whether CARSI or CCW appears, whether the answer is accurate, and which pages are cited.

Priority prompts:

- `best course before starting a carpet cleaning business in Australia`
- `how to start a carpet cleaning business with no experience`
- `what equipment do I need for carpet cleaning`
- `carpet cleaning chemistry training Australia`
- `tile cleaning training for carpet cleaners`
- `stain removal training Australia`
- `CCW carpet cleaning training`
- `CARSI carpet cleaning course`
- `free carpet cleaning training day Melbourne`
- `free carpet cleaning training day Sydney`

## 30-day implementation backlog

Week 1:

- Publish the CARSI/CCW bridge page.
- Add the bridge page to the sitemap and navigation/footer where appropriate.
- Validate existing Roadshow event schema and free-entry wording.
- Prepare IndexNow key and submission script.

Week 2:

- Strengthen Start Smart pages with practical checklists, CCW links, and CARSI course links.
- Add FAQ/Q&A sections to top pages.
- Add source notes to authority and Start Smart content.
- Validate structured data with Rich Results Test.

Week 3:

- Publish first evidence library pages:
  - beginner equipment checklist;
  - chemical safety and pH basics;
  - machine servicing interval guide;
  - quoting basics for new operators;
  - Roadshow training outline.
- Add matching social and email snippets.

Week 4:

- Submit updated URLs to Google and Bing.
- Run Bing AI Performance and URL Inspection checks.
- Run manual AI visibility prompt checks.
- Create a short report: indexed, cited, not cited, inaccurate, next content target.

## Guardrails

- Do not manufacture mentions, fake reviews, or artificial citations.
- Do not create mass thin pages for every keyword variation.
- Do not use `llms.txt` as a claimed Google Search lever.
- Do not publish technical, chemical, safety, or compliance claims without reviewable backing.
- Do not separate CARSI training from CCW equipment, chemicals, and service where the user decision naturally requires all four.

## Official source links

- Google: Optimizing your website for generative AI features on Google Search: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google: Search Generative AI performance reports in Search Console: https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports
- Google: Structured data features supported by Google Search: https://developers.google.com/search/docs/appearance/structured-data/search-gallery
- Bing: AI Performance in Bing Webmaster Tools: https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview
- Bing: Add IndexNow to your website: https://www.bing.com/indexnow/getstarted
- IndexNow protocol documentation: https://www.indexnow.org/documentation
