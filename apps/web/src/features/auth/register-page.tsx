import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import type { z } from 'zod';
import { registerSchema, type AuthResponse } from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { api, ApiError } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { useAuth } from '@/stores/auth';
import { AuthShell } from './auth-shell';

type RegisterForm = z.input<typeof registerSchema>;

export default function RegisterPage() {
  useDocumentTitle('Create an account');
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuth((s) => s.setSession);
  const from = (location.state as { from?: string } | null)?.from;

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', phone: undefined },
  });

  const register = useMutation({
    mutationFn: (input: RegisterForm) => api.post<AuthResponse>('/auth/register', input),
    onSuccess: (session) => {
      setSession(session);
      navigate(from ?? '/', { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        for (const [path, message] of Object.entries(error.fieldErrors)) {
          form.setError(path as keyof RegisterForm, { message });
        }
      }
      form.setError('root', { message: error.message });
    },
  });

  const { errors } = form.formState;
  return (
    <AuthShell>
      <h1 className="type-heading text-3xl">Create an account</h1>
      <p className="mt-1 text-ink-soft">
        Track orders and earn loyalty points online and at the counter. If you already shop with us
        in store, use the same phone number to keep your points.
      </p>
      <form
        className="mt-8 space-y-4"
        noValidate
        onSubmit={form.handleSubmit((values) =>
          register.mutate({ ...values, phone: values.phone || undefined }),
        )}
      >
        <Field label="Full name" error={errors.name?.message}>
          {(p) => <Input {...p} autoComplete="name" autoFocus {...form.register('name')} />}
        </Field>
        <Field label="Email" error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
        </Field>
        <Field
          label="Mobile number"
          hint="Optional. 10 digits, no country code."
          error={errors.phone?.message}
        >
          {(p) => (
            <Input
              {...p}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              {...form.register('phone', { setValueAs: (v: string) => v.trim() || undefined })}
            />
          )}
        </Field>
        <Field
          label="Password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.password?.message}
        >
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
          )}
        </Field>
        {errors.root && (
          <p role="alert" className="rounded-lg bg-chilli-50 px-3 py-2 text-sm text-chilli-700">
            {errors.root.message}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={register.isPending}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Already have an account?{' '}
        <Link
          to="/login"
          state={location.state}
          className="font-medium text-peacock-600 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
