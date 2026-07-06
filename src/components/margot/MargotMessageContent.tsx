'use client';

import Link from 'next/link';
import { Fragment } from 'react';

import { ASSISTANT_DISCLAIMER } from '@/lib/assistant-disclaimer';
import { parseMargotMarkdown } from '@/lib/margot/parse-message-markdown';

function splitDisclaimer(text: string): { body: string; disclaimer: string | null } {
  const trimmed = text.trimEnd();
  if (!trimmed.endsWith(ASSISTANT_DISCLAIMER)) {
    return { body: text, disclaimer: null };
  }
  const body = trimmed.slice(0, -ASSISTANT_DISCLAIMER.length).trimEnd();
  return { body, disclaimer: ASSISTANT_DISCLAIMER };
}

function InlineMarkdown({ text }: { text: string }) {
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <strong key={index} className="font-semibold text-white/95">
              {part.slice(2, -2)}
            </strong>
          );
        }

        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          const label = link[1];
          const href = link[2];
          const isInternal = href.startsWith('/');
          const className =
            'font-medium text-[#7ec5ff] underline decoration-[#7ec5ff]/40 underline-offset-2 hover:text-white hover:decoration-white/60';

          if (isInternal) {
            return (
              <Link key={index} href={href} className={className}>
                {label}
              </Link>
            );
          }

          return (
            <a
              key={index}
              href={href}
              className={className}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label}
            </a>
          );
        }

        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}

function MargotTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (headers.length === 0) return null;

  return (
    <div className="my-2 overflow-x-auto rounded-lg border border-white/[0.08] bg-[#0a1020]/80">
      <table className="w-full min-w-[260px] border-collapse text-left text-[11px]">
        <thead>
          <tr className="border-b border-white/[0.08] bg-white/[0.04]">
            {headers.map((header, i) => (
              <th
                key={i}
                className="px-2.5 py-2 font-semibold tracking-wide text-white/55 uppercase"
              >
                <InlineMarkdown text={header} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-white/[0.05] last:border-0 even:bg-white/[0.02]"
            >
              {headers.map((_, colIndex) => (
                <td key={colIndex} className="px-2.5 py-2 align-top text-white/80">
                  <InlineMarkdown text={row[colIndex] ?? ''} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MessageBlocks({ text, emphasizeLead }: { text: string; emphasizeLead?: boolean }) {
  const blocks = parseMargotMarkdown(text);

  if (blocks.length === 0) {
    return (
      <p
        className={`text-[13.5px] leading-[1.65] ${emphasizeLead ? 'text-white/88' : 'text-white/80'}`}
      >
        {text}
      </p>
    );
  }

  let paragraphIndex = 0;

  return (
    <div className="space-y-3 text-[13.5px] leading-[1.65] text-white/80">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Tag = block.level <= 3 ? 'h4' : 'h5';
          return (
            <Tag
              key={index}
              className={
                block.level <= 2
                  ? 'pt-0.5 text-[13px] font-semibold tracking-tight text-white/95'
                  : 'text-[12px] font-semibold text-[#9ed4ff]/95'
              }
            >
              <InlineMarkdown text={block.text.replace(/^\*\*|\*\*$/g, '')} />
            </Tag>
          );
        }

        if (block.type === 'table') {
          return <MargotTable key={index} headers={block.headers} rows={block.rows} />;
        }

        if (block.type === 'list') {
          return (
            <ul key={index} className="ml-0.5 space-y-2">
              {block.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="flex gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2"
                >
                  <span
                    className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7ec5ff]/85"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 text-white/82">
                    <InlineMarkdown text={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        const isLead = emphasizeLead && block.type === 'paragraph' && paragraphIndex === 0;
        paragraphIndex += 1;

        return (
          <p
            key={index}
            className={`whitespace-pre-wrap ${isLead ? 'text-[14px] leading-[1.6] text-white/90' : ''}`}
          >
            <InlineMarkdown text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

export function MargotMessageContent({ text }: { text: string }) {
  const { body, disclaimer } = splitDisclaimer(text);

  return (
    <div className="space-y-3">
      <MessageBlocks text={body} emphasizeLead />
      {disclaimer ? (
        <p className="border-t border-white/[0.06] pt-2.5 text-[10.5px] leading-snug text-white/38 italic">
          {disclaimer}
        </p>
      ) : null}
    </div>
  );
}
