'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildCourseCheckoutUrls } from '@/lib/checkout-urls';

type Props = {
  slug: string;
  priceAud: number;
  isFree: boolean;
};

export function GuestEnrolForm({ slug, priceAud, isFree }: Props) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isFree || priceAud <= 0) {
        const res = await fetch('/api/lms/enrollments/guest-free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, email, password, full_name: fullName }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          learn_url?: string;
          detail?: string;
        };
        if (!res.ok) {
          setError(data.detail ?? 'Could not complete enrolment');
          return;
        }
        window.location.href = data.learn_url ?? '/dashboard/student';
        return;
      }

      const { success_url, cancel_url } = buildCourseCheckoutUrls(window.location.origin, slug);
      const res = await fetch('/api/lms/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          success_url,
          cancel_url,
          customer_email: email,
          guest_checkout: true,
          full_name: fullName,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        checkout_url?: string;
        detail?: string;
      };
      if (!res.ok) {
        setError(data.detail ?? 'Checkout could not start');
        return;
      }
      if (data.checkout_url) {
        sessionStorage.setItem(
          'carsi_guest_checkout',
          JSON.stringify({ email, fullName, slug }),
        );
        window.location.href = data.checkout_url;
        return;
      }
      setError('Unexpected checkout response');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-white/55">
        Quick enrol — create your account and {isFree ? 'start learning' : 'pay securely'} in one step.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="guest-full-name" className="text-white/70">
          Full name
        </Label>
        <Input
          id="guest-full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="border-white/15 bg-white/5 text-white"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="guest-email" className="text-white/70">
          Email
        </Label>
        <Input
          id="guest-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border-white/15 bg-white/5 text-white"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="guest-password" className="text-white/70">
          Password (min 8 characters)
        </Label>
        <Input
          id="guest-password"
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border-white/15 bg-white/5 text-white"
        />
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-sm border border-[#ed9d24]/70 bg-[#ed9d24] font-semibold text-[#111111]"
        size="lg"
      >
        {loading ? 'Processing…' : isFree ? 'Enrol free & start' : `Continue to pay — $${priceAud.toFixed(0)} AUD`}
      </Button>
      <p className="text-center text-xs text-white/40">
        Already have an account?{' '}
        <a href={`/login?next=${encodeURIComponent(`/courses/${slug}`)}`} className="text-[#2490ed] hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}
