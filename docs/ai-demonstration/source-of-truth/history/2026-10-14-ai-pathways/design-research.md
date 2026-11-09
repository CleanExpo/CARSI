# Design research: AI Pathways for small business keynote (Melbourne, week of 19 Oct 2026)

Compiled 14 Oct 2026. Read-only web research (WebSearch plus WebFetch). Not reachable or not done: YouTube video pages and transcripts, X/Twitter posts, Reddit, Product Hunt threads, Fonts In Use, It's Nice That, Awwwards and Godly (no result pages were fetched). Source type key: OFFICIAL = vendor or event owner; CREATOR = commentary or third party; VENDOR-SELLS = commentary from a firm selling a related fix. Anything not backed by a fetched or searched page is marked UNCONFIRMED.

Evidence caveat: most items are search-result summaries only. Pages I fetched in full are flagged "(fetched)".

---

## 1. Keynote design now (2025-2026)

### What the evidence supports
| Pattern | Evidence | Source type |
|---|---|---|
| Identity built from one visual "material" applied everywhere, with a human, crafted feel despite AI content. Config 2026 used glyphs from sketchy to crisp, prompted textures, dithered speaker headshots, blurred shapes and gritty dots behind the keynote, and looser collage-like motion rather than crisp glyph animation. The opening film had textures stacking, looping and breaking out of their containers. | https://www.figma.com/blog/the-visual-identity-behind-config-2026/ (fetched, published 27 Jul 2026) | OFFICIAL |
| Config 2026 ran 23-25 June 2026 at Moscone Center; Figma Motion (timeline, keyframes, easing, 3D transforms) was a headline announcement. | https://designbuddies.substack.com/p/config-2026 ; https://moscone.com/events/config-2026 | CREATOR / venue |
| Apple-style short-film pacing: a 108-second event recap with no voiceover and no presenter, written up by a creator. | https://contra.com/p/OoccPFZm-i-watched-apples-108-second-event | CREATOR |
| Kinetic type that settles with inertia (physics) rather than CSS easing. | https://www.abduzeedo.com/mat-voyces-think-different-kinetic-typography-mass | CREATOR |
| Vercel Ship stage: an agency worked on projection mapping, stage design and creative direction to support live demos and product reveals (2024 edition, not 2026). Vercel advertises a "presentation designer" role for main-stage keynotes. Vercel Ship SF 2026 is 15 Oct 2026, so no post-event analysis exists yet. | https://basement.studio/showcase/vercel-ship-a-home-for-innovation ; https://gracker.ai/events/vercel-ship-sf-2026/ | CREATOR / listing |
| Apple web design system: SF Pro Display for hero hierarchy, SF Pro Text for metadata. This is the website, not the keynote. | https://open-design.ai/plugins/design-system-apple/ | CREATOR |

### Not found (stated plainly)
I found no 2026 write-ups for Apple, Linear, Stripe Sessions, OpenAI or Anthropic launch-event design, and no TEDx or indie keynote analysis. The following are therefore UNCONFIRMED as "2026 best practice"; they are my inference from the sourced items plus general practice:
- One idea per scene, 1-6 words on screen, speaker carries the nuance. UNCONFIRMED.
- Live demos framed as full-bleed screen capture with a thin frame and a caption naming the claim being shown. UNCONFIRMED.
- Speaker and screen: screen stays dark or quietly textured so the speaker is the focus and the screen is punctuation. UNCONFIRMED.
- Type scale: display 120-220 px on a 1920 stage, body never below 36 px, one number per scene. UNCONFIRMED (my recommendation, no source).

### What reads as "AI slop" in 2026, and why
Cause (consistent across sources): with no constraints a model returns the average of its training data, so every choice is the median choice. The tells are generic, not ugly, and generic is forgettable.
- Purple/indigo-to-blue gradient on white or grey; cyan on dark; glowing box-shadows on dark; gradient text on headings and metrics. Sources: https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website (CREATOR); https://www.925studios.co/blog/ai-slop-design-tells (VENDOR-SELLS, an AI design agency); https://impeccable.style/slop (VENDOR-SELLS).
- Inter / Plus Jakarta Sans / Geist as the only face. Same sources.
- Centred hero plus three rounded cards with small icons; pill badges; emoji as icons; "Acme" and "John Doe" placeholders. Same sources.
- Warm cream/beige ground is now the new default "tasteful" tell. Same sources.
- Unnecessary animation and scroll-jacking flagged on a YC podcast, March 2026: https://stationlm.com/analysis/a7f747d3-9216-4c92-8bf9-aaa3c5c1feae (CREATOR summary).
- Anthropic itself notes that without a design system Claude Design gives "functional but generic" output (secondary report: https://www.datacamp.com/blog/claude-design).

Do / Don't for this talk
- DO use a written brief with tokens, a real photograph or rendered scene per section, solid-colour text and one rarely used accent. DON'T prompt "make a modern keynote deck".
- DO use motion that explains (a number counting up as he says it). DON'T add parallax, floating blobs or looping particles with no meaning.
- DO treat generated images as drafts and edit them (crop, grade, add grain, replace faces and text). DON'T ship raw model output with visible AI text artefacts.
- Sourced anti-slop fix pattern: constraints, a DESIGN.md-style spec, compare several directions before code. https://github.com/Laith0003/ux-skill/wiki/How-to-detect-AI-slop-in-your-design (CREATOR)

---

## 2. How creators combine the tools (Higgsfield, Artlist, Remotion, Claude)

### Higgsfield
- Official pricing page returned only metadata when fetched (JS-rendered): https://higgsfield.ai/pricing. No official price captured.
- Conflicting third-party numbers, all UNCONFIRMED. Higgsfield-hosted page, April 2026: Starter US$15/mo, Plus US$39/mo, Ultra US$99/mo on annual billing, 200 / 1,000 / 3,000 credits, "some models unlimited" (https://geo.higgsfield.ai/higgsfield-ai-pricing-and-plans-2026, OFFICIAL-hosted marketing). Creatify, Sept 2026: Starter about US$19 for 270 credits, Plus US$47 annual / US$59 monthly for 1,200, Ultra US$99 annual / US$129 monthly for 3,000 (https://creatify.ai/blog/higgsfield-pricing-(2026)-plans-and-what-you-ll-actually-pay, CREATOR, a competitor).
- Commercial use appears to vary by plan; Starter and Ultra stated as included, Plus unclear. UNCONFIRMED. Read the in-app terms before commercial use.
- Models and features seen: Soul / Soul 2.0 / Soul Cinema image models; Soul ID (train on 20-80 photos for a consistent face); Popcorn storyboard (about 4 reference images, 4/6/8 frames, about 5 credits per scene, per one review); Speak (talking video; the plan naming in the source is outdated); Cinema Studio with camera body, lens and focal length, reusable across WAN 2.6, Seedance 2.0, Veo 3.1 and Kling 3.0; Higgsfield describes a "4.0 production workspace". Sources: https://higgsfield.ai/academy/how-to-use/turn-your-video-into-cinema-using-wan-camera-control (OFFICIAL, 29 Jun 2026); https://geo.higgsfield.ai/blog/recommended/which-ai-video-tool-gives-real-camera-angle-and-lens-control-78bb84 (OFFICIAL marketing); https://www.seedance.tv/blog/higgsfield-cinema-studio-camera-settings (CREATOR: change one variable at a time; a preset is not the whole shot).
- Creator workflow (summary): script, visual reference, build the camera rig, shoot previews, pick an anchor frame, bridge to video, direct the camera move, generate. Source: https://geo.higgsfield.ai/blog/recommended/which-ai-video-tool-looks-like-it-was-actually-filmed-not-generated-ca1798 (Higgsfield-affiliated).
- Relevance: use stills and short loops for atmosphere. Keep Phill's likeness out unless he chooses to train Soul ID himself.

### Artlist
- Music/SFX: the Artlist licence documents I reached are the Social licence PDFs (2023-2024). They bar using assets "as separate files" or publicly performing them as separate files, bar music-streaming style use, and limit embedding on third-party sites for promotion (https://help-center.artlist.io/media/g2tebxpm/social-license-06242024.pdf, OFFICIAL, 2024). The Pro licence text was not retrieved. No Artlist clause on live events was found. A third-party guide says licensing covers live streams (https://help.uscreen.tv/en/articles/4720731-artlist, CREATOR, not authoritative).
- Practical reading: a talk in a room with music played from a laptop is a public performance. Whether the Artlist licence plus the venue's APRA AMCOS licence covers it is UNCONFIRMED. Action: ask Artlist support in writing and ask the venue. Fallback: no licensed music in the room.
- Artlist AI image/video: outputs covered by the Artlist licence for commercial use; outputs may not be used as AI training data; watermarked trial files are preview only (https://artlist.io/blog/best-ai-video-generator-with-commercial-licensing-in-2026/; the fetch returned 403, so this rests on a search summary; OFFICIAL marketing). Credit costs: UNCONFIRMED.

### Remotion
- Current version: 4.0.535 on npm (fetched registry.npmjs.org/remotion/latest, 14 Oct 2026). OFFICIAL.
- Licence (fetched https://github.com/remotion-dev/remotion/blob/main/LICENSE.md, which remotion.dev/license redirects to): Free for individuals, for-profit organisations with up to 3 employees, non-profits, and evaluators. Others need a Company License (adds prioritised support). Prices are not on the licence page and not on remotion.pro (fetched); the store lists add-ons only (for example Timeline US$300, Editor Starter US$600). Company Licence price: UNCONFIRMED. The page says the licence changes in Remotion 5.0 (no date). Founder action: confirm the headcount of the entity using it; if more than 3, get the price at remotion.pro before use.
- Player: embeds compositions in any React app at runtime; Next.js templates exist (`npx create-video@latest --next`), including one rendering in Vercel Sandbox instead of Lambda (https://remotion.dev/docs/player/, https://remotion.dev/templates/next, OFFICIAL via search). Lambda renders in parallel (AWS cost applies; not needed for an on-site Player).
- Creator workflow: install Remotion agent skills (`npx skills add remotion-dev/skills`), describe the scene to Claude Code, it writes the React composition, preview in Studio, render. Sources: https://zerofuturetech.substack.com/p/generate-videos-with-claude-code (CREATOR); https://videohighlight.com/v/xAUifztpib8 (CREATOR video summary, not watched); https://www.mejba.me/claude-code-remotion-video-creation (CREATOR). Strength: data viz, UI demos, kinetic type. Weakness: reads as animated slides unless art-directed.
- Remotion skills (remotion-direction, remotion-motion-language, remotion-composition-builder, remotion-render-pipeline and others) are listed as installed in this environment. I did not read them.

### Claude Design, skills, artifacts
- Claude Design (Anthropic Labs, research preview, launched 17 Apr 2026): prototypes, decks and one-pagers from chat; reads codebase and design files to build a design system; refine by comments, edits and sliders; exports PDF, PPTX, standalone HTML, Canva, and a handoff bundle to Claude Code; uses subscription limits. https://www.anthropic.com/news/claude-design-anthropic-labs (fetched, OFFICIAL). Press says it is built on Opus 4.7 (not on the fetched page).
- Use here: draft three style directions and a token set, then hand off to Claude Code. Do not treat its deck output as final.

---

## 3. Web presentation frameworks and stage tech

| Tool | Fit for a speaker-synced stage plus teleprompter | Source |
|---|---|---|
| Custom Next.js + framer-motion (current plan) | Best control. We own the scene state machine, so audience screen and teleprompter share one state. Build cost is ours. | n/a |
| reveal.js | Mature. Speaker view opens in a second window with S, shows next slide, timer, pacing (`defaultTiming`, `totalTime`, `data-timing`), notes via `<aside class="notes">`. Needs popups allowed and a local server. Sync mechanism not documented on that page. | https://revealjs.com/speaker-view/ (fetched, OFFICIAL) |
| Slidev | Presenter mode is a route (`/presenter`); audience and presenter windows stay in sync; `--remote` for remote control. The key list (space/arrow, `o` overview, `g` goto) came from a third-party skill page, so verify locally. | https://slidev.antfu.me/guide/presenter-mode (OFFICIAL, via search); https://skills.cat/skills/yoanbernabeu/slidev-skills/slidev-presenter-mode (CREATOR) |
| Remotion Player | Good for one scrubbable, frame-exact scene (data viz, kinetic type) inside the stage. Not a slide engine. Needs the licence check above. | Section 2 |
| GSAP | Free for commercial use, all plugins including SplitText and MorphSVG, `npm install gsap` (GSAP README v3.15.0). I did not confirm the Webflow announcement date. | https://cdn.jsdelivr.net/npm/gsap@3.15.0/README.md (OFFICIAL via search) |
| Motion Canvas, Theatre.js, View Transitions | Not researched in this pass. UNCONFIRMED. Theatre.js suits hand-tuned timelines; View Transitions suits scene-to-scene morphs. Verify before choosing. | none |

Teleprompter and stage patterns (recommendation, UNCONFIRMED as sourced practice):
- One source of truth: a scene index in a small store. The stage window and teleprompter window subscribe via `BroadcastChannel` (same machine). If the teleprompter is a separate device, use a WebSocket.
- Clicker mapping: do not assume. Logitech says Spotlight without Options+ only does Next/Back plus cursor control (https://support.logi.com/hc/en-ca/articles/360023195374); which keys it sends was not found. Test the actual clicker and bind ArrowRight/ArrowLeft and PageDown/PageUp, plus keyboard fallbacks (Space, B to blank, F to freeze).
- Provide a blank key, a freeze key (stops animation if a demo fails), an elapsed/target timer, a next-scene preview and a hard stop at 15:00.

---

## 4. "Durable design agent team"

### What exists
- Claude Code subagents are markdown files with YAML frontmatter in `.claude/agents/`; agent teams are experimental and off by default (needs `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, Claude Code 2.1.32 or later). https://code.claude.com/docs/en/agent-teams (OFFICIAL)
- Playwright ships Claude Code agents: `npx playwright init-agents --loop=claude` creates planner, generator and healer. https://shipyard.build/blog/playwright-agents-claude-code/ (CREATOR)
- Fresh-context critic pattern: a reviewer that did not author the change; failures go back to a fix step, then re-review (https://mer.vin/2026/07/claude-code-9-step-loop-explore-plan-hooks-and-senior-style-review/, CREATOR). One project roster mentions a visual-qa role (single example).
- I found no published art-director plus screenshot-critic recipe. The team below is designed from first principles and is UNCONFIRMED as industry practice.
- What makes such teams good (inference from the slop sources): a written spec with tokens and negative rules, reference boards, several directions compared before code, rendered-output review rather than code review, capped iteration with concrete pass criteria.

### Proposed team for this repo (Claude subagents plus Higgsfield, Artlist, Remotion only)
Each role is a standing agent file with one job, a fixed input and a fixed output file.

| Role | Inputs | Outputs |
|---|---|---|
| Art director | brief, mood board (section 5), talk outline | `design/DESIGN.md` (tokens, type, colour, motion rules, banned list) and a scene-by-scene shot list |
| Copy editor | Phill's script | `design/script.md` with beat timings, at most 6 on-screen words per scene, Australian English, teleprompter text |
| Asset generator | shot list, DESIGN.md | prompts and files in `public/talk/assets/` (Higgsfield stills and loops, Artlist SFX) and a ledger `assets.csv` with source, licence and credits used |
| Motion designer | DESIGN.md, assets | React scenes (framer-motion; Remotion Player only where frame-exactness helps) |
| Stage engineer | scene list | scene state machine, teleprompter view, key bindings, blank/freeze, timer |
| Visual QA critic (fresh context, read-only) | Playwright screenshots, reference board, DESIGN.md | `qa/round-N.md` with scored findings and pass/fail |

### Visual QA loop
1. The builder runs Playwright at 1920x1080 (and 1280x720 as the projector fallback) and screenshots each scene at its settled state plus one mid-transition frame into `qa/shots/round-N/`.
2. Machine checks first (cheap): no console errors, no horizontal overflow, text at least 36 px at 1080p, contrast at least 7:1 for stage text, every banned-list item absent (gradient text, purple/indigo accent, Inter-only, three-card row), every asset present in the ledger.
3. The critic subagent compares each screenshot to the closest reference-board image and scores 5 criteria from 0 to 2: hierarchy, type, colour, composition, and "could a stranger tell this is not a template". It cites screen regions, not adjectives.
4. The art director triages findings; the builder fixes; repeat.

Stop rule: all scenes score at least 8/10 and no machine-check failures; or 4 rounds reached; or the same defect class recurs twice (then stop and ask Phill; do not loop). Final taste sign-off is Phill's, not an agent's.

---

## 5. Recommended stage design direction for this talk

Direction: "Plain-spoken craft". A dark, quiet stage; one real photographic or rendered image per section; huge words; motion that explains.

### Mood / reference board
1. Config 2026 identity (glyphs, dither, collage motion): https://www.figma.com/blog/the-visual-identity-behind-config-2026/ (fetched)
2. Config 2026 recap: https://designbuddies.substack.com/p/config-2026
3. Vercel Ship stage projection and reveals (2024): https://basement.studio/showcase/vercel-ship-a-home-for-innovation
4. Kinetic type with mass (Mat Voyce): https://www.abduzeedo.com/mat-voyces-think-different-kinetic-typography-mass
5. Apple 108-second recap (no presenter, no voiceover): https://contra.com/p/OoccPFZm-i-watched-apples-108-second-event
6. Apple SF Pro hierarchy (web): https://open-design.ai/plugins/design-system-apple/
7. Claude Design launch (its own visual language): https://www.anthropic.com/news/claude-design-anthropic-labs
8. Negative reference, slop tells: https://impeccable.style/slop
9. Negative reference, purple gradient default: https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website
10. Negative reference, fonts and gradients: https://www.925studios.co/blog/ai-slop-design-tells
11. Higgsfield camera control (scene motion language): https://higgsfield.ai/academy/how-to-use/turn-your-video-into-cinema-using-wan-camera-control
12. Remotion Next.js template (Player embed): https://remotion.dev/templates/next
13. Slidev presenter mode (teleprompter pattern): https://slidev.antfu.me/guide/presenter-mode
14-15. Still to collect, not visited: Godly, Awwwards, Fonts In Use and It's Nice That. Assign the art director agent to pull 5 stills from each before design lock. UNCONFIRMED until done.

### Type (recommendation, UNCONFIRMED as sourced practice)
- Display: a characterful face with real weight, not Inter, Geist or Plus Jakarta Sans. Test a high-contrast serif for headlines (editorial, human) paired with a mono for numbers, on a rendered scene. Check font licences (open licences preferred) and self-host.
- Scale on 1920x1080: display 160-220 px, statement 96-120 px, labels 40-48 px minimum. At most 6 words per scene, one number per scene.
- Teleprompter (separate screen): 64-80 px, high contrast, 3 lines visible, current line highlighted, mirror option off by default.

### Colour
- Near-black ground (no blue-purple cast), warm off-white text, one signal accent (a restrained warm tone or the CARSI brand colour; confirm CARSI brand tokens in the repo before locking). The accent is used only for the one number or word that matters per scene.
- Banned: purple/indigo gradients, gradient text, glow shadows, cream/beige grounds, cyan on dark.
- Photos graded to one palette with film grain; faces and text never raw from a model.

### Motion grammar
- Three verbs only: reveal (mask wipe or opacity with an 8-16 px rise), settle (spring with mass, small overshoot), cut (hard cut on the spoken beat). Nothing loops by default.
- Timing: 400-700 ms in, 250 ms out; scene changes on a cut or a 600 ms dissolve. Number counters 1.2-1.8 s.
- Everything is triggered by the clicker; no auto-advance except ambient loops that carry under 10% of the visual weight. Freeze and blank keys always work.
- A reduced-motion fallback exists (also protects against a stalled GPU on a venue machine).

---

## 6. Asset pipeline

| Scene type | Tool | Licence notes | Estimated cost |
|---|---|---|---|
| Opening atmospheric loop, hero stills | Higgsfield (Soul 2.0 stills, Cinema Studio loops) | Commercial rights depend on plan; confirm in-app. No real person's likeness without consent. UNCONFIRMED | Soul 2.0 image about 0.12 credit each per one source; video per-clip cost UNCONFIRMED. Plans US$15-99/mo by conflicting sources; Phill decides spend |
| Storyboard and consistent character frames | Higgsfield Popcorn | As above | About 5 credits per scene per one review. UNCONFIRMED |
| Data and stat scenes, kinetic type, counters | framer-motion in Next.js; Remotion Player only if frame-exact | Remotion is free for an individual or a for-profit with up to 3 employees; otherwise a Company Licence | Free if eligible; Company Licence price UNCONFIRMED |
| Live demo capture | Own screen recording played as video; Remotion for framing if needed | Own content; check any third-party UI shown | Free |
| Music and SFX under scenes | Artlist | Live-event public performance coverage not confirmed; get a written answer from Artlist and ask the venue about APRA AMCOS. Social licence bars use as a separate file. UNCONFIRMED | Subscription price UNCONFIRMED (not retrieved) |
| Artlist AI images and video (alternative to Higgsfield) | Artlist AI generator | Covered by the Artlist licence for commercial use; not usable as AI training data | Credit cost UNCONFIRMED |
| Voice and avatar | None. Phill speaks live. | n/a | n/a |
| Final QA | Playwright plus the critic subagent | n/a | Claude subscription usage only |

Open items for Phill (decisions, not assumptions): Remotion headcount eligibility; whether to spend on Higgsfield and which plan; an Artlist written ruling on live use, or ship without music; font choice sign-off; final visual acceptance.

---

## 7. Platform scan (Exa)

Compiled 14 Oct 2026 with Exa web_search_exa. Read-only, no sign-ups. Most items are **snippet** (search-result text only, page not opened). Items marked **fetched** were read at page level by search. No YouTube transcript, X thread page or Reddit thread page was opened in full in this pass. Vendor and sponsored content is labelled. Reddit results came mostly through a third-party Reddit mirror (reddit.sentinel-team.org), whose TL;DR lines are AI-generated summaries of comments, so they are recorded as such.

### 7.1 Creator workflows (2026): Higgsfield, Remotion, Artlist, Claude

| # | Creator / channel | Date | Source | Workflow (what the source says) | Type |
|---|---|---|---|---|---|
| 1 | GenXis Labs (YouTube) | 2026-04-16 | https://www.youtube.com/watch?v=TryoyPqUkFI | Claude Code drives Higgsfield through Playwright MCP from one idea to images, video and camera motion. Creator says character consistency is still broken and Claude stops for direction. Workflow offered by comment-DM. | snippet |
| 2 | Jonny Burger, Remotion (YouTube) | 2026-01-22 | https://www.youtube.com/watch?v=Xtd4DjU9AU8 | Claude Code plus Remotion Agent Skills builds three videos: a clean screenshot with video still playing, a flat SVG logo turned into a spinning 3D glitch logo, and silence removal with burnt-in captions on raw footage. | snippet |
| 3 | Higgsfield AI, vendor (X thread) | 2026-09-27 | https://www.unrollnow.com/status/2103839805360820589 | Higgsfield MCP with Claude Opus 5.5 generates images, logos and graphics, builds and animates compositions, renders the video, and outputs an editable After Effects project. Vendor marketing. | snippet, VENDOR |
| 4 | Higgsfield AI, vendor (X post, 12-laptop demo) | 2026-09-28 | https://postcutoff.com/v/higgsfield-opus-5-5-12-laptops-launch-video-x/ (summary of the X post) | One prompt turns into a launch video: Computer Use splits work across 12 machines, Higgsfield MCP makes visuals, output is an editable AE project. The summarising site calls it a sponsored demonstration, not an independent test. | snippet, VENDOR |
| 5 | Tao Prompts (YouTube, via summary page) | 2026-09-28 | https://postcutoff.com/v/yt-tao-prompts-level-up-your-ai-videos-with-claude-opus/ | Three-stage pipeline: render a clean AI video plate (GPT Image 2.5, Seedance 2.5 via Artlist MCP in Claude), have Claude Opus 5.5 track elements and render HUD overlays as code, then add synced sound effects. Creator notes tracked overlays can jitter frame to frame. | snippet (summary of video) |
| 6 | Matt WhoisMatt Johnson (YouTube) | date not shown | https://www.youtube.com/watch?v=VrQjrGds1ME | Claude with Artlist MCP writes the prompt and generates five thumbnail concepts with Nano Banana 2 in one chat. Sponsored by Artlist. | snippet, SPONSORED |
| 7 | Gustavo Aguiar, Skala Blog (written version of a tutorial by "Gustavo dev doido") | 2026-10-02 | https://skalablog.com/p/how-to-make-stickman-explainer-videos-with-claude/ | One Claude chat with Artlist MCP: ten topic ideas, script, character sheet, six animated scenes (Cine Dance 2.5), thumbnail, voiceover download link. Final assembly in CapCut. Source says the voiceover link must be saved by hand. Video URL not captured. | snippet |
| 8 | AI Guy (YouTube, Artlist full course) | 2026-06-17 | https://www.youtube.com/watch?v=ZQj_Ax0_tmw | Artlist workspace for start- and end-frame video (Kling 3.0 for transitions). Claude is used only to write the prompt, not via MCP. | snippet |
| 9 | Moe Lueker (YouTube) | 2026-05-21 | https://www.youtube.com/watch?v=cDubbvt2eG4 | Artlist's own AI agent (not Claude) picks the video model, writes the prompt and makes brand ads, UGC and carousels in one chat. Creator says a later video will show Claude Code stitching tools together. Sponsored. | snippet, SPONSORED |
| 10 | Artlist help centre (official) | last updated 2026-08-02 | https://help.artlist.io/hc/en-us/articles/37289313559965-Artlist-MCP-Connect-Claude-to-Artlist | Artlist MCP is in beta and works with Claude only. Supports text, image and video generation, TTS and voice cloning. Music, catalogue search and video-to-video are not in MCP. Credits are charged on request and a generation cannot be cancelled. | snippet, OFFICIAL |
| 11 | AgentSignal, Shogo Mizushima (blog) | 2026-09-26 | https://agent-signal.ai/en/blog/claude-higgsfield-seedance-video and https://agent-signal.ai/en/blog/claude-video-generation-workflows | Seven Claude video setups compared, including Claude Code alone (code-drawn motion graphics), Remotion plus Node audio, and Higgsfield plus Remotion. The author says these are proposed workflows, not tested. Creator example uses Nano Banana Pro, Seedance 2.5, Lyria 3.5 and Remotion. | snippet |
| 12 | Greg Preece (blog) | 2026-08-02 | https://gregpreece.com/articles/higgsfield-mcp-motion-graphics-tutorial | Claude researches a channel's style, drafts a prompt for a fresh chat, and renders through the Higgsfield MCP connector. Article names Claude "Fable 5" as the model it used. | snippet |
| 13 | OSideMedia (GitHub, third-party skill) | updated 2026-09-26 | https://raw.githubusercontent.com/OSideMedia/higgsfield-ai-prompt-skill/HEAD/skills/higgsfield-vibe-motion/SKILL.md | Vibe Motion skill: deterministic motion graphics as Remotion code plus MP4; lists presentation-slide animation as a use. The skill text says Vibe Motion is powered by Claude and Remotion. | snippet |
| 14 | Remotion (official docs) | undated | https://www.remotion.dev/docs/ai/coding-agents | Remotion works with Claude Code, Codex, Kimi Code and OpenCode. Install the Remotion Agent Skills, then prompt a video from the project directory. | snippet, OFFICIAL |

Connector facts seen in the sources (not independently checked): Higgsfield MCP URL `https://mcp.higgsfield.ai/mcp` (AgentSignal, Higgsfield 12-laptop post). Artlist MCP URL `https://mcp.artlist.io/mcp` (Artlist help centre).

### 7.2 Keynote and slide design breakdowns (2025-2026)

| # | Source | Date | URL | Techniques named in the source | Type |
|---|---|---|---|---|---|
| 1 | StrategyU, Paul Millerd: "Analyzing Stripe Sessions 2026 Keynote Communication" | 2026-05-06 | https://strategyu.co/stripe-sessions-2026-keynote-communication/ | Breaks his own "vertical flow" rule on purpose. A slide with no title works because the speaker carries the "so what". Test is the ten-second read. A "New" badge reminds the audience that the items are new. Slides support the speaker rather than carry the message. | snippet, CREATOR |
| 2 | Keynotes (fru.dev) summary of Figma Config 2026 keynote, Dylan Field | 2026-06-24 | https://keynotes.fru.dev/keynotes/figma-config-2026-field | Timestamped chapter map of a 1h 12m keynote: code layers (14:12), Weave tools (22:11), generative plugins (31:24), Figma Motion (48:48), beta credits (1:08:23). Features labelled "Coming" or "Preview" on screen. | snippet, CREATOR |
| 3 | Figma, Config 2026 keynote with Dylan Field (YouTube) | event 2026-06-24; YouTube date 2026-07-14 | https://www.youtube.com/watch?v=2ZCc4k_IV5w | Live prompting of a shader on stage through the Figma agent. Explains shader fill (material) versus shader effect (acts on the layer). Shows an edit loop and on-canvas handles. The speaker says the UI asks questions and teaches shader terms. | snippet, OFFICIAL |
| 4 | Figma, "Figma deep dive: Motion" (Config 2026, YouTube) | event 2026-06 | https://www.youtube.com/watch?v=3evAfmLVZK8 | Timestamped comments tied to the timeline. Auto-key stamps keyframes as you edit. Path trim, arc and point-count animations. Easing and timing as variables with modes (standard, expressive, smooth) so dark and light mode can move differently. Nested components driven by one scale preset. | snippet, OFFICIAL |
| 5 | Figma, Config 2026 closing keynote session page, "The learning curve: turning real-world motion into design" | event 2026-06 | https://config.figma.com/san-francisco/session/e8ea736f-5159-46d9-bed5-49855d992a91/ | Capture-to-curve loop: capture a gesture, curve it, polish, name. Maps a live motion in the room to a UI element on stage. | snippet, OFFICIAL |
| 6 | AM Design, "Figma Config 2026: Covered in 7 minutes" (YouTube) | date not shown | https://www.youtube.com/watch?v=g-nRFUV2tMQ | Recap of Config 2026 features: code layers, Weave, shaders, lens distortion, page curl, Motion with text animation. Creator's view that it reduces After Effects use. | snippet, CREATOR |

Not found in this pass: 2025-2026 breakdowns of Apple, Linear, Vercel Ship, or Stripe keynote design beyond item 1. Vercel Ship SF 2026 is 15 Oct 2026, so no post-event analysis exists yet. Nothing from Figma Config 2026 has been fetched in full.

### 7.3 Showcase examples: Awwwards, Godly and gallery leads (2025-2026)

Godly (godly.website) was not reachable and no Godly site pages were retrieved. Godly appears only in third-party descriptions (framify.design, 2026-03-04; aidesigner.ai, 2026-03-16). Fonts In Use was not reached in this pass.

| # | Site / studio | Award and date (as the source states) | URL | What the source says it shows | Fit for stage | Type |
|---|---|---|---|---|---|---|
| 1 | Santioni Spirits, "Notturno Experience" (Active Theory; sound by plan8) | Awwwards SOTD 5 Oct 2026, score 8.09 | https://dokle.design/awards/santioni-spirits-cocktail-brand-as-comic-book | Scroll-driven comic-book panels; two reds (#592223, #C82924) on black and paper white; one red word per caption box, matched to the red in the picture. Usability scored lowest (7.54). | Good for panel-by-panel reveals; one accent colour. | Dokle review, search text |
| 2 | Milledollars (showreel) | Awwwards SOTD 2 Oct 2026, score 7.23, plus Developer Award | https://dokle.design/awards/milledollars-showreel-split-name-and-captions | Full-screen film; one caption line across the middle of the frame (number and client left, title and year right, centre kept clear); wordmark split into four corners; ABC Diatype with Migra serif for small lines. | Strong: one caption band, film-first. | Dokle review, search text |
| 3 | Maria Vasilyeva (portfolio) | Awwwards SOTD 9 Oct 2026, score 7.28 | https://dokle.design/awards/maria-vasilyeva-portfolio-laid-out-like-a-score | Near-black (#131313) and off-white (#F9F9F9) only; thin rules in sets of five; condensed serif caps for the voice; mono for controls; handwritten annotations. | Type-led, dark, restrained. | Dokle review, search text |
| 4 | Monolith Studio (Le:mma; tattoo studio) | Awwwards SOTD and FWA of the Day (per abduzeedo, 2026-04-20) | https://abduzeedo.com/monolith-studio-tattoo-web-design | Near-black ground; heavy display type at mass weight; Cinema 4D volumetric 3D forms built into the Webflow page; magazine-style vertical scroll. | Dark, type-led, 3D used as the mass. | snippet, CREATOR |
| 5 | Judas (Lisbon agency) | Communication Arts web pick, 2026-02-12 | https://www.commarts.com/webpicks/judas | Dark, editorial "continuous feed" with no traditional menu; Webflow with GSAP and Lenis; motion described as rhythm-driven. Designer's own write-up. | Dark editorial pacing; scroll as narrative. | snippet, OFFICIAL (designer write-up) |
| 6 | Detroit Paris (UI UX Showcase review) | Awwwards SOTD and CSS Design Awards, early 2026 (per the review) | https://uiuxshowcase.com/resources/detroit-paris/ | Pure black with slow-fading white type and sharp dividers; horizontal scroll narrative; one brand colour reserved for CTAs. | Very close to a stage: black field, one accent. | snippet, CREATOR |
| 7 | Tengile MalaMala (DashDigital) | Awwwards SOTD 3 Oct 2026, score 7.22 | https://dokle.design/awards/tengile-malamala-staircase-page-titles | Two-line staircase page titles on every page; film-led home. Cream #FBF8F6 ground, so light rather than dark. | Title system is portable; ground is light. | Dokle review, search text |
| 8 | House of Honey (interiors collective) | Awwwards SOTD and Developer Award, 2026-07-14 | https://dokle.design/awards/house-of-honey-fat-face-serif-pink-script | Fat-face Didone masthead with cursive swash; one hot-pink script device behind every page; blush ground, espresso ink. | Type-led but light ground. | Dokle review, search text |

Other leads, not opened: the Awwwards Sites of the Day list (https://www.awwwards.com/websites/sites_of_the_day/, shows SOTD on 11 Oct 2026 for "BORING" by Nick Ho and 13 Oct 2026 for Neutomni); Websitedesignawards scrollytelling tag (https://websitedesignawards.com/tag/scrollytelling, tags BBC Earth and National Geographic as Editorial, scores 9.2 to 9.4; dates on the page are month and day only); By-Kin, Mat Voyce and Uncommon Studio as named in a juror's blog (https://www.hontran.dev/blog/best-award-winning-websites-2026, 2026-06-27, juror self-described, not an independent award list).

### 7.4 Reddit threads on AI slop tells (2026)

No reddit.com thread page was opened. Items below are reached through the reddit.sentinel-team.org mirror (snippet), or are cited inside other pages (lead only).

| # | Thread / source | Date | URL | Tells or advice named | Type |
|---|---|---|---|---|---|
| 1 | r/ClaudeCode post by the unslop-ui author, "I scanned 3,200,000 posts across 47 AI and SaaS subreddits" (mirror copy) | ~2026-06-20 | https://www.reddit.com/r/ClaudeCode/comments/1u7g0z5/i_scanned_3200000_posts_across_47_ai_and_saas/ (mirror: https://reddit.sentinel-team.org/posts/1u9sgj3/snapshots/2026-06-20T03%3A20%3A10.744219Z) | Ranked tells from the author's data: default shadcn/Tailwind look, purple as primary, purple-to-blue gradients and gradient heading text, unprompted neon glow, emoji as icons, Inter/Geist as the only font, centred hero plus three cards. Comments say the "after" image is still slop. | snippet (mirror) |
| 2 | Mirror thread: "if you used Claude to build your website, which skill helped your site not look like it was AI Generated?" | 2026-06-06 | https://reddit.sentinel-team.org/posts/1txvaef/snapshots/2026-06-06T03%3A50%3A32.981679Z | Mirror TL;DR (AI summary of comments): the main lever is specific reference images, palettes and font pairs, plus a design-system markdown file. Named tools: impeccable.style, Google Stitch, tasteskill.dev, make-interfaces-feel-better, Anthropic's front-end design skill. | snippet (mirror) |
| 3 | Mirror thread: Claude Design output "generic and obviously AI generated" | 2026-08-14 | https://reddit.sentinel-team.org/posts/1vlc65g/snapshots/2026-08-14T16%3A24%3A14.714401Z | Advice in comments: show reference sites, use a stronger model with specific prompts, start a new chat after three or four prompts because quality drifts. | snippet (mirror) |
| 4 | Mirror thread: "How do you avoid the generic AI slop look when shipping frontend with Cursor/Claude Code?" | 2026-04-23 | https://reddit.sentinel-team.org/posts/1ssqj99/snapshots/2026-04-23T04%3A13%3A02.727551Z | Comments: AI has "average taste"; use a design system and references; one commenter keeps a CLAUDE.md with coding and visual standards. | snippet (mirror) |
| 5 | Mirror thread: "All AI websites (and designs) look the same, has anyone managed an anti AI slop design pattern?" | 2026-03-14 | https://reddit.sentinel-team.org/posts/1rr0fb1/snapshots/2026-03-14T00%3A41%3A43.172962Z | Named defaults: a "Revolut banking app" look and a dark retro "neo glow" look. A commenter argues a list of don'ts just creates a new default. | snippet (mirror) |
| 6 | r/UXDesign thread "What are the top AI slop design patterns?" | 2026 (date not given in the citing page) | cited in https://www.linkedin.com/pulse/ai-slop-brand-design-why-every-suddenly-looks-same-2026-yash-kaku-lwwuf (2026-04-30) | Cited only as a live thread. Not opened. | lead only |
| 7 | Reddit threads in r/isitAI, r/isthisAI, r/AIslop, r/DesignAndAI | 2026 | listed in https://venngage.com/blog/ai-slop-in-design/ (2026-08-12) | The Venngage post recommends these as places to check for the same complaints. Not opened. The post also cites a Reddit discussion of an "uncanny valley" effect in AI typography. | lead only |

Non-Reddit context from the same searches (not Reddit): DEV Community, "Is your website AI slop? How to tell, and how to fix it" (https://dev.to/laurilllll/is-your-website-ai-slop-how-to-tell-and-how-to-fix-it-1fn5, 2026-10-13) groups tells into look, copy, claims and unchecked details. It attributes a "distributional convergence" idea to Anthropic; that attribution was not checked. The Tailwind bg-indigo-500 origin story appears in a LinkedIn article (2026-04-30) quoting Adam Wathan's Aug 2025 post; this is second-hand and not checked against X.

### 7.5 Gaps and handling

- YouTube: searched and summarised from search text. No transcripts pulled. Items 4 and 5 in 7.1 are summaries of videos, not the videos.
- X: reached only through unrollnow and postcutoff mirror pages. No X page was loaded directly.
- Reddit: no reddit.com page was opened. The mirror TL;DR lines are AI-generated.
- Awwwards: search text and Dokle review pages only. No Awwwards site was opened or screenshotted.
- Godly and Fonts In Use: not reached.
- Artlist and Higgsfield pricing and licence terms: not re-checked in this pass. Prior section 2 remains the source for those.
