# CARSI — SYNTHEX Campaign Context

> Machine-readable context file for SYNTHEX marketing automation.
> Source data: `industry-icp-database.json`

## Quick Reference — Decision Maker Channels

### Where They Hang Out (by Industry)

| Industry                | LinkedIn Groups                     | Associations                      | Key Conferences                    |
| ----------------------- | ----------------------------------- | --------------------------------- | ---------------------------------- |
| **Healthcare**          | Healthcare Facilities Management AU | ACIPC, IHEA, FMA                  | IHEA National, ACIPC International |
| **Hospitality**         | Hotel Managers Australia            | TAA, AHA, Accommodation Australia | NoVacancy Expo, AHA National       |
| **Government**          | Local Government Professionals AU   | LGPro, IPWEA                      | LGPro Congress, IPWEA Conference   |
| **Commercial Cleaning** | ISSA Australia & NZ                 | ISSA, BSCAA                       | ISSA Cleaning & Hygiene Expo       |
| **Insurance**           | Insurance Professionals Australia   | ANZIIF, AICLA, ICA                | ANZIIF Awards, AICLA National      |
| **Aged Care**           | Aged Care Australia                 | ACCPA, LASA                       | LASA Congress, Better Practice     |
| **Education**           | School Business Managers AU         | ASBA, ISA                         | ASBA National, EduTECH             |
| **Strata**              | Strata Community Association        | SCA, ARAMA                        | SCA National Convention            |
| **Mining**              | Mining People International         | MCA, AusIMM                       | AIMEX, Diggers & Dealers           |
| **Retail**              | Shopping Centre Council AU          | SCCA, Property Council            | RECon Asia Pacific                 |

---

## Universal Pain Points (Use in All Campaigns)

### The 4 Universal Pains CARSI Solves

1. **Time Scarcity** — "Can't send staff off-site for training"
   - Solution: 24/7 online, self-paced, 30-minute modules

2. **Compliance Burden** — "Need documented evidence of competency"
   - Solution: IICRC credentials, automatic certificate generation

3. **Contractor Trust** — "How do I know they're qualified?"
   - Solution: Verifiable credentials, industry-standard certifications

4. **Budget Constraints** — "No budget for travel/accommodation"
   - Solution: $20 courses, annual subscription, no travel costs

---

## Campaign Trigger Calendar

| Month          | Trigger           | Industries Affected        | Campaign Focus               |
| -------------- | ----------------- | -------------------------- | ---------------------------- |
| **Jan**        | Pre-Term 1        | Education                  | School maintenance prep      |
| **Feb-Mar**    | Cyclone season    | Mining (WA, QLD, NT)       | Wet season damage response   |
| **May-Jun**    | Flu season starts | Healthcare, Aged Care      | Mould awareness              |
| **Jul**        | New FY budget     | All government, Healthcare | Budget allocation            |
| **Oct-Nov**    | Pre-wet season    | Mining (northern)          | Seasonal prep                |
| **Oct-Dec**    | Strata AGM season | Strata                     | Building manager credentials |
| **Nov-Dec**    | Pre-summer        | Hospitality                | Peak season prep             |
| **Year-round** | Post-flood/storm  | All                        | Emergency response           |

---

## Campaign Message Templates

### Template 1: Pain-Agitation-Solution

```
PAIN: [Insert specific pain point from ICP database]
AGITATE: [Describe consequences — lost revenue, compliance risk, liability]
SOLUTION: CARSI's [specific credential] training
PROOF: [Stat or social proof]
CTA: [Start with free course / Browse courses]
```

### Template 2: Before-After-Bridge

```
BEFORE: [Current state without CARSI]
AFTER: [Desired state with CARSI credentials]
BRIDGE: Get certified online with CARSI — 24/7, self-paced, IICRC-approved
CTA: [Action]
```

### Template 3: Objection Handling

```
"[Common objection from ICP database]"
Actually: [Response from ICP database]
Here's why: [Supporting evidence]
CTA: [Action]
```

---

## SYNTHEX Integration Points

### Data Fields Available for Dynamic Insertion

```json
{
  "industry": "[industry.name]",
  "decision_maker_role": "[decision_makers[0].role]",
  "pain_point_1": "[pain_points[0].pain]",
  "pain_description": "[pain_points[0].description]",
  "value_prop_1": "[value_propositions[0]]",
  "objection": "[objections_and_responses[0].objection]",
  "response": "[objections_and_responses[0].response]",
  "conference": "[channels.conferences[0]]",
  "association": "[channels.industry_associations[0]]",
  "search_term": "[channels.search_behaviour[0]]"
}
```

### Campaign Types to Generate

1. **Google Ads** — Use `search_behaviour` for keyword targeting
2. **LinkedIn Ads** — Use `linkedin_groups` and `decision_makers` for targeting
3. **Content Marketing** — Use `pain_points` for blog topic ideas
4. **Email Sequences** — Use `objections_and_responses` for nurture content
5. **Event Marketing** — Use `conferences` for event sponsorship/attendance
6. **Association Partnerships** — Use `industry_associations` for co-marketing

---

## Key Differentiators (Use in All Copy)

| Differentiator          | Proof Point                                             |
| ----------------------- | ------------------------------------------------------- |
| **24/7 Online**         | "Learn at 2am or 2pm — we never close"                  |
| **IICRC Approved**      | "The global standard recognised by Australian insurers" |
| **Self-Paced**          | "30-minute modules. No travel. No downtime."            |
| **12+ Industries**      | "From hospitals to hotels, we train them all"           |
| **NRPG Partner**        | "One of the 4 core pillars of NRPG onboarding"          |
| **Free Courses**        | "Start with free courses. Premium from $20."            |
| **Instant Credentials** | "Complete a course, get your certificate immediately"   |

---

## Competitor Positioning

| Competitor Type            | CARSI Advantage                                 |
| -------------------------- | ----------------------------------------------- |
| **Traditional RTOs**       | Online vs face-to-face. No travel. No downtime. |
| **US-based IICRC courses** | Australian focus. AUD pricing. Local examples.  |
| **In-house training**      | External verification. Audit-ready credentials. |
| **No training at all**     | WHS due diligence. Insurance requirements.      |

---

_Last updated: 2026-03-05_
_Source: industry-icp-database.json_
