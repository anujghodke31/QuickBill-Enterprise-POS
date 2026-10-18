import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { orderLookupSchema, type OrderDTO, type OrderLookupInput } from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { api, ApiError } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { useAuth } from '@/stores/auth';

export default function TrackPage() {
  useDocumentTitle('Track an order');
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const form = useForm<OrderLookupInput>({
    resolver: zodResolver(orderLookupSchema),
    defaultValues: { number: '', email: user?.email ?? '' },
  });

  const lookup = useMutation({
    mutationFn: (input: OrderLookupInput) => api.post<OrderDTO>('/shop/orders/lookup', input),
    onSuccess: (order, input) =>
      navigate(`/orders/${order.number}`, { state: { order, email: input.email } }),
    onError: (error) =>
      form.setError('root', {
        message:
          error instanceof ApiError && error.status === 404
            ? 'No order matches that number and email. Check both and try again.'
            : error.message,
      }),
  });

  const { errors } = form.formState;
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="type-heading text-3xl">Track an order</h1>
      <p className="mt-2 text-ink-soft">
        Your order number starts with QB and is shown on the confirmation page.
      </p>
      <form
        className="mt-8 space-y-4"
        noValidate
        onSubmit={form.handleSubmit((values) => lookup.mutate(values))}
      >
        <Field label="Order number" error={errors.number?.message}>
          {(p) => (
            <Input
              {...p}
              placeholder="QB-26-000123"
              autoCapitalize="characters"
              autoFocus
              {...form.register('number')}
            />
          )}
        </Field>
        <Field label="Email used for the order" error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
        </Field>
        {errors.root && (
          <p role="alert" className="rounded-lg bg-chilli-50 px-3 py-2 text-sm text-chilli-700">
            {errors.root.message}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={lookup.isPending}>
          Find my order
        </Button>
      </form>
      {!user && (
        <p className="mt-6 text-sm text-ink-soft">
          Have an account?{' '}
          <Link
            to="/login"
            state={{ from: '/account' }}
            className="font-medium text-peacock-600 hover:underline"
          >
            Sign in
          </Link>{' '}
          to see all your orders in one place.
        </p>
      )}
    </div>
  );
}
