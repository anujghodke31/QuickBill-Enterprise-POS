import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { SupplierDTO, SupplierInput } from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Table,
  Td,
  Th,
} from '@/components/ui/display';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/form';
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/overlay';
import { api, ApiError } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { canManage, useAuth } from '@/stores/auth';
import { useSuppliers } from '../catalog/queries';
import { SkeletonRows } from '../sales/list-params';

interface FormValues {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  leadTimeDays: string;
  isActive: boolean;
}

const EMPTY: FormValues = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  gstin: '',
  address: '',
  leadTimeDays: '3',
  isActive: true,
};

const toForm = (s: SupplierDTO): FormValues => ({
  name: s.name,
  contactName: s.contactName ?? '',
  phone: s.phone ?? '',
  email: s.email ?? '',
  gstin: s.gstin ?? '',
  address: s.address ?? '',
  leadTimeDays: String(s.leadTimeDays),
  isActive: s.isActive,
});

const toPayload = (v: FormValues): SupplierInput => ({
  name: v.name.trim(),
  contactName: v.contactName.trim() || undefined,
  phone: v.phone.trim() || undefined,
  email: v.email.trim() || undefined,
  gstin: v.gstin.trim().toUpperCase() || undefined,
  address: v.address.trim() || undefined,
  leadTimeDays: Math.round(Number(v.leadTimeDays)),
  isActive: v.isActive,
});

function SupplierDialog({
  supplier,
  open,
  onOpenChange,
}: {
  supplier: SupplierDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({ defaultValues: EMPTY });
  const { register, formState, watch, setValue } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (open) form.reset(supplier ? toForm(supplier) : EMPTY);
  }, [open, supplier, form]);

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      supplier
        ? api.patch<SupplierDTO>(`/suppliers/${supplier.id}`, toPayload(values))
        : api.post<SupplierDTO>('/suppliers', toPayload(values)),
    onSuccess: (saved) => {
      toast.success(supplier ? 'Supplier updated' : 'Supplier added', { description: saved.name });
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      onOpenChange(false);
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) return;
      const fields = Object.entries(error.fieldErrors);
      for (const [path, message] of fields) {
        if (path in EMPTY) form.setError(path as keyof FormValues, { message });
      }
      if (fields.length === 0) form.setError('root', { message: error.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        wide
        title={supplier ? `Edit ${supplier.name}` : 'Add a supplier'}
        description="Lead time is how many days a delivery takes after you order. The reorder forecast uses it."
      >
        <form
          noValidate
          onSubmit={form.handleSubmit((values) => save.mutate(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Business name" error={errors.name?.message} className="sm:col-span-2">
            {(p) => (
              <Input
                {...p}
                {...register('name', {
                  required: 'Enter the supplier name',
                  minLength: { value: 2, message: 'Use at least 2 characters' },
                })}
              />
            )}
          </Field>
          <Field label="Contact person" error={errors.contactName?.message}>
            {(p) => <Input {...p} {...register('contactName')} />}
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            {(p) => <Input {...p} type="tel" {...register('phone')} />}
          </Field>
          <Field label="Email" error={errors.email?.message}>
            {(p) => <Input {...p} type="email" {...register('email')} />}
          </Field>
          <Field
            label="GSTIN"
            hint="15 characters, for input tax credit"
            error={errors.gstin?.message}
          >
            {(p) => (
              <Input
                {...p}
                className="uppercase tabular-nums"
                maxLength={15}
                {...register('gstin', {
                  validate: (v) =>
                    v.trim() === '' ||
                    /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(v.trim().toUpperCase()) ||
                    'Enter a valid 15-character GSTIN',
                })}
              />
            )}
          </Field>
          <Field label="Address" error={errors.address?.message} className="sm:col-span-2">
            {(p) => <Textarea {...p} className="min-h-16" {...register('address')} />}
          </Field>
          <Field label="Lead time in days" error={errors.leadTimeDays?.message}>
            {(p) => (
              <Input
                {...p}
                type="number"
                min="1"
                max="60"
                step="1"
                className="tabular-nums"
                {...register('leadTimeDays', {
                  validate: (v) =>
                    (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 60) ||
                    'Between 1 and 60 days',
                })}
              />
            )}
          </Field>
          <div className="flex items-end pb-2">
            <Checkbox
              label="Active supplier"
              checked={watch('isActive')}
              onChange={(e) => setValue('isActive', e.target.checked, { shouldDirty: true })}
            />
          </div>
          {errors.root && (
            <p
              role="alert"
              className="rounded-lg bg-chilli-50 px-3 py-2 text-sm text-chilli-700 sm:col-span-2"
            >
              {errors.root.message}
            </p>
          )}
          <DialogFooter className="sm:col-span-2">
            <DialogClose asChild>
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={save.isPending}>
              {supplier ? 'Save changes' : 'Add supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SuppliersPage() {
  useDocumentTitle('Suppliers');
  const user = useAuth((s) => s.user);
  const manage = canManage(user);
  const suppliers = useSuppliers();
  const [editing, setEditing] = useState<SupplierDTO | null>(null);
  const [open, setOpen] = useState(false);

  const openDialog = (supplier: SupplierDTO | null) => {
    setEditing(supplier);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Distributors the store buys from, and how quickly they deliver."
        actions={
          manage && (
            <Button onClick={() => openDialog(null)}>
              <Plus /> Add supplier
            </Button>
          )
        }
      />

      {suppliers.isError && (
        <ErrorState error={suppliers.error} onRetry={() => suppliers.refetch()} />
      )}

      <Panel className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <Th>Supplier</Th>
              <Th>Contact</Th>
              <Th>GSTIN</Th>
              <Th className="text-right">Lead time</Th>
              <Th className="text-right">Products</Th>
              <Th>Status</Th>
              {manage && <Th className="w-12" />}
            </tr>
          </thead>
          <tbody>
            {suppliers.isPending ? (
              <SkeletonRows rows={6} cols={manage ? 7 : 6} />
            ) : (
              suppliers.data?.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <span className="block font-medium">{s.name}</span>
                    {s.address && (
                      <span className="block max-w-72 truncate text-xs text-ink-faint">
                        {s.address}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="block">
                      {s.contactName ?? <span className="text-ink-faint">No contact</span>}
                    </span>
                    <span className="block text-xs text-ink-faint">
                      {[s.phone, s.email].filter(Boolean).join(', ')}
                    </span>
                  </Td>
                  <Td className="text-ink-soft tabular-nums">{s.gstin ?? ''}</Td>
                  <Td className="text-right tabular-nums">
                    {s.leadTimeDays} {s.leadTimeDays === 1 ? 'day' : 'days'}
                  </Td>
                  <Td className="text-right tabular-nums">{s.productCount}</Td>
                  <Td>
                    {s.isActive ? <Badge tone="leaf">Active</Badge> : <Badge>Inactive</Badge>}
                  </Td>
                  {manage && (
                    <Td>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(s)}
                        aria-label={`Edit ${s.name}`}
                      >
                        <Pencil />
                      </Button>
                    </Td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {suppliers.data && suppliers.data.length === 0 && (
          <EmptyState icon={<Truck />} title="No suppliers yet">
            Add the distributors you buy from to raise purchase orders and get reorder suggestions.
          </EmptyState>
        )}
      </Panel>

      <SupplierDialog supplier={editing} open={open} onOpenChange={setOpen} />
    </>
  );
}
