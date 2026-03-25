'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getBackendOrigin } from '@/lib/env/public-url';

const BACKEND_URL = getBackendOrigin();

const WELCOME_MESSAGE =
  "Hi! I'm the CARSI assistant. Ask me about courses, IICRC certifications, or pricing.";

interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

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

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/lms/public/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversation_id: conversationId }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let detail = 'Something went wrong. Please try again.';
        try {
          const parsed = JSON.parse(errText) as { detail?: string };
          if (typeof parsed.detail === 'string') detail = parsed.detail;
        } catch {
          // ignore parse error
        }
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', text: detail },
        ]);
        return;
      }

      const data = (await res.json()) as { reply: string; conversation_id: string };
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
      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex w-[380px] flex-col overflow-hidden rounded-sm border border-white/[0.08] bg-background shadow-2xl"
            style={{ height: 500 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between border-b border-white/[0.08] bg-background px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-primary" aria-hidden />
                <span className="text-sm font-semibold text-white/90">CARSI Assistant</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-sm p-1 text-white/40 transition-colors hover:text-white/80"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>

            {/* Message list */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'user' ? 'text-white' : 'bg-white/[0.06] text-white/70'
                    }`}
                    style={msg.role === 'user' ? { background: 'hsl(var(--primary))' } : undefined}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-sm bg-white/[0.06]">
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="flex items-center gap-2 border-t border-white/[0.08] px-3 py-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about courses or pricing…"
                maxLength={500}
                className="flex-1 rounded-sm border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-white/85 placeholder-white/30 transition-colors outline-none focus:border-[#2490ed]/60"
                disabled={loading}
                aria-label="Chat message input"
              />
              <button
                onClick={() => void sendMessage()}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 rounded-sm bg-primary p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg transition-shadow hover:shadow-xl"
        aria-label={open ? 'Close chat' : 'Open CARSI assistant chat'}
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
        {!open && <span>Ask CARSI</span>}
      </motion.button>
    </div>
  );
}
