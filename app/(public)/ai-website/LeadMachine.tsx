'use client';

import { useState } from 'react';

type EventRow = { kind: string; channel: string | null; detail: string | null };

const ROLES = [
  'Water damage / restoration technician',
  'Mould remediation technician',
  'Fire & smoke restoration',
  'Carpet & upholstery cleaner',
  'Restoration business owner',
  'New to the industry',
];

const KIND_LABEL: Record<string, string> = {
  lead_captured: 'Lead captured',
  email_verified: 'Email verified',
  welcome_email: 'Welcome email',
  sms_followup: 'SMS follow-up',
  followup_email: 'Second follow-up email',
  callback_booked: 'Callback booked with the team',
};

export default function LeadMachine() {
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lead, setLead] = useState<{ name: string; role: string; email: string; phone: string; events: EventRow[] } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/ai-website/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, email, phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      setLead({ name, role, email, phone: phone || '—', events: data.events || [] });
    } catch {
      setError('Could not reach the server — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="aiw-machine">
      <div className="aiw-form-card">
        <h3>Get your pathway + a callback</h3>
        <p className="aiw-fine">The same form a real visitor uses. It becomes a live contact record beside it.</p>
        <form onSubmit={submit}>
          <div className="aiw-field">
            <label htmlFor="lf-name">Your name</label>
            <input id="lf-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Reeves" />
          </div>
          <div className="aiw-field">
            <label htmlFor="lf-role">Your role</label>
            <select id="lf-role" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="aiw-field">
            <label htmlFor="lf-email">Email</label>
            <input id="lf-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com.au" />
          </div>
          <div className="aiw-field">
            <label htmlFor="lf-phone">Mobile (for the callback)</label>
            <input id="lf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="04__ ___ ___" />
          </div>
          <button type="submit" className="aiw-btn aiw-btn-primary" disabled={busy}>
            {busy ? 'Sending…' : 'Send it into the machine →'}
          </button>
          {error && <div className="aiw-err">{error}</div>}
        </form>
      </div>

      <div className="aiw-crm">
        <div className="aiw-crm-top">
          <span className={`dot${lead ? ' live' : ''}`} />
          {lead ? 'CARSI CRM · admin view · LIVE contact' : 'CARSI CRM · admin view · awaiting lead'}
        </div>
        <div className="aiw-crm-body">
          {!lead ? (
            <div className="aiw-crm-empty">No contact yet.<br />Submit the form and a live record appears here — with the automation flow that fires on it.</div>
          ) : (
            <>
              <div className="aiw-contact">
                <div className="nm">{lead.name}</div>
                <div className="meta">{lead.role}</div>
                <div className="meta">{lead.email} · {lead.phone}</div>
                <span className="tag">Source: AI website form</span>
              </div>
              <div className="aiw-flow-label">Enrolment automation — recorded</div>
              {lead.events.map((ev, i) => (
                <div className="aiw-step" key={i}>
                  <div className="bul">✓</div>
                  <div>
                    <div className="st-title">{KIND_LABEL[ev.kind] ?? ev.kind}</div>
                    <div className="st-when">{ev.detail}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
