"""
Create pending CARSI tasks in Linear (G-Pilot team).
Run: python scripts/linear-create-issues.py
"""

import os
import ssl
import json
import urllib.request

API_KEY = os.environ["LINEAR_API_KEY"]
TEAM_ID = "91b3cd04-86eb-422d-81e2-9aa37db2f2f5"
API_URL = "https://api.linear.app/graphql"

# State IDs
TODO = "b7ba26fa-c315-4b44-ad63-016fd2645044"
BACKLOG = "fd635199-7bd7-442a-9df0-8c9afda1d646"

# Label IDs
LBL_FRONTEND = "353912b3-abaa-40b6-baea-3e83f741cd31"
LBL_BACKEND = "9b06a4bf-1748-4874-963d-3bd99d4f16da"
LBL_CONTENT = "e3a8a752-475b-45e4-a9f5-f8d4fac393d9"
LBL_INFRA = "2995337e-72fb-4e46-b367-1d9c43bbc2a0"
LBL_UX = "3353652c-845a-4343-8f94-96e6c8fe46cf"
LBL_FEATURE = "ef4038bd-da33-4d61-8d85-a772ef78dc1d"
LBL_CLEANUP = "61e0efe6-b00d-4fbc-92c1-d324408ef5bb"
LBL_PERFORMANCE = "e2f3f491-6095-4a8c-a786-db5104218361"

# Priority: 1=Urgent, 2=High, 3=Normal, 4=Low

ISSUES = [
    # ── UI / Dashboard Sprint ────────────────────────────────────────────────
    {
        "title": "LMS Dashboard — two-panel sidebar (LMSIconRail + LMSContextPanel)",
        "description": """## Goal
Replace current sidebar+header with a Fikri Studio-style two-panel layout.

## Files
- **CREATE** `apps/web/components/layout/LMSIconRail.tsx` — 48px icon rail, role-conditional icons (LayoutDashboard, Search, BookOpen, Award, GraduationCap, Shield, Settings), active blue indicator, avatar circle at bottom
- **CREATE** `apps/web/components/layout/LMSContextPanel.tsx` — 220px context panel with IICRC discipline nav, collapsible My Progress section
- **MODIFY** `apps/web/app/(dashboard)/layout.tsx` — replace `<Sidebar/><Header/>` with `<LMSIconRail/><LMSContextPanel/>`
- **DELETE** `apps/web/components/layout/sidebar.tsx`, `header.tsx`

## Layout
```
┌──────┬──────────────┬──────────────────────┐
│ 48px │    220px     │      flex-1          │
│ rail │ context panel│   main content       │
└──────┴──────────────┴──────────────────────┘
```

## CSS Palette
- Icon rail bg: `#F9FAFB` | Context bg: `#FFFFFF` | Main bg: `#F3F4F6`
- Accent: `#2490ed` | Active bg: `#EFF6FF` | Border: `#E5E7EB`
- Mobile: sidebar collapses, hamburger menu

## Acceptance Criteria
- [ ] Icon rail visible on /student, /dashboard, /admin, /instructor
- [ ] Discipline links filter /courses?discipline=WRT etc
- [ ] User avatar shows initials, links to profile
- [ ] Mobile responsive — rail collapses on breakpoint
- [ ] No TypeScript errors""",
        "priority": 2,
        "stateId": TODO,
        "labelIds": [LBL_FRONTEND, LBL_UX],
    },
    {
        "title": "CourseCard — Fikri Studio flat card redesign",
        "description": """## Goal
Redesign `apps/web/components/lms/CourseCard.tsx` — clean text-only card (no hero image at top).

## New Card Structure
```
┌─────────────────────────────────┐
│ [Discipline badge] [Price badge] │
│                                  │
│  Water Damage Restoration        │
│  Technician Course               │
│                                  │
│  📁 8 Lessons                    │
│                                  │
│  Updated 2 days ago      [•••]   │
└─────────────────────────────────┘
```

## Specs
- White bg, `rounded-sm`, `border border-[#E5E7EB]`
- Hover: `shadow-md` 200ms ease-out transition
- Discipline badge: `bg-[#EFF6FF] text-[#2490ed]` pill
- Price badge: `bg-[#FFF7ED] text-[#ed9d24]` or green "Free"
- Title: `text-sm font-semibold text-[#111827]` 2-line clamp
- `...` overflow menu: Enrol / View / Share
- No image at top

## Acceptance Criteria
- [ ] Discipline badge shows correct colour per IICRC discipline
- [ ] Free courses show green badge
- [ ] Hover shadow transition is smooth
- [ ] Overflow menu functional""",
        "priority": 2,
        "stateId": TODO,
        "labelIds": [LBL_FRONTEND, LBL_UX],
    },
    {
        "title": "CourseGrid — tab bar discipline filter + search + sort",
        "description": """## Goal
Upgrade `apps/web/components/lms/CourseGrid.tsx` with tab bar, search, and sort controls.

## UI to Add
```tsx
// Tab bar — discipline filter
["All", "WRT", "CRT", "ASD", "OCT", "CCT", "FSRT", "AMRT", "Free"]

// Filter + search row
<button>⊞ Add Filter</button>  <span>{n} courses</span>
<input placeholder="Search..." />
<select>Date Created / Price / Title</select>

// Grid: 4-col desktop, 2 tablet, 1 mobile
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
```

## State
- `activeTab` — discipline filter
- `searchQuery` — narrows by title
- `sortBy` — date | price | title

## File: `apps/web/app/(public)/courses/page.tsx`
- Read `?discipline=WRT` from searchParams → pass as active tab
- Keep server-side fetch (revalidate: 60)

## Acceptance Criteria
- [ ] Tab click filters grid to discipline
- [ ] Search narrows results in real-time
- [ ] Sort select reorders cards
- [ ] URL param ?discipline=X pre-selects correct tab
- [ ] Count label reflects filtered count""",
        "priority": 2,
        "stateId": TODO,
        "labelIds": [LBL_FRONTEND, LBL_UX],
    },
    {
        "title": "Landing page rebuild — Australia's Leading Restoration Training Platform",
        "description": """## Goal
Replace current AI Agent Orchestration placeholder at `/` with a full CARSI landing page.

## File: `apps/web/app/page.tsx`

## Sections
1. **NavBar** — Logo | Courses | Pathways | Pricing | About | Sign In | "Enrol Now" (orange CTA)
2. **Hero** — H1: "Australia's Leading Restoration Training *Platform*" (italic+blue), subtext, [Browse Courses →] (orange), [View Pathways] (outline)
3. **Bento Stats Block** — 261+ Professionals | center training image | 91 Courses | CEC Approved badge card
4. **Why CARSI** — 3 cards: IICRC Aligned | CEC Tracking | Industry Recognised
5. **Featured Courses** — server-fetch 3 newest from `/api/lms/courses?limit=3`, render CourseCards
6. **IICRC Disciplines** — pill row: WRT | CRT | ASD | OCT | CCT | FSRT | AMRT
7. **Footer** — Logo | Quick links | Contact | © 2026 CARSI Pty Ltd

## Key Details
- Use `bg-gradient-to-br from-blue-600 to-blue-800` as placeholder for hero image until real assets ready
- "Platform" in `<em>` styled italic + `#2490ed`
- All stat cards: dark bg #111827, white text
- Light theme throughout: bg-white / bg-gray-50

## Acceptance Criteria
- [ ] Hero renders correctly at /, mobile + desktop
- [ ] Browse Courses → navigates to /courses
- [ ] Featured Courses loads from API (server component)
- [ ] IICRC discipline pills link to /courses?discipline=X
- [ ] No TypeScript errors
- [ ] Lighthouse performance > 85""",
        "priority": 2,
        "stateId": TODO,
        "labelIds": [LBL_FRONTEND, LBL_UX, LBL_FEATURE],
    },
    {
        "title": "Theme conversion — migrate dashboard from dark (OLED) to light theme",
        "description": """## Goal
Convert the LMS dashboard UI from dark (OLED Black #050505) to a light professional theme.
This is required before the sidebar/card redesign tasks can be verified visually.

## Scope
- `apps/web/app/globals.css` — update CSS variables for light mode
- `apps/web/lib/design-tokens.ts` — update token values
- Dashboard components: /student, /dashboard, /admin, /instructor pages + their components

## Light Theme Tokens
| Variable | Value |
|---|---|
| --bg-primary | #F3F4F6 |
| --bg-card | #FFFFFF |
| --bg-sidebar | #F9FAFB |
| --border | #E5E7EB |
| --text-primary | #111827 |
| --text-muted | #6B7280 |
| --accent | #2490ed |

## Note
OLED Black + Scientific Luxury design remains for the **public marketing site** (landing, courses catalog, pathways). Only the authenticated dashboard routes convert to light.

## Acceptance Criteria
- [ ] Dashboard routes use light bg, no dark backgrounds visible
- [ ] Public routes unchanged (OLED Black maintained)
- [ ] No contrast accessibility failures (WCAG AA)
- [ ] Framer Motion animations retained""",
        "priority": 2,
        "stateId": TODO,
        "labelIds": [LBL_FRONTEND, LBL_CLEANUP],
    },

    # ── Visual Assets Sprint ─────────────────────────────────────────────────
    {
        "title": "Visual assets — audit existing 71 images for style consistency",
        "description": """## Goal
Before generating new images, document the established visual style from the 71 existing images.

## Files to Read
- `apps/web/public/images/manifest.json`
- Sample images from each category (courses, heroes, history, logos, badges)

## Output Document: `docs/visual-style-guide.md`
- Colour palette beyond brand colours
- Typography style (if text in images)
- Composition patterns (layout, spacing, subject matter)
- Aspect ratios used per category
- Quality and format notes

## Acceptance Criteria
- [ ] Style guide doc created at `docs/visual-style-guide.md`
- [ ] All 71 images reviewed and categorised
- [ ] Prompt templates drafted for each image category""",
        "priority": 3,
        "stateId": TODO,
        "labelIds": [LBL_CONTENT, LBL_UX],
    },
    {
        "title": "Visual assets — generate course cover images for 76 missing courses",
        "description": """## Goal
74 courses currently have covers from the import. Generate covers for the remaining ~17 missing courses.

## Check First
Compare course list from `GET /api/lms/courses` against `apps/web/public/images/courses/` directory.
Identify exactly which courses are missing covers.

## Generation Prompt Template
```
Professional course cover image for CARSI restoration training.
Topic: [COURSE_TITLE]
Discipline: [WRT/CRT/ASD/OCT/CCT/FSRT/AMRT]
Style: Clean, modern, professional. Industry imagery showing restoration work.
Colours: Blue #2490ed accent, professional neutral tones.
Dimensions: 1200x675 (16:9 ratio)
No text overlays. High quality, photorealistic.
```

## Models
- Prompt engineering: Gemini 2.5 Pro
- Image generation: Nano Banana Pro (gemini-2.5-flash-image)

## Post-Generation
- Compress to WebP < 100KB
- Add to `apps/web/public/images/courses/`
- Update `apps/web/public/images/manifest.json`

## Acceptance Criteria
- [ ] All courses have a cover image
- [ ] Images are WebP < 100KB each
- [ ] Manifest.json updated with new entries
- [ ] Consistent visual style with existing 74 covers""",
        "priority": 2,
        "stateId": TODO,
        "labelIds": [LBL_CONTENT, LBL_FEATURE],
    },
    {
        "title": "Visual assets — generate IICRC discipline pathway diagrams (7 disciplines)",
        "description": """## Goal
Create visual learning pathway diagrams for all 7 IICRC disciplines.

## Disciplines
WRT, CRT, ASD, OCT, CCT, FSRT, AMRT

## Each Diagram Should Show
- Entry-level → Advanced → Certification flow
- CEC requirements at each stage
- Estimated completion time per step

## Format
- SVG or high-res PNG
- Dark text on light background
- CARSI blue (#2490ed) for accent lines
- Dimensions: 1200x800

## Output
- `apps/web/public/images/pathways/pathway-wrt.png` (x7)
- Update manifest.json with pathway image entries
- Add to pathway pages at `/pathways/[discipline]`

## Acceptance Criteria
- [ ] 7 pathway diagrams created
- [ ] Each shows entry → advanced → certification flow
- [ ] CEC counts shown at each stage
- [ ] Images < 200KB each
- [ ] Added to relevant pathway pages""",
        "priority": 3,
        "stateId": TODO,
        "labelIds": [LBL_CONTENT, LBL_FEATURE],
    },
    {
        "title": "Visual assets — generate achievement badge set",
        "description": """## Goal
Generate all badge assets for the gamification system (streaks, discipline mastery, CEC milestones).

## Badge Categories
- **Discipline Mastery** (7): One per IICRC discipline — WRT, CRT, ASD, OCT, CCT, FSRT, AMRT
- **Progress Badges** (4): 25%, 50%, 75%, 100% course completion
- **Streak Badges** (3): 7-day, 30-day, 90-day (7-day already exists at `streak-7day.webp`)
- **CEC Milestones** (4): 10, 25, 50, 100 CECs earned

## Style
- Modern flat design, CARSI colours (#2490ed, #ed9d24)
- Consistent border radius, 256×256px
- WebP format < 20KB each

## Output
`apps/web/public/images/badges/`

Current state:
- `streak-7day.webp` ✅
- All others missing ❌

## Acceptance Criteria
- [ ] 18 badge images created (7 discipline + 4 progress + 2 new streak + 4 CEC + 1 existing)
- [ ] Consistent visual style across all badges
- [ ] Each < 20KB
- [ ] Manifest.json updated
- [ ] Visual audit script passes""",
        "priority": 2,
        "stateId": TODO,
        "labelIds": [LBL_CONTENT, LBL_FEATURE],
    },
    {
        "title": "Visual assets — generate OG/social share images",
        "description": """## Goal
Create Open Graph images (1200×630) for course, credential, and pathway pages.

## Templates Needed
1. **Course OG** — discipline badge + course title + CARSI branding
2. **Credential OG** — certificate preview + "IICRC CEC Approved" + CARSI logo
3. **Pathway OG** — discipline icon + pathway name + CEC requirement

## Format
- WebP 1200×630, < 150KB
- CARSI blue (#2490ed) primary, orange (#ed9d24) accent

## Integration
- Add og:image meta tags to course, credential, pathway pages
- Update sitemap with image entries
- Test with og:image validators

## Files
- `apps/web/public/images/og/course-[discipline].webp` (7 variants)
- `apps/web/public/images/og/credential.webp`
- `apps/web/public/images/og/pathway-[discipline].webp` (7 variants)

## Acceptance Criteria
- [ ] 15 OG images created
- [ ] og:image meta tags added to page layouts
- [ ] Passes opengraph.xyz validation
- [ ] All < 150KB""",
        "priority": 3,
        "stateId": TODO,
        "labelIds": [LBL_CONTENT, LBL_FEATURE],
    },
    {
        "title": "Image optimisation pipeline — WebP conversion, srcset, compression",
        "description": """## Goal
Process all public images through an optimisation pipeline to hit mobile-first performance targets.

## Target Sizes
- Course covers: < 100KB (WebP)
- Badges: < 20KB (WebP/PNG)
- Icons: < 5KB (SVG preferred)
- OG images: < 150KB (WebP)
- Hero images: < 200KB (WebP)

## Pipeline Steps
1. Convert any remaining JPG/PNG to WebP (use `sharp`)
2. Generate srcset variants: 640w, 1024w, 1920w for large images
3. Lossless compression pass
4. Verify all images have correct dimensions

## Script: `scripts/optimise-images.sh` or `scripts/optimise-images.ts`

## Acceptance Criteria
- [ ] All images meet target sizes
- [ ] Responsive srcset variants exist for course covers and heroes
- [ ] `pnpm ai:visual:audit` passes (all critical assets present)
- [ ] Lighthouse images score > 90""",
        "priority": 3,
        "stateId": TODO,
        "labelIds": [LBL_FRONTEND, LBL_PERFORMANCE],
    },
    {
        "title": "SEO — image schema, alt text, and sitemap for all generated assets",
        "description": """## Goal
Integrate all generated images into the SEO infrastructure.

## Per Image
1. Add entry to `apps/web/public/images/manifest.json` with full metadata
2. Generate `ImageObject` JSON-LD schema
3. Write descriptive alt text: `"CARSI [Category]: [Description]"`
4. Add to sitemap via `apps/web/app/sitemap.ts`

## Validation
```bash
# Check manifest count
cat apps/web/public/images/manifest.json | python -m json.tool | grep '"url"' | wc -l

# Check sitemap includes images
curl http://localhost:3009/sitemap.xml | grep "image:loc"
```

## Acceptance Criteria
- [ ] All images in manifest.json with title, alt, category, dimensions
- [ ] ImageObject schema present on all image-bearing pages
- [ ] Sitemap includes image:loc entries
- [ ] Google Rich Results Test passes for course pages
- [ ] Alt text follows CARSI naming convention""",
        "priority": 3,
        "stateId": TODO,
        "labelIds": [LBL_FRONTEND, LBL_FEATURE],
    },

    # ── Infrastructure / Production ──────────────────────────────────────────
    {
        "title": "Database — run alembic upgrade head + seed 5 IICRC pathways",
        "description": """## Goal
Apply pending database migrations and seed the 5 core IICRC learning pathways.

## Commands
```bash
cd apps/backend
uv run alembic upgrade head
uv run python scripts/seed_pathways.py
```

## Verify
```bash
uv run python -c "from src.config.database import engine; print('DB OK')"
curl http://localhost:8000/api/lms/pathways | python -m json.tool
```

## Expected
- Alembic at head (migration 006_add_lms_bundles)
- 5 pathways seeded: WRT, CRT, ASD, FSRT, AMRT
- `/api/lms/pathways` returns 5 entries

## Acceptance Criteria
- [ ] `alembic current` shows head
- [ ] 5 pathways in database
- [ ] Pathway pages at /pathways render data
- [ ] No migration errors""",
        "priority": 2,
        "stateId": TODO,
        "labelIds": [LBL_BACKEND],
    },
    {
        "title": "Production — swap Stripe TEST keys to LIVE keys",
        "description": """## Goal
Before launch, replace all Stripe test keys with live production keys.

## Locations to Update
- Vercel env vars (carsi-web project):
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- Fly.io secrets (carsi-backend):
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_YEARLY_PRICE_ID`

## Stripe Live Setup Required
1. Activate Stripe live mode on acct_1T74VNDOMULuvIJb
2. Create live product matching test product (CARSI Pro Annual, $795 AUD/year)
3. Create live webhook endpoint pointing to production backend
4. Update all env vars

## Warning
Do NOT deploy with test keys. Live keys must be set before going live.

## Acceptance Criteria
- [ ] Live Stripe keys in all production environments
- [ ] Live webhook endpoint configured
- [ ] Test purchase completes in live mode
- [ ] Subscription lifecycle events fire correctly""",
        "priority": 1,
        "stateId": BACKLOG,
        "labelIds": [LBL_INFRA, LBL_BACKEND],
    },
    {
        "title": "Production — deploy backend to Fly.io",
        "description": """## Goal
Deploy the FastAPI backend to Fly.io (fly.toml already configured at `apps/backend/fly.toml`).

## Prerequisites
- [ ] Stripe LIVE keys set (see GP-XXX)
- [ ] `alembic upgrade head` run on production DB
- [ ] All Fly.io secrets confirmed set (STRIPE_*, ANTHROPIC_API_KEY, JWT_SECRET_KEY, DATABASE_URL)

## Deploy Command
```bash
cd apps/backend
fly deploy
```

## Post-Deploy
```bash
fly status
curl https://carsi-backend.fly.dev/api/health
```

## Acceptance Criteria
- [ ] `https://carsi-backend.fly.dev/api/health` returns 200
- [ ] Auth endpoints functional
- [ ] LMS API routes return data
- [ ] Stripe webhooks firing to live endpoint""",
        "priority": 1,
        "stateId": BACKLOG,
        "labelIds": [LBL_INFRA],
    },

    # ── Content ──────────────────────────────────────────────────────────────
    {
        "title": "Content — add partner logos (CCW, CCA Vic, Restoration Advisers, Aeroair)",
        "description": """## Goal
Add partner/accreditation logos to the landing page (P1 content gap from audit).

## Logos Needed
1. CCW (Carpet Cleaners Worldwide or similar)
2. CCA Vic (Carpet Cleaners Association Victoria)
3. Restoration Advisers
4. Aeroair

## Implementation
- Add logos to `apps/web/public/images/partners/`
- Create a partners strip section on landing page (between Why CARSI and Featured Courses)
- Use grayscale logos with hover colour effect

## Acceptance Criteria
- [ ] 4 partner logos in public/images/partners/
- [ ] Partners section visible on landing page
- [ ] Alt text set correctly
- [ ] Manifest.json updated""",
        "priority": 3,
        "stateId": BACKLOG,
        "labelIds": [LBL_CONTENT, LBL_FRONTEND],
    },
    {
        "title": "Content — /podcast page (The Science of Property Restoration)",
        "description": """## Goal
Create the podcast landing page at `/podcast` (missing from WordPress parity audit — P2).

## File: `apps/web/app/(public)/podcast/page.tsx`

## Page Sections
- Hero: "The Science of Property Restoration" podcast name + CARSI branding
- Latest episodes list (static initially, can be dynamic later)
- Subscribe links: Spotify, Apple Podcasts, Google Podcasts
- Host bio section

## Notes
- Confirm podcast name and episode list with Phil before building
- Static content initially — no RSS integration needed for P2

## Acceptance Criteria
- [ ] /podcast page renders correctly
- [ ] Subscribe links functional (even if placeholders)
- [ ] SEO meta title/description set
- [ ] Added to nav under Resources""",
        "priority": 4,
        "stateId": BACKLOG,
        "labelIds": [LBL_CONTENT, LBL_FRONTEND],
    },
    # ── Governance / Starter ─────────────────────────────────────────────────
    {
        "title": "Governance — starter:audit 28-check self-audit + starter:adopt one-line framework adoption",
        "description": """## Status: DONE ✅

Committed at `1464ea8` on main branch.

## What Was Built
- `scripts/starter-audit.sh` — 28-check self-audit across 5 sections:
  1. Governance files (memory.md, CLAUDE.md, agent hierarchy docs)
  2. 8 custom governance skills
  3. TypeScript AI module (5 files in src/ai/)
  4. Package scripts (6 scripts)
  5. CLAUDE.md governance directive
- `scripts/starter-adopt.sh` — copies governance framework to any target project
  - Copies memory.md template, 8 skills, agent hierarchy docs, AI module
  - Patches CLAUDE.md with governance directive
  - `--full-audit` flag runs audit on target after copying
- Added `starter:audit` and `starter:adopt` to package.json

## Usage
```bash
pnpm starter:audit                              # self-audit (28 checks, 28/28 PASS)
pnpm starter:adopt "../other-project" --full-audit
```""",
        "priority": 3,
        "stateId": "5b7ee027-d815-4af9-8e2a-eb12e2399e77",  # Done
        "labelIds": [LBL_FEATURE],
    },
]

def graphql(query, variables=None):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={
            "Authorization": API_KEY,
            "Content-Type": "application/json",
        }
    )
    with urllib.request.urlopen(req, context=ctx) as resp:
        return json.loads(resp.read())

CREATE_MUTATION = """
mutation CreateIssue($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    issue {
      identifier
      title
      url
    }
  }
}
"""

def main():
    print(f"\nCreating {len(ISSUES)} Linear issues in G-Pilot team...\n")
    created = []
    for issue in ISSUES:
        inp = {
            "teamId": TEAM_ID,
            "title": issue["title"],
            "description": issue["description"],
            "priority": issue["priority"],
            "stateId": issue["stateId"],
            "labelIds": issue["labelIds"],
        }
        result = graphql(CREATE_MUTATION, {"input": inp})
        if "errors" in result:
            print(f"  FAILED: {issue['title'][:60]}")
            print(f"     {result['errors']}")
        else:
            i = result["data"]["issueCreate"]["issue"]
            print(f"  OK {i['identifier']}  {i['title'][:70]}")
            created.append(i)

    print(f"\n── Summary ──────────────────────────────────────")
    print(f"  Created: {len(created)} issues")
    print(f"  Failed:  {len(ISSUES) - len(created)}")
    print()
    for i in created:
        print(f"  {i['identifier']}  {i['url']}")
    print()

if __name__ == "__main__":
    main()
