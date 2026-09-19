'use client';

import {
  Bold,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

import { sourceToEditorHtml } from '@/lib/lms/visual-course-html';
import { cn } from '@/lib/utils';

function run(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function MarkdownEditor({
  id,
  label,
  value,
  onChange,
  placeholder,
  minRows = 10,
  disabled,
  variant = 'field',
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minRows?: number;
  disabled?: boolean;
  variant?: 'field' | 'article';
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const editorRef = useRef<HTMLDivElement>(null);
  const skipOuter = useRef(false);
  const article = variant === 'article';

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (skipOuter.current) {
      skipOuter.current = false;
      return;
    }
    const html = sourceToEditorHtml(value);
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [value]);

  function emitHtml() {
    const html = editorRef.current?.innerHTML ?? '';
    skipOuter.current = true;
    onChange(html);
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function insertModuleHeading() {
    focusEditor();
    const n = ((editorRef.current?.innerHTML ?? '').match(/<h2\b/gi) ?? []).length + 1;
    run('insertHTML', `<h2>Module ${n} — </h2><p><br></p>`);
    emitHtml();
  }

  const tools = [
    {
      icon: Heading1,
      label: 'Title',
      onClick: () => {
        focusEditor();
        run('formatBlock', 'h1');
        emitHtml();
      },
    },
    { icon: Heading2, label: 'Module heading', onClick: insertModuleHeading },
    {
      icon: Bold,
      label: 'Bold',
      onClick: () => {
        focusEditor();
        run('bold');
        emitHtml();
      },
    },
    {
      icon: Italic,
      label: 'Italic',
      onClick: () => {
        focusEditor();
        run('italic');
        emitHtml();
      },
    },
    {
      icon: Quote,
      label: 'Quote',
      onClick: () => {
        focusEditor();
        run('formatBlock', 'blockquote');
        emitHtml();
      },
    },
    {
      icon: List,
      label: 'Bullet list',
      onClick: () => {
        focusEditor();
        run('insertUnorderedList');
        emitHtml();
      },
    },
    {
      icon: ListOrdered,
      label: 'Numbered list',
      onClick: () => {
        focusEditor();
        run('insertOrderedList');
        emitHtml();
      },
    },
    {
      icon: Link2,
      label: 'Link',
      onClick: () => {
        const href = window.prompt('Link address', 'https://');
        if (!href) return;
        focusEditor();
        run('createLink', href);
        emitHtml();
      },
    },
    {
      icon: ImageIcon,
      label: 'Image',
      onClick: () => {
        const src = window.prompt('Image address', 'https://');
        if (!src) return;
        focusEditor();
        run('insertHTML', `<p><img src="${src.replace(/"/g, '')}" alt=""></p>`);
        emitHtml();
      },
    },
  ];

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-white/12 bg-black/25',
        article && 'border-white/14 bg-[#0c1018]'
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 px-2 py-1.5">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.label}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={t.onClick}
            className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/8 hover:text-white disabled:opacity-30"
          >
            <t.icon className="h-3.5 w-3.5" />
            <span className="sr-only">{t.label}</span>
          </button>
        ))}
      </div>

      <div
        id={fieldId}
        ref={editorRef}
        role="textbox"
        aria-multiline
        aria-label={label ?? 'Course article'}
        aria-disabled={disabled}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder ?? 'Start writing the course…'}
        onInput={emitHtml}
        onPaste={(e) => {
          const html = e.clipboardData.getData('text/html');
          const text = e.clipboardData.getData('text/plain');
          if (!html && !text) return;
          e.preventDefault();
          const insert = html ? sourceToEditorHtml(html) : sourceToEditorHtml(text);
          run('insertHTML', insert || text);
          emitHtml();
        }}
        className={cn(
          'course-article-body course-visual-editor w-full overflow-auto bg-transparent outline-none',
          article
            ? "min-h-[min(72vh,880px)] px-8 py-10 text-left font-['Times_New_Roman',Times,serif] text-[18px] leading-[1.85] sm:px-16"
            : 'min-h-[180px] px-4 py-3 text-[15px] leading-relaxed text-white/90'
        )}
        style={{ minHeight: article ? undefined : `${Math.max(minRows, 8) * 1.6}rem` }}
      />

      <div className="flex items-center justify-between border-t border-white/8 px-3 py-1.5 text-[10px] text-white/30">
        <span>
          {label ? `${label} · ` : ''}
          Select text and use the toolbar — students see this formatting, not tags
        </span>
      </div>
    </div>
  );
}
