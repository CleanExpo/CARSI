'use client';

import { Bold, Italic, Link2, List, ListOrdered, RemoveFormatting, Underline } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import {
  marketingComposeHtmlToPlainText,
  prepareMarketingPasteHtml,
  sanitizeMarketingComposeHtml,
} from '@/lib/admin/marketing-compose-html';
import { cn } from '@/lib/utils';

function run(command: string, value?: string) {
  document.execCommand('styleWithCSS', false, 'false');
  document.execCommand(command, false, value);
}

export type MarketingComposeValue = { html: string; text: string };

export function MarketingComposeEditor({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: MarketingComposeValue;
  onChange: (next: MarketingComposeValue) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const fieldId = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const skipOuter = useRef(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (skipOuter.current) {
      skipOuter.current = false;
      return;
    }
    const html = value.html || '';
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [value.html]);

  function emit() {
    const raw = editorRef.current?.innerHTML ?? '';
    const html = sanitizeMarketingComposeHtml(raw);
    skipOuter.current = true;
    onChange({ html, text: marketingComposeHtmlToPlainText(html) });
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function openLinkDialog() {
    const sel = window.getSelection();
    const selectedText = sel?.toString().trim() ?? '';
    setLinkText(selectedText);
    setLinkUrl('https://');
    setLinkOpen(true);
  }

  function applyLink() {
    const href = linkUrl.trim();
    if (!href) return;
    focusEditor();
    const label = linkText.trim();
    if (label) {
      const safeHref = href.replace(/"/g, '&quot;').replace(/</g, '');
      const safeLabel = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      run(
        'insertHTML',
        `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`
      );
    } else {
      run('createLink', href);
    }
    setLinkOpen(false);
    emit();
  }

  const tools = [
    {
      icon: Bold,
      label: 'Bold',
      onClick: () => {
        focusEditor();
        run('bold');
        emit();
      },
    },
    {
      icon: Italic,
      label: 'Italic',
      onClick: () => {
        focusEditor();
        run('italic');
        emit();
      },
    },
    {
      icon: Underline,
      label: 'Underline',
      onClick: () => {
        focusEditor();
        run('underline');
        emit();
      },
    },
    {
      icon: Link2,
      label: 'Insert link',
      onClick: openLinkDialog,
    },
    {
      icon: List,
      label: 'Bullet list',
      onClick: () => {
        focusEditor();
        run('insertUnorderedList');
        emit();
      },
    },
    {
      icon: ListOrdered,
      label: 'Numbered list',
      onClick: () => {
        focusEditor();
        run('insertOrderedList');
        emit();
      },
    },
    {
      icon: RemoveFormatting,
      label: 'Remove formatting',
      onClick: () => {
        focusEditor();
        run('removeFormat');
        emit();
      },
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-white/15 bg-white shadow-lg">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.label}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={t.onClick}
            className="rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-200/80 hover:text-slate-900 disabled:opacity-30"
          >
            <t.icon className="h-4 w-4" />
            <span className="sr-only">{t.label}</span>
          </button>
        ))}
      </div>

      <div
        id={fieldId}
        ref={editorRef}
        role="textbox"
        aria-multiline
        aria-label="Email body"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder ?? 'Write your message…'}
        onInput={emit}
        onPaste={(e) => {
          const html = e.clipboardData.getData('text/html');
          const text = e.clipboardData.getData('text/plain');
          if (!html && !text) return;
          e.preventDefault();
          const insert = html
            ? prepareMarketingPasteHtml(html, text)
            : prepareMarketingPasteHtml('', text);
          run('insertHTML', insert || text);
          emit();
        }}
        className={cn(
          'marketing-compose-editor min-h-[280px] w-full overflow-auto px-4 py-3 text-[15px] leading-relaxed text-slate-900 outline-none',
          'empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]'
        )}
      />

      {linkOpen ? (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Insert link
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Text to display"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={applyLink}
              className="rounded-lg bg-[#2490ed] px-3 py-1.5 text-sm font-semibold text-white"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setLinkOpen(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-500">
        Paste from ChatGPT or Word — formatting is kept. Highlight text and use the link button like
        Gmail.
      </div>
    </div>
  );
}
