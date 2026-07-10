'use client';

import {
  animate,
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
} from 'framer-motion';
import {
  ChevronDown,
  GripVertical,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { MargotAvatar } from '@/components/margot/MargotAvatar';
import { MargotChatLauncher } from '@/components/margot/MargotChatLauncher';
import { MargotMessageContent } from '@/components/margot/MargotMessageContent';
import {
  playMargotMp3Blob,
  stopMargotAudio,
  unlockMargotAudio,
} from '@/lib/client/margot-audio-player';
import { ASSISTANT_DISCLAIMER } from '@/lib/assistant-disclaimer';
import {
  clampOffsetToViewport,
  clampRectShift,
  MARGOT_POSITION_STORAGE_KEY,
  parseStoredPosition,
  serializePosition,
  type MargotPosition,
} from '@/lib/client/margot-position';
import { deriveChatPageContext } from '@/lib/chat-page-context';
import {
  MARGOT_ACCENT,
  MARGOT_DISPLAY_NAME,
  MARGOT_ROLE_LABEL,
  MARGOT_WELCOME,
} from '@/lib/margot-surface';

const CONVERSATION_STORAGE_KEY = 'carsi-margot-conversation-id';

const ASSISTANT_NAME = MARGOT_DISPLAY_NAME;
const ASSISTANT_TAGLINE = MARGOT_ROLE_LABEL;
const WELCOME_MESSAGE =
  process.env.NEXT_PUBLIC_AI_ASSISTANT_WELCOME?.trim() || MARGOT_WELCOME;

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

/**
 * GP-500: dragging is desktop-only — a precise pointer AND a >=768px viewport.
 * Touch-primary devices keep the fixed corner (dragging a full-width sheet is
 * a footgun).
 */
const DRAG_MEDIA_QUERY = '(pointer: fine) and (min-width: 768px)';

function subscribeCanDrag(onChange: () => void): () => void {
  const mql = window.matchMedia(DRAG_MEDIA_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function useCanDrag(): boolean {
  return useSyncExternalStore(
    subscribeCanDrag,
    () => window.matchMedia(DRAG_MEDIA_QUERY).matches,
    () => false
  );
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageContext = useMemo(
    () => deriveChatPageContext(pathname, searchParams),
    [pathname, searchParams]
  );

  const pagePath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const focusSubtitle = pageContext
    ? pageContext.lesson_id
      ? `Context: lesson in “${pageContext.course_slug}”`
      : `Context: course “${pageContext.course_slug}”`
    : null;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [speechLoadingId, setSpeechLoadingId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // GP-500 — draggable/repositionable widget (desktop only)
  const canDrag = useCanDrag();
  const dragControls = useDragControls();
  const posX = useMotionValue(0);
  const posY = useMotionValue(0);
  const dragAreaRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const wasDraggedRef = useRef(false);

  const persistPosition = useCallback((pos: MargotPosition | null) => {
    try {
      if (pos && (pos.x !== 0 || pos.y !== 0)) {
        localStorage.setItem(MARGOT_POSITION_STORAGE_KEY, serializePosition(pos));
      } else {
        localStorage.removeItem(MARGOT_POSITION_STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable in strict privacy modes
    }
  }, []);

  /** Shift the rendered widget back inside the viewport if it overflows. */
  const clampWidgetToViewport = useCallback(
    (persist: boolean) => {
      const el = widgetRef.current;
      if (!el) return;
      const current = { x: posX.get(), y: posY.get() };
      const next = clampRectShift(
        current,
        el.getBoundingClientRect(),
        window.innerWidth,
        window.innerHeight
      );
      if (next.x !== current.x || next.y !== current.y) {
        posX.set(next.x);
        posY.set(next.y);
        if (persist) persistPosition(next);
      }
    },
    [posX, posY, persistPosition]
  );

  const resetPosition = useCallback(() => {
    void animate(posX, 0, { duration: 0.2, ease: 'easeOut' });
    void animate(posY, 0, { duration: 0.2, ease: 'easeOut' });
    persistPosition(null);
  }, [posX, posY, persistPosition]);

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!canDrag) return;
      dragControls.start(e);
    },
    [canDrag, dragControls]
  );

  // Restore the persisted position on mount / when drag eligibility changes.
  // Motion values (not React state), so no set-state-in-effect concern.
  useEffect(() => {
    if (!canDrag) {
      posX.set(0);
      posY.set(0);
      return;
    }
    let stored: MargotPosition | null = null;
    try {
      stored = parseStoredPosition(localStorage.getItem(MARGOT_POSITION_STORAGE_KEY));
    } catch {
      stored = null;
    }
    if (stored) {
      const next = clampOffsetToViewport(stored, window.innerWidth, window.innerHeight);
      posX.set(next.x);
      posY.set(next.y);
    }
  }, [canDrag, posX, posY]);

  // A stale position must never leave the widget off-screen after a resize.
  useEffect(() => {
    if (!canDrag) return;
    const onResize = () => clampWidgetToViewport(true);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [canDrag, clampWidgetToViewport]);

  // The open chat window is much taller than the launcher: re-clamp once the
  // open animation (220ms) settles so the panel never opens off the top edge.
  useEffect(() => {
    if (!canDrag || !open) return;
    const timer = setTimeout(() => clampWidgetToViewport(true), 260);
    return () => clearTimeout(timer);
  }, [open, canDrag, clampWidgetToViewport]);

  function handleDragStart() {
    wasDraggedRef.current = true;
  }

  function handleDragEnd() {
    const el = widgetRef.current;
    const current = { x: posX.get(), y: posY.get() };
    const next = el
      ? clampRectShift(current, el.getBoundingClientRect(), window.innerWidth, window.innerHeight)
      : current;
    if (next.x !== current.x) posX.set(next.x);
    if (next.y !== current.y) posY.set(next.y);
    persistPosition(next);
  }

  function handleHeaderPointerDown(e: React.PointerEvent) {
    if (!canDrag) return;
    const target = e.target as HTMLElement;
    // Header buttons (reset chat / close) keep their normal behaviour — only
    // the grip handle and the inert header surface start a drag.
    if (target.closest('button') && !target.closest('[data-drag-handle]')) return;
    e.preventDefault();
    startDrag(e);
  }

  function handleGripKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Home') {
      e.preventDefault();
      resetPosition();
      return;
    }
    const step = e.shiftKey ? 32 : 8;
    let dx = 0;
    let dy = 0;
    if (e.key === 'ArrowLeft') dx = -step;
    else if (e.key === 'ArrowRight') dx = step;
    else if (e.key === 'ArrowUp') dy = -step;
    else if (e.key === 'ArrowDown') dy = step;
    else return;
    e.preventDefault();
    const next = clampOffsetToViewport(
      { x: posX.get() + dx, y: posY.get() + dy },
      window.innerWidth,
      window.innerHeight
    );
    posX.set(next.x);
    posY.set(next.y);
    persistPosition(next);
  }

  const stopSpeech = useCallback(() => {
    stopMargotAudio();
    setSpeakingId(null);
    setSpeechLoadingId(null);
  }, []);

  const persistConversationId = useCallback((id: string | null) => {
    setConversationId(id);
    try {
      if (id) {
        localStorage.setItem(CONVERSATION_STORAGE_KEY, id);
      } else {
        localStorage.removeItem(CONVERSATION_STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable in strict privacy modes
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY);
      if (stored?.trim()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing rule promotion; behaviour-preserving suppression, real fix tracked separately
        setConversationId(stored.trim());
      }
    } catch {
      // ignore
    }
    setHistoryLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/margot/chat/speech');
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { available?: boolean };
        if (!cancelled) setVoiceAvailable(Boolean(data.available));
      } catch {
        if (!cancelled) setVoiceAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!historyLoaded || !conversationId) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/margot/chat/history?conversation_id=${encodeURIComponent(conversationId)}`
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          messages?: Array<{ role: string; content: string }>;
        };
        const restored = (data.messages ?? [])
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m, i) => ({
            id: `restored-${i}`,
            role: m.role as 'user' | 'assistant',
            text: m.content,
          }));
        if (cancelled || restored.length === 0) return;
        setMessages(restored);
      } catch {
        // keep welcome message
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, historyLoaded]);

  async function fetchSpeechBlob(text: string, attempt = 1): Promise<Blob> {
    const res = await fetch('/api/margot/chat/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      if ((res.status === 502 || res.status === 503) && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        return fetchSpeechBlob(text, attempt + 1);
      }

      let detail = 'Voice is temporarily unavailable.';
      try {
        const parsed = (await res.json()) as { detail?: string };
        if (typeof parsed.detail === 'string') detail = parsed.detail;
      } catch {
        // ignore
      }
      throw new Error(detail);
    }

    const blob = await res.blob();
    if (blob.size === 0) {
      throw new Error('Voice response was empty. Please try again.');
    }

    return blob;
  }

  async function playMessageAudio(id: string, text: string) {
    if (speakingId === id) {
      stopSpeech();
      return;
    }

    unlockMargotAudio();
    stopSpeech();
    setSpeechLoadingId(id);
    setSpeechError(null);

    try {
      const blob = await fetchSpeechBlob(text);
      setSpeakingId(id);
      await playMargotMp3Blob(blob);
      setSpeakingId(null);
    } catch (error) {
      stopSpeech();
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setSpeechError('Your browser blocked playback. Tap Listen again to allow audio.');
      } else if (error instanceof Error && error.message) {
        setSpeechError(error.message);
      } else {
        setSpeechError('Voice playback failed. Tap Listen again.');
      }
    } finally {
      setSpeechLoadingId(null);
    }
  }

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing rule promotion; behaviour-preserving suppression, real fix tracked separately
    if (!open) stopSpeech();
  }, [open, stopSpeech]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  function resetChat() {
    stopSpeech();
    setMessages([{ id: 'welcome', role: 'assistant', text: WELCOME_MESSAGE }]);
    persistConversationId(null);
    setInput('');
    setSpeechError(null);
  }

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      // eslint-disable-next-line react-hooks/purity -- event handler, not render; pre-existing rule promotion, behaviour-preserving suppression
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    };
    const nextMessages = [...messages.filter((m) => m.id !== 'welcome'), userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    const history = nextMessages.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }));

    try {
      const res = await fetch('/api/margot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          history,
          page_context: pageContext,
          page_path: pagePath,
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

      const contentType = res.headers.get('content-type') ?? '';
      if (res.body && contentType.includes('text/plain')) {
        // AI Front Desk streaming path (MARGOT_STREAMING on): render tokens as
        // they arrive into a single assistant bubble. The one-shot JSON path
        // below stays exactly as-is when the flag is off.
        const streamedConversationId = res.headers.get('X-Conversation-Id');
        if (streamedConversationId) persistConversationId(streamedConversationId);
        const assistantId = `a-${Date.now()}`;
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', text: '' }]);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: acc } : m)));
        }
        if (!acc) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, text: "I'm not sure how to answer that right now. Please try rephrasing your question." }
                : m
            )
          );
        }
      } else {
        const data = (await res.json()) as {
          reply: string;
          conversation_id: string;
        };
        persistConversationId(data.conversation_id);
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', text: data.reply },
        ]);
      }
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

  const showSuggested =
    messages.length <= 1 || (messages.length === 1 && messages[0]?.id === 'welcome');

  return (
    <>
      {/* Full-viewport drag bounds for the widget (GP-500) */}
      <div ref={dragAreaRef} className="pointer-events-none fixed inset-0 z-40" aria-hidden />
      <motion.div
        ref={widgetRef}
        drag={canDrag}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={dragAreaRef}
        dragMomentum={false}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x: posX, y: posY }}
        className="fixed right-3 bottom-3 z-50 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6"
      >
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="flex w-[min(100vw-1.5rem,420px)] flex-col overflow-hidden rounded-2xl border border-white/[0.1] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            style={{ height: 'min(560px, calc(100vh - 5.5rem))', background: '#060a14' }}
          >
            <div
              onPointerDown={handleHeaderPointerDown}
              className={`flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-3.5${
                canDrag ? ' cursor-grab select-none active:cursor-grabbing' : ''
              }`}
              style={{
                background:
                  'linear-gradient(180deg, rgba(36,144,237,0.14) 0%, rgba(6,10,20,0.98) 100%)',
                ...(canDrag ? { touchAction: 'none' } : null),
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <MargotAvatar size={44} showStatus />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold tracking-tight text-white/95">
                      {ASSISTANT_NAME}
                    </span>
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400/90" aria-hidden />
                  </div>
                  <p className="truncate text-[11px] leading-tight text-white/50">
                    {ASSISTANT_TAGLINE}
                  </p>
                  {focusSubtitle ? (
                    <p
                      className="mt-0.5 truncate text-[10px] text-[#7ec5ff]/85"
                      title={focusSubtitle}
                    >
                      {focusSubtitle}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {canDrag ? (
                  <button
                    type="button"
                    data-drag-handle
                    onDoubleClick={resetPosition}
                    onKeyDown={handleGripKeyDown}
                    className="cursor-grab rounded-lg p-2 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/75 active:cursor-grabbing"
                    aria-label="Move chat"
                    title="Drag to move · double-click to reset position (arrow keys nudge, Home resets)"
                  >
                    <GripVertical size={16} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => resetChat()}
                  className="rounded-lg p-2 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/75"
                  aria-label="Reset conversation"
                  title="New chat"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/85"
                  aria-label="Close chat"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {showSuggested && (
              <div className="shrink-0 border-b border-white/[0.06] px-3 py-2">
                <p className="text-[11px] leading-snug text-amber-200/70">{ASSISTANT_DISCLAIMER}</p>
              </div>
            )}

            {showSuggested && (
              <div className="shrink-0 space-y-1.5 border-b border-white/[0.06] px-3 py-2.5">
                <p className="text-[10px] font-medium tracking-wide text-white/35 uppercase">
                  Try asking
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => void sendMessage(p)}
                      disabled={loading}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-left text-[11px] leading-snug text-white/65 transition-colors hover:border-[#2490ed]/40 hover:bg-[#2490ed]/10 hover:text-white/90 disabled:opacity-40"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4">
              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <div key={msg.id} className="flex justify-end">
                    <div
                      className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-md"
                      style={{ background: MARGOT_ACCENT }}
                    >
                      <span className="whitespace-pre-wrap">{msg.text}</span>
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex items-end gap-2">
                    <MargotAvatar size={28} variant="inline" className="mb-5 hidden sm:block" />
                    <div className="min-w-0 max-w-[calc(100%-2rem)] flex-1 rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.045] px-3.5 py-2.5 sm:max-w-[92%]">
                      <MargotMessageContent text={msg.text} />
                      {voiceAvailable ? (
                        <button
                          type="button"
                          onClick={() => {
                          unlockMargotAudio();
                          void playMessageAudio(msg.id, msg.text);
                        }}
                          disabled={Boolean(speechLoadingId) && speechLoadingId !== msg.id}
                          className="mt-2 flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[10px] font-medium tracking-wide text-white/35 uppercase transition-colors hover:bg-white/[0.04] hover:text-[#7ec5ff] disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={
                            speakingId === msg.id
                              ? `Stop ${ASSISTANT_NAME} speaking`
                              : `Hear ${ASSISTANT_NAME} say this`
                          }
                        >
                          {speechLoadingId === msg.id ? (
                            <Loader2 size={11} className="animate-spin" aria-hidden />
                          ) : (
                            <Volume2
                              size={11}
                              aria-hidden
                              className={speakingId === msg.id ? 'text-[#7ec5ff]' : undefined}
                            />
                          )}
                          {speakingId === msg.id ? 'Stop' : 'Listen'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              )}

              {loading && (
                <div className="flex items-end gap-2">
                  <MargotAvatar size={28} variant="inline" className="mb-1 hidden sm:block" />
                  <div className="rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.045]">
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div className="shrink-0 border-t border-white/[0.08] px-3 py-3">
              {speechError ? (
                <p className="mb-2 text-center text-[10px] text-amber-200/80" role="status">
                  {speechError}
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about courses, CECs, or your account…"
                  maxLength={2000}
                  className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.06] px-3.5 py-2.5 text-sm text-white/85 placeholder-white/30 transition-colors outline-none focus:border-[#2490ed]/55"
                  disabled={loading}
                  aria-label="Chat message input"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || loading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: '#0f5fa8' }}
                  aria-label="Send message"
                >
                  <Send size={18} className="text-white" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] leading-snug text-white/30">
                {ASSISTANT_DISCLAIMER}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {open ? (
        <motion.button
          type="button"
          onClick={() => setOpen(false)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-full border border-white/[0.12] bg-[#0a1220]/95 px-4 py-2.5 text-xs font-medium text-white/70 shadow-lg backdrop-blur-md transition-colors hover:border-white/20 hover:text-white/90"
          aria-label="Minimize chat"
        >
          <ChevronDown size={16} className="text-[#7ec5ff]" aria-hidden />
          Hide chat
        </motion.button>
      ) : (
        <MargotChatLauncher
          onClick={() => {
            // A drag gesture must not open the chat (GP-500)
            if (wasDraggedRef.current) {
              wasDraggedRef.current = false;
              return;
            }
            unlockMargotAudio();
            setOpen(true);
          }}
          onDragPointerDown={(e) => {
            wasDraggedRef.current = false;
            startDrag(e);
          }}
          draggable={canDrag}
          assistantName={ASSISTANT_NAME}
        />
      )}
      </motion.div>
    </>
  );
}
