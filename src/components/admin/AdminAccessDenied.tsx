'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LoginResponse = { ok?: boolean; detail?: string };

const DEFAULT_ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim() || 'mmlrana00@gmail.com';

export function AdminAccessDenied() {
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json().catch(() => ({}))) as LoginResponse;
      if (!res.ok) {
        setError(data.detail ?? 'Invalid credentials');
        return;
      }

      // Reload so the server component can render the dashboard.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md border-white/10 bg-white/[0.03]">
        <CardContent className="space-y-5 p-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">Access Denied</h1>
            <p className="text-sm text-white/60">
              If you already signed in at the main login with an admin-capable account, try opening
              /admin again. Otherwise enter the dedicated admin email and password below.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            <Button type="submit" disabled={loading} className="w-full rounded-sm bg-[#2490ed]">
              {loading ? 'Checking…' : 'Enter Admin Dashboard'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
