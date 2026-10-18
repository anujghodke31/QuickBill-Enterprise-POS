import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { CustomerDTO, CustomerInput } from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/overlay';
import { api, ApiError } from '@/lib/api';

interface FormValues {
  name: string;
  phone: string;
  email: string;
}

const EMPTY: FormValues = { name: '', phone: '', email: '' };

/** Add a customer, or edit one when `customer` is given. */
export function CustomerDialog({
  customer,
  open,
  onOpenChange,
  onSaved,
}: {
  customer?: CustomerDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (customer: CustomerDTO) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({ defaultValues: EMPTY });
  const errors = form.formState.errors;

  useEffect(() => {
    if (open) {
      form.reset(
        customer
          ? { name: customer.name, phone: customer.phone ?? '', email: customer.email ?? '' }
          : EMPTY,
      );
    }
  }, [open, customer, form]);

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const body: Partial<CustomerInput> = {
        name: v.name.trim(),
        phone: v.phone.trim() || undefined,
        email: v.email.trim().toLowerCase() || undefined,
      };
      return customer
        ? api.patch<CustomerDTO>(`/customers/${customer.id}`, body)
        : api.post<CustomerDTO>('/customers', body);
    },
    onSuccess: (saved) => {
      toast.success(customer ? 'Customer updated' : 'Customer added', { description: saved.name });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.setQueryData(['customer', saved.id], (old: object | undefined) =>
        old ? { ...old, ...saved } : old,
      );
      onOpenChange(false);
      onSaved?.(saved);
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) return;
      const fields = Object.entries(error.fieldErrors);
      for (const [path, message] of fields) {
        if (path in EMPTY) form.setError(path as keyof FormValues, { message });
      }
      if (fields.length === 0) {
        const field = /phone/i.test(error.message)
          ? 'phone'
          : /email/i.test(error.message)
            ? 'email'
            : 'root';
        form.setError(field, { message: error.message });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={customer ? `Edit ${customer.name}` : 'Add a customer'}
        description="A phone number lets the till find them and credit loyalty points."
      >
        <form noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4">
          <Field label="Full name" error={errors.name?.message}>
            {(p) => (
              <Input
                {...p}
                autoFocus
                {...form.register('name', {
                  required: 'Enter a name',
                  minLength: { value: 2, message: 'Use at least 2 characters' },
                })}
              />
            )}
          </Field>
          <Field
            label="Mobile number"
            hint="10 digits, no country code"
            error={errors.phone?.message}
          >
            {(p) => (
              <Input
                {...p}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className="tabular-nums"
                {...form.register('phone', {
                  validate: (v) =>
                    v.trim() === '' ||
                    /^[6-9]\d{9}$/.test(v.trim()) ||
                    'Enter a 10-digit Indian mobile number',
                })}
              />
            )}
          </Field>
          <Field label="Email" hint="Optional" error={errors.email?.message}>
            {(p) => <Input {...p} type="email" {...form.register('email')} />}
          </Field>
          {errors.root && (
            <p role="alert" className="rounded-lg bg-chilli-50 px-3 py-2 text-sm text-chilli-700">
              {errors.root.message}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={save.isPending}>
              {customer ? 'Save changes' : 'Add customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
