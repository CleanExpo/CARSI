'use client';

import { useEffect, useRef, useState } from 'react';

type Rec = { course: string; tier: string };
type Msg = { who: 'bot' | 'user'; text: string; recs?: Rec[] };

const CHIPS = ['I do water damage', 'Mould pathway', 'How do CECs work?', 'What does it cost?', 'I run a restoration business'];

const OPENING: Msg = {
  who: 'bot',
  text: "G'day — I'm the CARSI Course Advisor. Tell me your role or discipline and I'll map your pathway: the exact courses, the CARSI designation they earn, and the price. Try a chip below, or just type.",
};

export default function Advisor() {
  const [msgs, setMsgs] = useState<Msg[]>([OPENING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [msgs, busy]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { who: 'user', text: q }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/ai-website/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { who: 'bot', text: data.text ?? 'Sorry, try again.', recs: data.recommendations }]);
    } catch {
      setMsgs((m) => [...m, { who: 'bot', text: 'Connection hiccup — please try again.' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="aiw-advisor" id="advisor">
      <div className="aiw-advisor-head">
        <span className="aiw-pulse" aria-hidden="true" />
        <div>
          <div className="aiw-who">CARSI Course Advisor</div>
          <div className="aiw-sub">Online · answers 24/7</div>
        </div>
      </div>
      <div className="aiw-stream" ref={streamRef} aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`aiw-msg ${m.who}`}>
            {m.text}
            {m.recs && m.recs.length > 0 && (
              <div className="aiw-rec">
                {m.recs.map((r, j) => (
                  <div key={j} className="aiw-rec-item">
                    <span>{r.course}</span>
                    <span className="tier">{r.tier}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="aiw-msg bot aiw-typing" aria-label="Advisor is typing">
            <span /><span /><span />
          </div>
        )}
      </div>
      <div className="aiw-chips">
        {CHIPS.map((c) => (
          <button key={c} type="button" className="aiw-chip" onClick={() => ask(c)}>{c}</button>
        ))}
      </div>
      <form
        className="aiw-composer"
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        autoComplete="off"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell me your role, e.g. “water damage tech”…"
          aria-label="Ask the course advisor"
        />
        <button type="submit" aria-label="Send">Ask</button>
      </form>
    </div>
  );
}
