'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { authApi } from '@/lib/api/auth';
import { apiClient, ApiClientError } from '@/lib/api/client';
import { buildCourseCheckoutUrls } from '@/lib/checkout-urls';
import { useToast } from '@/hooks/use-toast';

const formSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    iicrcMemberNumber: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof formSchema>;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      iicrcMemberNumber: '',
    },
  });

  async function onSubmit(values: FormData) {
    setIsLoading(true);
    setError(null);

    try {
      // Register via same-origin API route (sets JWT cookies).
      await authApi.register({
        email: values.email,
        password: values.password,
        full_name: values.fullName,
        iicrc_member_number: values.iicrcMemberNumber || undefined,
      });

      const next = searchParams.get('next') ?? searchParams.get('redirect') ?? '/dashboard';
      const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

      // If registration came from a specific course page, immediately start checkout.
      const courseMatch = safePath.match(/^\/courses\/([^/?#]+)/);
      if (courseMatch?.[1]) {
        const slug = decodeURIComponent(courseMatch[1]);
        try {
          const { success_url, cancel_url } = buildCourseCheckoutUrls(window.location.origin, slug);
          const checkout = await apiClient.post<{ enrolled?: boolean; checkout_url?: string }>(
            '/api/lms/checkout',
            { slug, success_url, cancel_url, customer_email: values.email }
          );
          const checkoutUrl = checkout.checkout_url;
          if (checkoutUrl) {
            toast({ title: 'Redirecting to checkout…' });
            window.setTimeout(() => {
              window.location.href = checkoutUrl;
            }, 200);
            return;
          }
          if (checkout.enrolled) {
            toast({ title: 'You’re enrolled — welcome!' });
            window.setTimeout(() => {
              router.push(`/dashboard/student?course=${encodeURIComponent(slug)}`);
            }, 200);
            return;
          }
        } catch (checkoutErr) {
          if (checkoutErr instanceof ApiClientError && checkoutErr.status === 503) {
            setError(
              'Account created, but payments need STRIPE_SECRET_KEY.'
            );
            toast({
              title:
                'Account created, but payments need STRIPE_SECRET_KEY.',
              variant: 'destructive',
            });
          } else if (checkoutErr instanceof ApiClientError && checkoutErr.status === 404) {
            setError('Checkout service is not configured yet. Please contact support.');
            toast({
              title: 'Checkout service is not configured yet. Please contact support.',
              variant: 'destructive',
            });
          } else {
            setError('Account created, but checkout could not start. Please try Enrol again.');
            toast({
              title: 'Account created, but checkout could not start. Please try Enrol again.',
              variant: 'destructive',
            });
          }
          return;
        }
      }

      toast({ title: 'Account created successfully' });
      window.setTimeout(() => {
        router.push(safePath);
      }, 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      toast({
        title: err instanceof Error ? err.message : 'Registration failed',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Smith" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
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
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="iicrcMemberNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IICRC Member Number (optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. IICRC-12345" {...field} />
              </FormControl>
              <FormDescription className="text-xs text-white/30">
                Link your IICRC membership to track CECs and display your credentials.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-sm py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: '#ed9d24' }}
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </Form>
  );
}
