'use client';

import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof formSchema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onChange',
  });

  /**
   * Browsers often autofill email/password without firing React change events, so RHF state
   * can stay empty while the DOM has values. Read from FormData as source of truth on submit.
   */
  function getCredentialsFromForm(values: FormData): { email: string; password: string } {
    const el = formRef.current;
    let email = values.email?.trim() ?? '';
    let password = values.password ?? '';

    if (el) {
      const fd = new FormData(el);
      const domEmail = fd.get('email');
      const domPassword = fd.get('password');
      if (typeof domEmail === 'string' && domEmail.trim()) {
        email = domEmail.trim();
      }
      if (typeof domPassword === 'string' && domPassword.length > 0) {
        password = domPassword;
      }
    }

    return { email, password };
  }

  async function onSubmit(values: FormData) {
    setIsLoading(true);
    setError(null);

    const { email, password } = getCredentialsFromForm(values);

    const parsed = formSchema.safeParse({ email, password });
    if (!parsed.success) {
      setIsLoading(false);
      const first = parsed.error.flatten().fieldErrors;
      const msg =
        first.email?.[0] || first.password?.[0] || 'Please enter a valid email and password.';
      setError(msg);
      toast({ title: msg, variant: 'destructive' });
      return;
    }

    form.setValue('email', parsed.data.email, { shouldDirty: true });
    form.setValue('password', parsed.data.password, { shouldDirty: true });

    try {
      const nextParam =
        searchParams.get('next') ?? searchParams.get('redirect') ?? undefined;

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: parsed.data.email,
          password: parsed.data.password,
          next: nextParam,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        redirect_to?: string;
      };

      if (!response.ok) {
        setError(data.error || 'Login failed');
        toast({ title: data.error || 'Login failed', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const destination =
        typeof data.redirect_to === 'string' && data.redirect_to.startsWith('/')
          ? data.redirect_to
          : '/dashboard/student';

      toast({ title: 'Signed in successfully' });
      window.setTimeout(() => {
        window.location.href = destination;
      }, 250);
    } catch (_err) {
      setError('Failed to connect to server');
      toast({ title: 'Failed to connect to server', variant: 'destructive' });
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form
        ref={formRef}
        id="login-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        autoComplete="on"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  placeholder="name@example.com"
                  autoComplete="username"
                  aria-describedby={error ? 'login-error' : undefined}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="current-password"
                  aria-describedby={error ? 'login-error' : undefined}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && (
          <p
            className="text-destructive text-sm"
            role="alert"
            aria-live="assertive"
            id="login-error"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-sm py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: '#ed9d24' }}
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </Form>
  );
}
