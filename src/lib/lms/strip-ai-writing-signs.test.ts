import { describe, expect, it } from 'vitest';

import { stripAiWritingSigns, textHasAiWritingSigns } from './strip-ai-writing-signs';

describe('stripAiWritingSigns', () => {
  it('removes chatbot voice and knowledge-cutoff disclaimers', () => {
    const dirty =
      "As an AI language model I cannot browse the live web. It's important to note that drying starts with extraction. I hope this helps!";
    const clean = stripAiWritingSigns(dirty);
    expect(clean).toBe('drying starts with extraction.');
    expect(clean.toLowerCase()).not.toContain('as an ai');
    expect(clean.toLowerCase()).not.toContain('i hope this helps');
  });

  it('removes vendor citation artefacts from ChatGPT, Gemini, Grok and Perplexity', () => {
    const dirty =
      'Set ambient RH first.contentReference turn0search0 [cite: 1] grok_card attached_file :::writing 【1†source】';
    const clean = stripAiWritingSigns(dirty);
    expect(clean).toBe('Set ambient RH first.');
    expect(clean).not.toMatch(/contentReference|turn0search|cite:|grok_card|attached_file|:::writing|【/);
  });

  it('rewrites canned significance phrasing from the Wikipedia word list', () => {
    const dirty =
      "In today's evolving landscape, this method plays a pivotal role in the rich tapestry of drying. Additionally, we will delve into psychrometry.";
    const clean = stripAiWritingSigns(dirty);
    expect(clean.toLowerCase()).not.toContain('evolving landscape');
    expect(clean.toLowerCase()).not.toContain('pivotal role');
    expect(clean.toLowerCase()).not.toContain('rich tapestry');
    expect(clean.toLowerCase()).not.toContain('delve');
    expect(clean.toLowerCase()).not.toContain('additionally');
  });

  it('rewrites not-only-but-also parallelism', () => {
    expect(stripAiWritingSigns('Wear not only gloves, but also eye protection.')).toBe(
      'Wear gloves and eye protection.'
    );
  });

  it('leaves ordinary restoration copy and module em dashes alone', () => {
    const ok = 'Module 1 — Extract\n\nPull the water with a truckmount at 230 V.';
    expect(stripAiWritingSigns(ok)).toBe(ok);
    expect(textHasAiWritingSigns(ok)).toBe(false);
  });

  it('fails closed: planted AI copy is detected', () => {
    expect(textHasAiWritingSigns('In this article, we will explore mould.')).toBe(true);
  });
});
