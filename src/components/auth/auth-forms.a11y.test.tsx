// @vitest-environment jsdom
/**
 * Accessibility of the sign-in and sign-up forms, checked through roles and accessible names
 * the way a screen-reader or keyboard user meets them.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  params: new URLSearchParams(),
  toast: vi.fn(),
  register: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => mocks.params }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/api/auth', () => ({ authApi: { register: mocks.register } }));

import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function submit(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button);
  });
}

beforeEach(() => {
  mocks.params = new URLSearchParams();
  mocks.toast.mockReset();
  mocks.register.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('LoginForm accessibility', () => {
  it('lets a keyboard user reach the show-password toggle', () => {
    render(<LoginForm />);
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle.tabIndex).toBe(0);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('RegisterForm accessibility', () => {
  it('announces a sign-up failure as an alert', async () => {
    mocks.register.mockRejectedValue(new Error('An account with this email already exists'));
    render(<RegisterForm />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Full Name' }), {
      target: { value: 'New Learner' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'learner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-9' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'correct-horse-9' },
    });
    await submit(screen.getByRole('button', { name: 'Create account' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('An account with this email already exists');
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy();
  });

  it('identifies the purpose of the name and email fields for autofill', () => {
    render(<RegisterForm />);
    expect(screen.getByRole('textbox', { name: 'Full Name' }).getAttribute('autocomplete')).toBe(
      'name'
    );
    expect(screen.getByRole('textbox', { name: 'Email' }).getAttribute('autocomplete')).toBe(
      'email'
    );
  });
});
