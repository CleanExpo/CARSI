'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageCircle, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const ASSISTANT_NAME =
  process.env.NEXT_PUBLIC_AI_ASSISTANT_NAME?.trim() || 'Claire';
const ASSISTANT_TAGLINE =
  process.env.NEXT_PUBLIC_AI_ASSISTANT_TAGLINE?.trim() ||
  'Your CARSI professional learning guide';

const WELCOME_MESSAGE = `Hi — I'm ${ASSISTANT_NAME}, ${ASSISTANT_TAGLINE}. Ask me about CARSI courses, IICRC disciplines, enrolment, or your dashboard.`;

interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

const SUGGESTED_PROMPTS = [
  'Which water damage courses do you offer?',
  'How do CEC credits work?',
  'How do I find my certificates?',
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-white/40"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

/** Line breaks + simple **bold** segments */
function FormattedAssistantText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="text-white/80">
      {lines.map((line, lineIdx) => {
        const segments = line.split(/(\*\*.+?\*\*)/g);
        return (
          <p key={lineIdx} className="mb-1.5 last:mb-0">
            {segments.map((seg, j) => {
              if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
                return (
                  <strong key={j} className="font-semibold text-white/90">
                    {seg.slice(2, -2)}
                  </strong>
                );
              }
              return <span key={j}>{seg}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  function resetChat() {
    setMessages([{ id: 'welcome', role: 'assistant', text: WELCOME_MESSAGE }]);
    setConversationId(null);
    setInput('');
  }

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    const history = nextMessages
      .filter((m) => m.id !== 'welcome')
      .slice(0, -1)
      .map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

    try {
      const res = await fetch('/api/lms/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          history,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let detail = 'Something went wrong. Please try again.';
        try {
          const parsed = JSON.parse(errText) as { detail?: string };
          if (typeof parsed.detail === 'string') detail = parsed.detail;
        } catch {
          // ignore
        }
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', text: detail },
        ]);
        return;
      }

      const data = (await res.json()) as {
        reply: string;
        conversation_id: string;
      };
      setConversationId(data.conversation_id);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: "I'm having trouble connecting. Please try again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-sm border border-white/[0.08] shadow-2xl"
            style={{ height: 520, background: '#060a14' }}
          >
            {/* Header */}
            <div
              className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-3"
              style={{
                background:
                  'linear-gradient(180deg, rgba(36,144,237,0.12) 0%, rgba(6,10,20,0.98) 100%)',
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm"
                  style={{ background: 'rgba(36,144,237,0.2)', border: '1px solid rgba(36,144,237,0.35)' }}
                  aria-hidden
                >
                  <Bot className="h-5 w-5 text-[#2490ed]" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-white/95">
                      {ASSISTANT_NAME}
                    </span>
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400/90" aria-hidden />
                  </div>
                  <p className="truncate text-[11px] leading-tight text-white/45">
                    {ASSISTANT_TAGLINE}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => resetChat()}
                  className="rounded-sm p-2 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/75"
                  aria-label="Reset conversation"
                  title="New chat"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-sm p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/85"
                  aria-label="Close chat"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Suggested prompts */}
            {messages.length <= 1 && (
              <div className="shrink-0 space-y-1.5 border-b border-white/[0.06] px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/35">
                  Try asking
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => void sendMessage(p)}
                      disabled={loading}
                      className="rounded-sm border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-left text-[11px] leading-snug text-white/65 transition-colors hover:border-[#2490ed]/40 hover:text-white/90 disabled:opacity-40"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'text-white shadow-md'
                        : 'border border-white/[0.06] bg-white/[0.05]'
                    }`}
                    style={msg.role === 'user' ? { background: '#2490ed' } : undefined}
                  >
                    {msg.role === 'assistant' ? (
                      <FormattedAssistantText text={msg.text} />
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.text}</span>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-sm border border-white/[0.06] bg-white/[0.05]">
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-white/[0.08] px-3 py-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about courses, CECs, or your account…"
                  maxLength={2000}
                  className="min-w-0 flex-1 rounded-sm border border-white/[0.08] bg-white/[0.06] px-3 py-2.5 text-sm text-white/85 placeholder-white/30 transition-colors outline-none focus:border-[#2490ed]/55"
                  disabled={loading}
                  aria-label="Chat message input"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || loading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: '#2490ed' }}
                  aria-label="Send message"
                >
                  <Send size={18} className="text-white" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-white/25">
                AI can make mistakes — verify important details on course pages.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-2 rounded-sm px-4 py-3 text-sm font-semibold text-white shadow-lg transition-shadow hover:shadow-xl"
        style={{ background: '#2490ed' }}
        aria-label={open ? 'Close chat' : `Open ${ASSISTANT_NAME}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              <X size={18} />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle size={18} />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && <span>Ask {ASSISTANT_NAME}</span>}
      </motion.button>
    </div>
  );
}
