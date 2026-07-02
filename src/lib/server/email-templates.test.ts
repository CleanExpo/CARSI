import { describe, expect, it } from 'vitest';

import { renderToolboxTalkEmail } from './email-templates';

const base = {
  appOrigin: 'https://carsi.com.au',
  name: 'Sam',
  talkTitle: 'Working at Heights',
  monthLabel: 'March',
  courseUrl: 'https://carsi.com.au/courses/toolbox-talks',
};

describe('renderToolboxTalkEmail', () => {
  it('embeds the one-click unsubscribe link in both html and text when provided', () => {
    const url = 'https://carsi.com.au/unsubscribe?token=abc.def';
    const { html, text } = renderToolboxTalkEmail({ ...base, unsubscribeUrl: url });
    expect(html).toContain(url);
    expect(html).toContain('Unsubscribe');
    expect(text).toContain(url);
  });

  it('omits the unsubscribe line when no url is supplied', () => {
    const { html, text } = renderToolboxTalkEmail(base);
    expect(html).not.toContain('/unsubscribe?token=');
    expect(text).not.toContain('/unsubscribe?token=');
  });
});
