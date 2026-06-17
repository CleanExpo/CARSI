# CARSI Video Assistant Production Pack

Updated: 18/06/2026

## Objective

Create a dedicated CARSI brand assistant video layer for:

- CARSI public onboarding.
- RestoreAssist introduction.
- Disaster Recovery and NRPG readiness.
- Learner retention nudges.
- Team-owner progress nudges.

This should strengthen the customer journey loop without adding generic video clutter.

## Assistant Identity

Working name: Claire.

Role:

- CARSI learning guide.
- RestoreAssist field-support explainer.
- NRPG/disaster recovery readiness narrator.

Tone:

- Calm.
- Practical.
- Australian.
- Evidence-led.
- Warm but not theatrical.

Guardrails:

- Do not overclaim IICRC, NRPG, insurer, compliance, or disaster recovery authority.
- Explain that AI and RestoreAssist support judgement; they do not replace standards, qualified professionals, or site-specific compliance obligations.
- Every video ends with one clear next action.
- Captions and transcript required.

## Tool Roles

### HeyGen

Use for:

- Avatar presenter videos.
- Image-to-video assistant clips.
- Lip-sync.
- Captioned MP4 outputs.
- Partner introduction videos.

Required before generation:

- Approved avatar image, prompt avatar, or digital twin.
- Voice ID or audio URL.
- Consent for any real-person digital twin.
- Final script approval.

### ElevenLabs

Use for:

- Brand voice production.
- More natural audio narration.
- Audio-only snippets for dashboard/email previews.
- Alternate short-form takes.

Voice guidance:

- Australian English or neutral professional English.
- Medium stability.
- Low-to-medium expressiveness.
- Avoid sales-announcer tone.

### Remotion

Use for:

- Branded motion graphics.
- Course-card overlays.
- Certificate/progress animations.
- Social variants.
- Reusable templates where the avatar is not needed.

Repo note:

- Remotion is not currently installed in this CARSI repo.
- Add it only after deciding whether video rendering belongs in this app, a separate media repo, or CI.

## First Five Videos

Scripts live in `src/lib/brand-video-assistant.ts`.

1. `carsi-public-introduction`
   - Placement: homepage hero/trust section.
   - CTA: `/pathways`.
   - Format: 16:9 and 9:16.

2. `restoreassist-introduction`
   - Placement: RestoreAssist/research/field-support surfaces.
   - CTA: `/research` until a dedicated RestoreAssist page exists.
   - Format: 16:9 and square.

3. `disaster-recovery-nrpg-introduction`
   - Placement: NRPG/disaster recovery education surfaces and professional directory.
   - CTA: `/pathways`.
   - Format: 16:9 and 9:16.

4. `learner-day-three-nudge`
   - Placement: lifecycle email and dashboard.
   - CTA: `/dashboard/student`.
   - Format: 9:16 and square.

5. `team-owner-progress-nudge`
   - Placement: team dashboard and weekly owner email.
   - CTA: `/dashboard/team`.
   - Format: 16:9 and square.

## Production Workflow

The default workflow is no-HITL and uses the synthetic Video Agent path.

1. Script data is maintained in `src/lib/brand-video-assistant.ts`.
2. `npm run video:brand:plan` writes transcripts, SRT captions and job manifests.
3. `npm run video:brand:generate` submits jobs to HeyGen, polls completion and downloads videos.
4. `.github/workflows/brand-video-automation.yml` runs the same pipeline on schedule or dispatch.
5. Store final assets:
   - `public/marketing/video/`
   - transcript `.md`
   - caption `.srt`
   - source script ID.

Optional deterministic avatar workflow:

1. Set `BRAND_VIDEO_MODE=avatar`.
2. Set `HEYGEN_AVATAR_ID`.
3. Optionally set `HEYGEN_VOICE_ID`.
4. Run `npm run video:brand:generate`.

Required boundary:

- Digital twins and cloned voices still require legitimate consent. The automation removes routine approvals, not consent requirements.

## Suggested Avatar Prompt

Professional Australian training guide for restoration and cleaning education, mid-30s to mid-40s, approachable and calm, neat smart-casual dark navy jacket, clean studio lighting, subtle CARSI brand palette, trustworthy learning-platform presenter, no exaggerated smile, no hard sales energy.

## Suggested Voice Direction

Warm professional Australian English. Speak at a steady educational pace. Emphasise clarity, confidence, and practical outcomes. Avoid a commercial announcer tone.

## Website Placements

Homepage:

- Short introduction near first trust section, not as a heavy autoplay hero.

Pathways:

- "Claire explains how to choose your path" near advisor.

Courses:

- Optional short "not sure where to start?" video beside guided pathway prompt.

RestoreAssist:

- Dedicated introduction once the page exists.

Professional Directory / NRPG:

- Disaster recovery readiness introduction.

Dashboard:

- Small, optional video cards for resume nudges and team progress. Do not autoplay.

## Acceptance Criteria

- Every video has a clear audience and CTA.
- Every video has captions and transcript.
- No video makes unsupported compliance or accreditation claims.
- The assistant reinforces the CARSI journey loop.
- Videos are optional enhancements, never blocking navigation or enrolment.

## Automation Commands

Plan only:

```bash
npm run video:brand:plan
```

Generate all videos with HeyGen Video Agent:

```bash
HEYGEN_API_KEY=... npm run video:brand:generate
```

Generate with a fixed avatar:

```bash
HEYGEN_API_KEY=... \
HEYGEN_AVATAR_ID=... \
HEYGEN_VOICE_ID=... \
BRAND_VIDEO_MODE=avatar \
npm run video:brand:generate
```

Generate only selected scripts:

```bash
BRAND_VIDEO_IDS=carsi-public-introduction,restoreassist-introduction \
HEYGEN_API_KEY=... \
npm run video:brand:generate
```

Outputs:

- `output/brand-video/brand-video-plan.json`
- `output/brand-video/jobs/*.json`
- `output/brand-video/transcripts/*.md`
- `output/brand-video/captions/*.srt`
- `output/brand-video/heygen-status.json`
- `output/brand-video/videos/*.mp4`

## Source Notes

- HeyGen API uses `https://api.heygen.com` and `X-Api-Key` authentication.
- HeyGen Video Agent can create a video from a prompt and then be polled for `video_id`.
- HeyGen Avatar Video supports `POST /v3/videos` with `avatar_id`, script, captions, output format and voice settings.
- Remotion can be added later for code-driven motion graphics using its CLI or renderer APIs.
