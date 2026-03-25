'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { authApi } from '@/lib/api/auth';

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
      // Register the account
      await authApi.register({
        email: values.email,
        password: values.password,
        full_name: values.fullName,
        iicrc_member_number: values.iicrcMemberNumber || undefined,
      });

      // Auto-login after registration
      await authApi.login({ email: values.email, password: values.password });
      router.push('/student');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
                <Input type="password" {...field} />
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
                <Input type="password" {...field} />
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
              <FormDescription className="text-xs text-muted-foreground/60">
                Link your IICRC membership to track CECs and display your credentials.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">
              {error.includes('timed out') || error.toLowerCase().includes('network')
                ? 'Our servers are temporarily unavailable.'
                : error}
            </p>
            {(error.includes('timed out') || error.toLowerCase().includes('network')) && (
              <p className="mt-1 text-xs text-muted-foreground">
                Please try again in a moment or email{' '}
                <a
                  href="mailto:support@carsi.com.au"
                  className="underline hover:text-foreground"
                >
                  support@carsi.com.au
                </a>
              </p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-carsi-orange py-3 text-sm font-semibold text-white transition-colors hover:bg-carsi-orange/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </Form>
  );
}
