# AI Pathway for small business: research pack (read 14 Oct 2026)

Scope: desktop AI apps as of 14 Oct 2026, for Phill McGurk's 15-minute Melbourne talk. All "read 2026-10-14".
Confidence tags: [OFFICIAL] vendor/government page fetched directly; [SECONDARY] third-party or search snippet only; UNCONFIRMED = could not verify.
Method limits: chatgpt.com, openai.com and help.openai.com returned HTTP 403 to my fetcher, so ChatGPT pricing/features come from search-result summaries of OpenAI pages plus third-party blogs. Several fetches (industry.gov.au, ai.gov.au) timed out; gov figures are from search summaries unless noted.

## 1. Three biggest 2026 changes for non-coders
1. Agents moved into the desktop app and stopped needing a terminal. Claude Cowork (macOS Jan 12 -> Windows GA Apr 9, Pro from Jan 16), ChatGPT Work (launched 9 Jul 2026, per search summary of OpenAI notes [SECONDARY]), Gemini "Tasks" (formerly Spark), Copilot Tasks. You describe an outcome; it does multi-step work on files, browser, apps.
2. "While you sleep" is now a button: scheduled/recurring tasks exist in Claude (Cowork, cloud-run, Feb 25), ChatGPT Work, Gemini Tasks schedules, Copilot Tasks, Perplexity Max background assistants. The chatbot stage (type, read, copy-paste) is no longer the ceiling.
3. Connectors reached Australian small-business software: MYOB announced customer balances / overdue invoices / P&L inside Claude and ChatGPT (17 Aug 2026, phased); Xero has a connector listed in Anthropic's directory [SECONDARY, sources conflict on hosted vs self-hosted]. Plus memory/skills/projects make the AI "know your business" persistently.

## 2. App-by-app

### 2.1 Claude (Anthropic)
- Desktop: macOS, Windows (x64/ARM64), Linux beta; iOS app (+ Android link). Source: https://claude.com/download [OFFICIAL]. Quick Entry hotkey, connectors, Claude in Chrome, Claude Code in the desktop app, Cowork.
- Release notes 2026 (https://support.claude.com/en/articles/12138966-release-notes [OFFICIAL]):
  - Cowork research preview 12 Jan (Max, mac), Pro 16 Jan, GA on macOS+Windows 9 Apr; scheduled recurring tasks 25 Feb; persistent agent thread 17 Mar; web/mobile 7 Jul; Cowork capabilities in any conversation 16 Sep (rolling out to Pro/Max).
  - Computer use research preview in Cowork and Claude Code, 23 Mar (Pro/Max), works with Dispatch (phone to desktop).
  - Memory: free users 2 Mar; reworked into editable categorised entries 10 Jul; memory across chat and Cowork 25 Aug, with a setting keeping sensitive topics out.
  - Connectors: Microsoft 365 connector gained write tools 7 Jul (needs admin consent); Skills in Excel/PowerPoint add-ins 11 Mar; plugins marketplace for Team/Enterprise 24 Feb.
  - 7 Oct: Max and Team plans include monthly API credits.
- Cowork specifics (https://support.claude.com/en/articles/13345190-getting-started-with-cowork [OFFICIAL]): paid plan required; sessions run in cloud; local files/browser/computer use need the Desktop app open; `/schedule` or "Scheduled" sidebar; scheduled tasks run in the cloud so your computer need not be awake; approval modes Manual / Auto / Skip; only folders you connect; deleting needs explicit permission.
- Projects: Free up to 5, paid unlimited (pricing page). Artifacts shared between chat and Cowork since 7 Jul.
- Pricing USD only (AUD UNCONFIRMED; Anthropic help says local currency "where supported" and sends users to claude.ai/upgrade while signed in): https://claude.com/pricing [OFFICIAL]
  - Free $0; Pro US$17/mo annual (US$200 upfront) or US$20 monthly; Max from US$100 (5x) / US$200 (20x); Team standard US$20 annual / US$25 monthly per seat, premium seat US$100 / US$125; Team min 2 members (support search result [SECONDARY-official snippet]). Enterprise US$20/seat + usage.
- Privacy: https://privacy.claude.com/en/articles/10023580-is-my-data-used-for-model-training [OFFICIAL] Consumer (Free/Pro/Max): chats used for model improvement only if you opt in via privacy settings (or flagged for safety, or Trusted Tester). Connector raw content excluded unless pasted. Incognito chats never used. Feedback thumbs conversations stored up to 5 years. Team/Enterprise/API: separate commercial terms page not read, so UNCONFIRMED here; check before telling the room "Team is never trained on".
- Xero: connector listed in Anthropic's directory (7 read tools) [SECONDARY: usecarly/peliqan/cdata; one guide says official Xero MCP is self-hosted: conflict]. MYOB: see 4.4.

### 2.2 ChatGPT (OpenAI)
- Official pages blocked (403). Findings from search summaries of OpenAI release notes and third-party blogs: treat as SECONDARY.
  - Codex merged into the ChatGPT desktop app on macOS/Windows 9 Jul 2026; Windows Computer Use since 29 May (not EEA/UK/CH); desktop browser tools 31 Aug; Windows "Appshots" (both Alt keys) 11 Sep; GPT-6 Sol/Luna 22 Sep, GPT-6.1 Sol 29 Sep; GPT-5.5 retiring 14 Oct (today). Source: https://help.openai.com/en/articles/6825453-chatgpt-release-notes and https://developers.openai.com/codex/changelog (search summary).
  - ChatGPT Work (agent-style workspace, 9 Jul 2026): can run scheduled tasks (once, recurring, trigger, monitor), paid plans except Free/Go at launch; one guide says no inbox trigger (runs start by person or schedule). SECONDARY.
  - Memory, projects, custom GPTs, connectors (Gmail, Drive, Slack, etc.; MCP connectors since Nov 2025): present per search summaries; details UNCONFIRMED from official page.
- Pricing (all SECONDARY, UNCONFIRMED against official page): Go US$8; Plus US$20 (AUD estimate ~A$31.75 ex-rounding; glbgpt.com says ~A$35 incl GST: unreliable reseller site; OpenAI help reportedly confirms AUD billing on web); Pro tiers US$100 / US$200 / US$500 (Pro 500 announced 29 Sep); Business US$20 annual / US$25 monthly per user, 2-seat minimum. Go reportedly live in Australia since Jan 2026 [SECONDARY].
- Privacy (search snippets of OpenAI help pages, https://help.openai.com/en/articles/8983130 and /8798634): personal Free/Plus/Pro training ON by default; opt out at Settings > Data controls > "Improve the model for everyone" (new chats only; thumbs feedback still usable). Business/Enterprise/Edu/API: not trained on by default; connectors on by default for Business, admin-controlled.

### 2.3 Gemini + Google (Workspace, NotebookLM)
- Gemini app on Mac launched 15 Apr (free, macOS 15+, Option+Space); Windows app 10 Sep; Fn-hold dictation 29 Jul; 13 Oct: Gemini 4 Argon rolling out for AI Pro/Ultra, Antigravity coding agent in Mac app, "Customize" for all tiers. Source: https://gemini.google/release-notes/ (search summary) [OFFICIAL-via-search].
- Gemini "Tasks" (ex-Spark): https://support.google.com/gemini/answer/17094507 [OFFICIAL]: needs Google AI Pro or Ultra; personal Google account only (not work/school); excludes EEA, Nigeria, Switzerland, UK; page does not mention Australia (so appears available, not explicitly confirmed). Works across Gmail, Calendar, Drive, Docs, Sheets, Slides, Keep, Tasks, Photos, YouTube, Maps; browses via local Chrome or cloud browser; schedules at a time or on an event; 15 concurrent cap; schedules don't run if device is off or task mode off; asks confirmation before sending, purchasing, submitting.
- Gemini Notebook = NotebookLM renamed (https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/ [search snippet]); Audio/Video Overviews, slide decks, infographics; cloud computer with code execution (Ultra/Workspace first); usage moved to compute-based limits refreshed every 5 hours (Sep).
- AUD pricing:
  - Google AI Plus A$14.99/mo (2 TB), AI Pro A$32.99/mo (5 TB): https://one.google.com/about/plans?hl=en-AU&gl=AU [OFFICIAL]. Ultra AUD price UNCONFIRMED. (USD page: Pro includes Gemini in Gmail/Docs/Sheets, Tasks; Ultra adds Gemini Agent [US, English only per that page].)
  - Workspace (A$/user/mo, monthly billing, ex-GST not stated): Starter A$9.90, Standard A$19.80, Plus A$30.90; page shows intro discounts from 27 Oct 2026 (Starter 30% off, Standard/Plus 50% off, first 3 months). Gemini in Docs/Sheets/Meet/Drive from Standard up; Starter has Gmail Gemini + basic app: https://workspace.google.com/intl/en_au/pricing [OFFICIAL].
- Privacy: https://support.google.com/gemini/answer/13594961 [OFFICIAL]: consumer Gemini chats may train models when Keep Activity is on; off or Temporary Chat = not used for training, kept 72 h; human-reviewed chats kept up to 3 years; auto-delete default 18 months. Workspace data handled under separate Workspace Privacy Hub (not read): UNCONFIRMED here.

### 2.4 Microsoft Copilot
- Consumer, AU (https://www.microsoft.com/en-au/microsoft-365-copilot/pricing/individuals [OFFICIAL]): Microsoft 365 Personal A$16/mo or A$159/yr; Family A$18 / A$179 (AI for the owner only); Premium A$33 / A$329 (only Premium lists agentic AI features).
- Copilot Tasks (https://support.microsoft.com/en-us/microsoft-copilot/using-copilot-tasks [OFFICIAL]): plain-language goals, browses sites, edits files, uses connected email/storage; one-off or scheduled; approvals required for payments, personal info submission, messages to others, account changes. Page says personal Tasks users migrate to "Copilot Cowork" within weeks, so naming will change.
- Business, AU, ex-GST per user/month (https://www.microsoft.com/en-au/microsoft-365-copilot/pricing [OFFICIAL]): Business Premium with Copilot A$47.90 annual / A$57.48 monthly; Business Standard with Copilot A$35.20 / A$42.24; Copilot Business add-on A$26.91 annual (promo 1 Jul-31 Dec 2026, first year, existing eligible customers; regular A$31.40) / A$37.68 monthly. 
- Privacy: M365 Copilot prompts/responses/Graph data not used to train foundation models (https://learn.microsoft.com/en-us/microsoft-365/copilot/microsoft-365-copilot-privacy, search snippet [OFFICIAL-via-search]). Consumer Copilot training/opt-out settings: UNCONFIRMED.

### 2.5 Perplexity
- https://www.perplexity.ai/hub/pricing [OFFICIAL, currency unstated, likely USD]: Free; Pro $17/mo billed annually; Max $167/mo billed annually (help centre: $200 monthly / $2,000 yearly); Enterprise separate. Pro/Max include "Computer" (Max: 10,000 monthly credits). AUD UNCONFIRMED.
- Comet browser free worldwide (date conflicts between sources: Oct 2025 vs Mar 2026), iOS/Android/Mac/Windows; Background Assistants run parallel agent tasks, Max only [SECONDARY + perplexity changelog snippet]. Comet Plus $5 (free with Pro/Max) [SECONDARY]. Training/privacy settings: UNCONFIRMED.

### 2.6 Others
- Apple Intelligence / Siri AI: Apple AU says Siri AI is rolling out in English as beta on iOS/iPadOS/macOS 27 (newsroom 14 Sep 2026); ChatGPT extension via Siri settings; needs compatible devices (iPhone 15 Pro and later). https://www.apple.com/au/apple-intelligence/ and https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/ [search snippets]. No AUD price (bundled). Gemini-in-Siri: not found.
- Grok (xAI): tiers in USD from third-party: SuperGrok Lite $10, SuperGrok $30, Heavy $300; Grok Business US$30/user (x.ai page ~288 days old) [SECONDARY]. "Grok Bot" desktop agent (Mac/Win/Linux, cloud computer, v0.70.2 on 11 Oct 2026) requires SuperGrok or Cursor plan: https://docs.x.ai/grok-bot/overview [search snippet]. AUD price and Australian data terms UNCONFIRMED. Relevance to SMBs: low; mention only.
- Meta AI: free in Facebook/Instagram/WhatsApp/Messenger and a standalone app in Australia (2024-25 sources); no 2026 SMB-relevant evidence found. UNCONFIRMED current features.
- Other AU-relevant: Xero JAX (in-product assistant), MYOB AI agents and AI BAS (sole traders first, Mar 2026) [SECONDARY, itbrief/channelnews]; Canva, Microsoft/Google already covered. Not researched further.

## 3. Non-coder power-feature matrix (as supported by sources above)
| Feature | Claude | ChatGPT | Gemini | Copilot | Perplexity |
|---|---|---|---|---|---|
| Projects/workspaces | Projects (Free 5) | Projects, custom GPTs [S] | Notebooks (Gemini Notebook) | Notebooks/agents (UNCONFIRMED) | Spaces (UNCONFIRMED) |
| Connectors Gmail/Drive/Calendar | Yes (Google, M365 write 7 Jul) | Yes [S] | Native Workspace | Native M365 | Via Comet browser |
| Accounting (AU) | Xero [S], MYOB phased | MYOB phased | none found | none found | none found |
| Agent on computer/browser | Cowork + computer use + Chrome | Work, Codex, Windows computer use [S] | Tasks (Pro/Ultra) | Copilot Tasks | Comet, Computer |
| Scheduled tasks | Yes, cloud-run | Yes [S] | Yes, device must be on | Yes | Max background assistants |
| Memory / custom instructions / skills | Memory, Skills | Memory [S] | Customize, Personal Intelligence | UNCONFIRMED | Memory |
| Voice, files, image/video | Yes | Yes [S] | Strong (Overviews, Flow credits) | Yes | Yes |
[S] = secondary only.

## 4. Australian context
### 4.1 Government guidance
- Guidance for AI Adoption (NAIC / DISR, released 21 Oct 2025 per industry.gov.au listing; a law-firm summary says 17 Oct): https://www.industry.gov.au/publications/guidance-ai-adoption [OFFICIAL, via search; page itself timed out]. Six practices: accountability, impact planning, risk management, information sharing, testing and monitoring, human control. Two versions: Foundations (for starters) and Implementation Practices. Replaced the Voluntary AI Safety Standard. Free tools: AI screening tool, policy guide and template, AI register template, glossary [SECONDARY law-firm summary]. Implementation PDF dated 2026-05 on ai.gov.au.
- National AI Plan released 2 Dec 2025: expands NAIC and AI Adopt Program; commentators (COSBOA, SmartCompany) say little new money for SMEs [SECONDARY].
- AI Adopt Centres (business.gov.au/aiadopt) [OFFICIAL]: "now open to eligible SMEs in National Reconstruction Fund priority sectors"; contact 13 28 46; the grant round for the centres is closed. Cleaning/restoration likely does not fall in NRF priority sectors: UNCONFIRMED, check eligibility. No other active federal small-business AI grant found. State programs not searched.
- OAIC: guidance on commercially available AI products (published 21 Oct 2024, updated 17 Jan 2025): https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products [OFFICIAL]. Privacy Act and APPs apply to personal information put into AI and to AI output containing it; do due diligence; update privacy policy; hallucinated personal information counts; OAIC recommends not entering personal information, especially sensitive information, into publicly available gen-AI tools.
- Privacy Act small business exemption (turnover <= A$3m) still applies for general handling: the Sept 2026 Tranche 2 exposure draft does not address removing it [SECONDARY: HSF Kramer 2026-09 summary]. AML/CTF Tranche 2 removes it for AML-related handling from 1 Jul 2026 (not relevant to cleaning). Automated decision-making disclosure applies from 10 Dec 2026 [SECONDARY]. Australian Consumer Law and contract confidentiality still apply regardless. Not legal advice.

### 4.2 Statistics
- NAIC AI Adoption Tracker (Fifth Quadrant, 400 SME surveys/month): 43% of SMEs reported some AI adoption Dec 2025-Feb 2026 (down from 45%), 44% in Feb; broad, embedded use at a 7-month high. https://www.ai.gov.au/news-and-insights/blog/ai-adoption-insights-december-2025-february-2026 (7 May 2026) [search snippet; fetch timed out]. Newer quarter (Mar-May 2026) not found: UNCONFIRMED.
- NAB SME Business Insights (April 2026; ~670 SMEs, surveyed Nov-Dec 2025): 42% using AI, 44% not, 14% plan to. Property services 69%, finance 61-64%. https://news.nab.com.au/content/dam/nab-news/documents/sme-ai-adoption-april-2026.pdf [search snippet].
- Intuit QuickBooks AU: 69% of AU SMBs use AI regularly (Jan 2026), daily use 28% [vendor survey, different definition]. Do not combine with 43%.
- Older NAIC use mix (Q1 2025): data entry/document processing 27%, gen-AI assistants 27%, fraud detection 26%, marketing automation 20%. Dated.
- Talk line: "About four in ten Australian SMEs report using AI, and the depth of use is the gap" (43%, NAIC).

### 4.3 Trades/services use cases (feature mapping; each uses a documented feature, not a vendor case study; outcomes are Phill's to demonstrate)
1. Quotes and scopes of work: upload site notes/photos/price list to a Claude Project or ChatGPT Project; custom instructions fix tone, GST and exclusions; output a draft quote you check. Features: Projects, file analysis, custom instructions.
2. Job reports and photo summaries: drop moisture readings/photos in; get a structured report in your template. Features: file/image analysis, Artifacts or Docs/Word output. (Standards claims must be checked against the source; Phill's own CARSI rule.)
3. Customer email triage and replies: connector to Gmail/Outlook; "draft replies to unread enquiries, never send". Features: Gmail/M365 connectors, drafts with human approval (Gemini Tasks, Cowork and Copilot Tasks all ask before sending).
4. Bookkeeping prep: Xero/MYOB connector, ask "who is overdue and by how much", get a chase list. Features: accounting connectors (MYOB phased rollout; Xero [S]). Read-only first.
5. SOPs and training: turn a voice memo or a recorded toolbox talk into a checklist; NotebookLM/Gemini Notebook builds quiz/audio overview from your own SOPs. Features: Gemini Notebook, Projects. Also marketing: weekly Google Business Profile post drafts via a scheduled task.

### 4.4 MYOB detail
17 Aug 2026 announcement: AU businesses can see customer balances, overdue invoices, P&L inside Claude and ChatGPT; phased rollout via app directories; plans/costs not stated. https://ecommercenews.com.au/story/myob-links-small-business-data-to-claude-chatgpt [OFFICIAL-news fetch].

## 5. Skills ladder (no coding at any level)
Level 0: First conversation. 
- Can do: ask, rewrite, summarise, explain. Unlock: any free tier (Claude, ChatGPT, Gemini, Copilot). 
- 15-min exercise: paste a real customer email; ask for a polite reply in your voice; ask "what did I miss?". 
- Trap: treating answers as facts; pasting customer personal details into a free personal account (OAIC advice). 
- Ready when: you've rewritten 3 real emails and can say what you won't paste.

Level 1: Better prompts and documents. 
- Can do: give role, context, example and format; upload PDFs/photos for analysis; voice input. Unlock: file upload, voice, image analysis (all apps). 
- Exercise: upload last month's price list and a job note; ask for a quote draft in a table, then ask the AI to question your assumptions. 
- Trap: "prompt tourism" (new tricks daily, no repeatable result). 
- Ready when: you reuse the same instruction twice and it saves time.

Level 2: AI that knows your business. 
- Can do: persistent context. Unlock: Projects (Claude/ChatGPT), custom instructions, memory, Gemini Notebook with your SOPs; privacy settings (training off). 
- Exercise: create a Project with services, pricing rules, tone and 3 sample jobs; test with a new enquiry. 
- Trap: stale or contradictory files; leaving training on in a personal account. 
- Ready when: a new staff-style question gets a correct answer from the project without re-explaining.

Level 3: Connected. 
- Can do: AI reads your Gmail/Calendar/Drive/accounts. Unlock: connectors (Google, M365, Xero, MYOB phased), Workspace Gemini, M365 Copilot. 
- Exercise: connect Gmail read-only; ask "list unanswered customer emails older than 2 days, draft replies, don't send". 
- Trap: over-broad permissions; trusting a connector's numbers without checking one against Xero/MYOB. 
- Ready when: you've verified 5 answers against the source and trust the pattern.

Level 4: Delegating tasks (agents). 
- Can do: hand a multi-step job to an agent working on files or browser. Unlock: Claude Cowork (+ computer use), ChatGPT Work, Gemini Tasks (Pro), Copilot Tasks, Comet. 
- Exercise: give Cowork a folder of 10 job notes; ask for a single weekly summary spreadsheet; stay on Manual approval. 
- Trap: Skip/auto-approve modes on money or sending; vague goals; cost in usage limits. 
- Ready when: three tasks done correctly with you only reviewing the result.

Level 5: Does work while you sleep. 
- Can do: recurring tasks and triggers with approval gates. Unlock: Cowork scheduled tasks (cloud-run), ChatGPT Work schedules, Gemini schedules (device-on caveat), Copilot scheduled Tasks. 
- Exercise: schedule a Monday 7am task: summarise last week's enquiries and overdue invoices and draft (not send) chasers. 
- Trap: unattended actions that email customers; no one reviewing outputs; silent failure. 
- Ready when (mastery): a written one-page AI policy (name an owner, what's allowed, human sign-off), mapped to the six NAIC practices, and a monthly review of task outputs.

## 6. Self-assessment quiz (score each: A=0, B=1, C=2, D=3)
1. How do you use AI most weeks? A never / B ask questions in a chat / C upload files, reuse instructions / D it runs tasks without me asking.
2. Have you set up a Project, custom instructions or memory? A no / B tried once / C yes, one in use / D several, kept up to date.
3. Does any AI read your real email, calendar, Drive or accounting data? A no / B pasted bits manually / C connected read-only / D connected, with approvals.
4. Have you given an AI a multi-step job (files, browser) and reviewed only the result? A no / B once / C regularly / D with scheduling.
5. Do you have anything scheduled that runs while you're away? A no / B tested one / C one or two live / D several, reviewed weekly.
6. Do you know whether your chats train the model, on every tool you use? A no idea / B partly / C checked and set / D checked and written down.
7. If an AI error reached a customer, who is accountable and how would you know? A unsure / B me, no process / C me, spot checks / D named owner plus review log.
8. Which app do you pay for and why? A none / B one, by habit / C chosen for a workflow / D chosen per task and costed.
Scoring: 0-3 Level 0; 4-8 Level 1; 9-12 Level 2; 13-16 Level 3; 17-20 Level 4; 21-24 Level 5. Rule for the 12-month crowd: if Q3-Q5 are all A/B, you're at the chatbot stage regardless of total, so start at Level 2 and 3.

## 7. Could not confirm (carry into slides as caveats)
- Claude AUD pricing and GST treatment; Claude Team/Enterprise training terms.
- Official ChatGPT pricing (AUD and tiers), Business seat price, exact ChatGPT Work/agent availability in Australia (OpenAI pages 403).
- Gemini AI Ultra AUD price; Workspace data-use terms; whether Gemini Tasks is explicitly available in Australia.
- Perplexity AUD pricing, Comet launch date, privacy/training settings. Consumer Copilot training opt-out.
- Grok AUD price/AU data terms; Meta AI 2026 features.
- Xero connector architecture (hosted vs self-hosted); MYOB rollout dates/plans.
- Latest NAIC tracker quarter after Feb 2026; any state-level or non-NRF small-business AI grant; Privacy Act small-business exemption timeline.
- Not-checked: Gemini Spark/Computer use safety details, Claude skills page, Copilot Cowork product details.
