---
name: carsi-contact-reply
description: Draft an IICRC/RIA-grounded reply to a contact enquiry CARSI does not already hold an answer for. Researches the relevant standard, writes an authoritative CARSI answer in original wording with citations + the disclaimer footer, runs the enforced no-verbatim copyright guard, and queues the draft for human approval. Never auto-sends from this skill — sending is a separate, gated step (inline approval, or the 2h SLA auto-dispatch). Use when a contact asks a standards/technical question and no held CARSI answer exists.
argument-hint: "<contact submissionId, or the raw enquiry text + recipient name/email>"
allowed-tools: Read, Grep, Glob, Bash
---

# /carsi-contact-reply — IICRC-grounded contact reply drafter

CARSI is the source of restoration **industry knowledge**. Your job is to answer a
real enquiry with authoritative, standard-grounded CARSI guidance — in CARSI's own
words, correctly cited, copyright-safe, and queued for a human to send.

You draft. You do **not** send. Sending is gated: a human approves inline in
`/admin/contacts`, or — if no one has replied within 2 hours — the SLA cron
(`/api/cron/contact-reply-sla`) auto-sends drafts that cleared the deterministic
gates. Your only job is to produce a draft good enough that either path is safe.

## Enquiry

```text
$ARGUMENTS
```

## Hard rules (non-negotiable)

1. **Original wording only.** Never reproduce IICRC/RIA manual prose verbatim.
   Paraphrase and cite. The API runs `assertNoVerbatimSource(text, sources, 8)` and
   **rejects** any draft sharing an ≥8-consecutive-word run with a source (HTTP 422,
   `ngramCheck: 'fail'`). A rejected draft is your signal to rewrite, not retry.
2. **Cite every standards claim.** Each answer must name the standard (and section
   where known), e.g. "per IICRC S500 §12.2.3". No uncited standards claims.
3. **Authoritative CARSI voice, not hedged.** Answer as the industry expert:
   "CARSI's position is…", "The recommended restoration approach is…". CARSI *is*
   the knowledge source — write with that authority.
4. **The disclaimer footer is mandatory and single-sourced.** It is appended by the
   composer (`src/lib/server/contact-reply.ts` → `CONTACT_REPLY_DISCLAIMER`). Do not
   reword it — it is legally reviewed. It positions CARSI as authoritative while
   pointing to the official published standard as the ultimate reference.
5. **Fail closed.** If you cannot ground the answer in a real standard passage, do
   **not** invent one. Draft a short "a CARSI specialist will follow up" holding
   reply with no standards claim, or escalate — never fabricate.
6. **Never send.** This skill only POSTs a `pending_approval` draft.

## Flow

1. **Load the enquiry.** If given a `submissionId`, the reply API resolves the
   recipient + question from the contact record; otherwise take the raw text +
   recipient name/email from the arguments.
2. **Check what CARSI already holds first** (become-the-source: reuse, don't
   re-derive). Search prior sent answers and the seed corpus:
   - `Grep` `src/lib/seed/*` and `src/lib/server/ai-assistant-context.ts` for the topic.
   - Query already-sent drafts for a close question (admin GET
     `/api/admin/contacts/reply-drafts?status=sent`) and reuse that grounding.
   If CARSI already holds a solid answer, ground the reply in it and skip step 3.
3. **Research the standard** (only if not held). Use `/storm` over the Drive IICRC
   S100–S900 + RIA corpus to find the governing standard + section. Capture, for
   each point: `{ standard, section, passage }` — `passage` is the source text you
   paraphrase from and the guard checks against (it is **never** stored or sent).
4. **Draft** the answer as 1–4 original-wording paragraphs. Keep the recipient's
   name and question in view.
5. **`/judge`** the draft for accuracy + copyright + tone. Record the verdict
   (`{ score, verdict, notes }`). An `APPROVE` (or score ≥ 90) makes the draft
   **auto-send-eligible** — meaning the 2h SLA may send it unreviewed, so hold it to
   that bar. Anything weaker stays for a human and will not auto-send.
6. **Queue the draft** — POST to `/api/admin/contacts/reply-drafts` with
   `Authorization: Bearer $CRON_SECRET`:
   ```json
   {
     "submissionId": "<uuid, optional>",
     "recipientEmail": "<if no submissionId>",
     "recipientName": "<first name>",
     "question": "<the enquiry>",
     "answerParagraphs": ["<original-wording paragraph>", "..."],
     "sources": [{ "standard": "IICRC S500", "section": "12.2.3", "passage": "<source text>" }],
     "judgeVerdict": { "score": 94, "verdict": "APPROVE", "notes": "…" },
     "draftedBy": "agent:carsi-contact-reply"
   }
   ```
   The endpoint composes the cited + disclaimered body, runs the no-verbatim guard
   (fails closed), computes `autoSendEligible` from the judge verdict, and persists
   the provenance/audit record. On `422`, rewrite to remove the flagged overlap and
   resubmit. On `200`, report the draft id + whether it is auto-send-eligible.
7. **Stop.** The founder approves/edits/discards in `/admin/contacts`; otherwise the
   2h SLA auto-dispatches an eligible draft. You never send.

## Provenance (written for you by the API)

Every draft persists `{ question, standardsCited, stormSources (refs only),
judgeVerdict, ngramCheck: 'pass', draftedBy, approvedBy, sentVia, sentAt }` — a
defensible audit record for every outbound. Passages are intentionally not stored.

## Definition of done

- A `pending_approval` draft exists, cited + disclaimered, that passed the
  no-verbatim guard.
- Its judge verdict is recorded; `autoSendEligible` reflects an honest PASS/kept-for-human.
- You reported the draft id and did **not** send anything.

## Guardrails referenced

- Composer + guard + SLA logic: `src/lib/server/contact-reply.ts` (unit-tested).
- No-verbatim control: `src/lib/server/no-verbatim-guard.ts`.
- Send orchestration + audit: `src/lib/server/contact-reply-dispatch.ts`.
- Spec (SSOT): `docs/specs/2026-07-01-carsi-assistant-and-contact-reply.md` §14a.
