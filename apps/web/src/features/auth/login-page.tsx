import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { loginSchema, type AuthResponse, type LoginInput } from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { api, ApiError } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { homeFor, useAuth } from '@/stores/auth';
import { AuthShell } from './auth-shell';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@quickbill.dev', note: 'Everything, including staff' },
  { role: 'Manager', email: 'manager@quickbill.dev', note: 'Reports, AI, purchasing' },
  { role: 'Cashier', email: 'priya@quickbill.dev', note: 'Point of sale and returns' },
  { role: 'Shopper', email: 'shopper@quickbill.dev', note: 'Online shop and orders' },
];
const DEMO_PASSWORD = 'Demo@1234';

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setSession } = useAuth();
  const from = (location.state as { from?: string } | null)?.from;

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: (input: LoginInput) => api.post<AuthResponse>('/auth/login', input),
    onSuccess: (session) => {
      setSession(session);
      navigate(from ?? homeFor(session.user), { replace: true });
    },
    onError: (error) => {
      form.setError('root', {
        message: error instanceof ApiError ? error.message : 'Could not sign in. Try again.',
      });
    },
  });

  if (user && !login.isPending && !login.isSuccess) return <Navigate to={homeFor(user)} replace />;

  const fillDemo = (email: string) => {
    form.setValue('email', email, { shouldValidate: true });
    form.setValue('password', DEMO_PASSWORD, { shouldValidate: true });
    form.setFocus('password');
  };

  return (
    <AuthShell
      aside={
        <div className="receipt mt-10 w-full max-w-sm rotate-[-1.5deg] px-6 font-mono text-[13px] text-ink shadow-float">
          <p className="text-center font-semibold">DEMO SIGN-INS</p>
          <p className="text-center text-ink-faint">password {DEMO_PASSWORD}</p>
          <div className="receipt-rule my-3" />
          <ul className="space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => fillDemo(a.email)}
                  className="group w-full rounded-md px-2 py-1 text-left hover:bg-turmeric-100"
                >
                  <span className="flex justify-between">
                    <span className="font-semibold">{a.role}</span>
                    <span className="text-peacock-600 group-hover:underline">use</span>
                  </span>
                  <span className="block truncate text-ink-soft">{a.email}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="receipt-rule my-3" />
          <p className="text-center text-ink-faint">Thank you, visit again</p>
        </div>
      }
    >
      <h1 className="type-heading text-3xl">Sign in</h1>
      <p className="mt-1 text-ink-soft">Staff and shoppers use the same sign-in.</p>

      <form
        className="mt-8 space-y-4"
        onSubmit={form.handleSubmit((values) => login.mutate(values))}
        noValidate
      >
        <Field label="Email" error={form.formState.errors.email?.message}>
          {(p) => (
            <Input {...p} type="email" autoComplete="email" autoFocus {...form.register('email')} />
          )}
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message}>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
          )}
        </Field>
        {form.formState.errors.root && (
          <p role="alert" className="rounded-lg bg-chilli-50 px-3 py-2 text-sm text-chilli-700">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        Shopping with us for the first time?{' '}
        <Link
          to="/register"
          state={location.state}
          className="font-medium text-peacock-600 hover:underline"
        >
          Create an account
        </Link>
      </p>
      <div className="mt-6 lg:hidden">
        <p className="mb-2 text-sm font-medium">Try a demo account</p>
        <div className="flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <Button
              key={a.email}
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => fillDemo(a.email)}
            >
              {a.role}
            </Button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
