import { renderNotePreview, applyNoteFormatting } from './note-formatting';

describe('renderNotePreview', () => {
  it('returns empty string for empty input', () => {
    expect(renderNotePreview('')).toBe('');
    expect(renderNotePreview('   ')).toBe('');
  });

  it('strips markdown formatting and returns plain text', () => {
    expect(renderNotePreview('**bold** and *italic*')).toBe('bold and italic');
    expect(renderNotePreview('[link](https://example.com)')).toBe('link');
    expect(renderNotePreview('`code`')).toBe('code');
    expect(renderNotePreview('~~strikethrough~~')).toBe('strikethrough');
    expect(renderNotePreview('> blockquote')).toBe('blockquote');
    expect(renderNotePreview('## heading')).toBe('heading');
    expect(renderNotePreview('- item')).toBe('item');
  });

  it('truncates to ~120 characters with ellipsis', () => {
    const longText = 'a'.repeat(150);
    const preview = renderNotePreview(longText);
    expect(preview).toHaveLength(121); // 120 + '…'
    expect(preview).toMatch(/…$/);
  });

  it('truncates at word boundary when possible', () => {
    const text = 'This is a long text with many words that should be truncated at a space';
    const preview = renderNotePreview(text);
    expect(preview).toBe('This is a long text with many words that should be truncated at a…');
    // Assert it doesn't cut mid-word if space available before limit
    expect(preview).not.toContain(' truncated');
  });

  it('preserves line breaks and normalizes spacing', () => {
    const text = 'Line 1\n\nLine 2';
    expect(renderNotePreview(text)).toBe('Line 1 Line 2');
  });
});

describe('applyNoteFormatting', () => {
  it('applies bold formatting correctly', () => {
    const result = applyNoteFormatting('hello world', 0, 5, 'bold');
    expect(result.value).toBe('**hello** world');
    expect(result.selectionStart).toBe(2);
    expect(result.selectionEnd).toBe(7);
  });

  it('applies italic formatting correctly', () => {
    const result = applyNoteFormatting('hello world', 6, 11, 'italic');
    expect(result.value).toBe('hello *world*');
    expect(result.selectionStart).toBe(6);
    expect(result.selectionEnd).toBe(12);
  });

  it('applies link formatting correctly', () => {
    const result = applyNoteFormatting('select this', 0, 10, 'link');
    expect(result.value).toBe('[select this](http://)');
    expect(result.selectionStart).toBe(12);
    expect(result.selectionEnd).toBe(13);
  });

  it('applies code formatting correctly', () => {
    const result = applyNoteFormatting('use this', 0, 8, 'code');
    expect(result.value).toBe('`use this`');
    expect(result.selectionStart).toBe(1);
    expect(result.selectionEnd).toBe(9);
  });

  it('applies strikethrough formatting correctly', () => {
    const result = applyNoteFormatting('cross this out', 5, 9, 'strikethrough');
    expect(result.value).toBe('cross ~~this~~ out');
    expect(result.selectionStart).toBe(6);
    expect(result.selectionEnd).toBe(10);
  });

  it('preserves cursor position for heading/quote/bullet', () => {
    const result = applyNoteFormatting('line one\nline two', 0, 8, 'heading');
    expect(result.value).toBe('## line one\nline two');
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe(10);
  });
});