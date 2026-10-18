import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  GST_RATES,
  paiseToRupees,
  rupeesToPaise,
  type Paginated,
  type ProductDTO,
  type ProductUpdateInput,
  type StockMovementDTO,
} from '@quickbill/shared';
import { Packshot } from '@/components/packshot';
import { Button } from '@/components/ui/button';
import { ErrorState, PageHeader, Panel, Skeleton } from '@/components/ui/display';
import { Checkbox, Field, Input, Segmented, Select, Textarea } from '@/components/ui/form';
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/overlay';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatINR, formatPercent, formatRelative, label } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { canManage, useAuth } from '@/stores/auth';
import { StockBadge } from './products-page';
import { groupByDepartment, useCategories, useSuppliers } from './queries';

interface FormValues {
  name: string;
  sku: string;
  barcode: string;
  brand: string;
  unit: string;
  categoryId: string;
  supplierId: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  taxRate: string;
  reorderPoint: string;
  stock: string;
  expiryDate: string;
  tags: string;
  description: string;
  imageUrl: string;
  isPublished: boolean;
}

const EMPTY: FormValues = {
  name: '',
  sku: '',
  barcode: '',
  brand: '',
  unit: '1 pc',
  categoryId: '',
  supplierId: '',
  price: '',
  compareAtPrice: '',
  costPrice: '',
  taxRate: '5',
  reorderPoint: '10',
  stock: '0',
  expiryDate: '',
  tags: '',
  description: '',
  imageUrl: '',
  isPublished: true,
};

const rupees = (paise: number | null) => (paise === null ? '' : String(paiseToRupees(paise)));

function toForm(p: ProductDTO): FormValues {
  return {
    name: p.name,
    sku: p.sku,
    barcode: p.barcode ?? '',
    brand: p.brand ?? '',
    unit: p.unit,
    categoryId: p.category.id,
    supplierId: p.supplier?.id ?? '',
    price: rupees(p.price),
    compareAtPrice: rupees(p.compareAtPrice),
    costPrice: rupees(p.costPrice),
    taxRate: String(p.taxRate),
    reorderPoint: String(p.reorderPoint),
    stock: String(p.stock),
    expiryDate: p.expiryDate ? p.expiryDate.slice(0, 10) : '',
    tags: p.tags.join(', '),
    description: p.description,
    imageUrl: p.imageUrl ?? '',
    isPublished: p.isPublished,
  };
}

function toPayload(v: FormValues): ProductUpdateInput {
  return {
    name: v.name.trim(),
    sku: v.sku.trim() || undefined,
    barcode: v.barcode.trim() || undefined,
    brand: v.brand.trim() || undefined,
    unit: v.unit.trim() || '1 pc',
    categoryId: v.categoryId,
    supplierId: v.supplierId || null,
    price: rupeesToPaise(Number(v.price)),
    compareAtPrice: v.compareAtPrice.trim() ? rupeesToPaise(Number(v.compareAtPrice)) : null,
    costPrice: v.costPrice.trim() ? rupeesToPaise(Number(v.costPrice)) : 0,
    taxRate: Number(v.taxRate),
    reorderPoint: Math.max(0, Math.round(Number(v.reorderPoint) || 0)),
    expiryDate: v.expiryDate || null,
    imageUrl: v.imageUrl.trim() || null,
    tags: v.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    description: v.description.trim(),
    isPublished: v.isPublished,
  };
}

const money = (value: string) =>
  value.trim() === '' ||
  (Number.isFinite(Number(value)) && Number(value) >= 0) ||
  'Enter an amount in rupees';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Panel className="p-5">
      <h2 className="type-heading text-lg">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </Panel>
  );
}

function RupeeInput(props: ComponentProps<'input'>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint">
        ₹
      </span>
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        className="pl-7 tabular-nums"
        {...props}
      />
    </div>
  );
}

function ProductFields({ form, isNew }: { form: UseFormReturn<FormValues>; isNew: boolean }) {
  const categories = useCategories();
  const suppliers = useSuppliers();
  const { register, formState, watch } = form;
  const errors = formState.errors;
  const price = Number(watch('price'));
  const cost = Number(watch('costPrice'));
  const margin = price > 0 && watch('costPrice') !== '' ? (price - cost) / price : null;

  return (
    <div className="space-y-6">
      <Section title="Basics" description="How the product appears at the till and in the shop.">
        <Field label="Name" error={errors.name?.message} className="sm:col-span-2">
          {(p) => (
            <Input
              {...p}
              {...register('name', {
                required: 'Enter a product name',
                minLength: { value: 2, message: 'Use at least 2 characters' },
              })}
            />
          )}
        </Field>
        <Field label="Brand" error={errors.brand?.message}>
          {(p) => <Input {...p} {...register('brand')} placeholder="Amul" />}
        </Field>
        <Field
          label="Pack size"
          hint="For example 500 g, 1 L or 6 pcs"
          error={errors.unit?.message}
        >
          {(p) => <Input {...p} {...register('unit')} />}
        </Field>
        <Field label="Category" error={errors.categoryId?.message}>
          {(p) => (
            <Select {...p} {...register('categoryId', { required: 'Choose a category' })}>
              <option value="">Choose a category</option>
              {groupByDepartment(categories.data ?? []).map(([department, list]) => (
                <optgroup key={department} label={department}>
                  {list.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="Supplier"
          hint="Used for reorder suggestions"
          error={errors.supplierId?.message}
        >
          {(p) => (
            <Select {...p} {...register('supplierId')}>
              <option value="">No supplier</option>
              {suppliers.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Description" error={errors.description?.message} className="sm:col-span-2">
          {(p) => <Textarea {...p} {...register('description')} rows={3} />}
        </Field>
        <Field
          label="Search tags"
          hint="Comma separated. Shoppers and semantic search use these, e.g. fever, headache"
          error={errors.tags?.message}
          className="sm:col-span-2"
        >
          {(p) => <Input {...p} {...register('tags')} />}
        </Field>
      </Section>

      <Section title="Pricing" description="Prices include GST, as printed on the pack.">
        <Field label="Selling price" error={errors.price?.message}>
          {(p) => (
            <RupeeInput
              {...p}
              {...register('price', {
                required: 'Enter the selling price',
                validate: (v) => Number(v) > 0 || 'Price must be above zero',
              })}
            />
          )}
        </Field>
        <Field
          label="MRP"
          hint="Leave empty if you sell at MRP"
          error={errors.compareAtPrice?.message}
        >
          {(p) => (
            <RupeeInput
              {...p}
              {...register('compareAtPrice', {
                validate: (v) =>
                  v.trim() === '' ||
                  Number(v) >= Number(form.getValues('price')) ||
                  'MRP should be at least the selling price',
              })}
            />
          )}
        </Field>
        <Field label="Cost price" error={errors.costPrice?.message}>
          {(p) => <RupeeInput {...p} {...register('costPrice', { validate: money })} />}
        </Field>
        <Field label="GST rate" error={errors.taxRate?.message}>
          {(p) => (
            <Select {...p} {...register('taxRate')}>
              {GST_RATES.map((r) => (
                <option key={r} value={r}>
                  {r === 0 ? 'Nil (0%)' : `${r}%`}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <p className="text-sm text-ink-soft sm:col-span-2">
          {margin === null ? (
            'Enter a price and cost to see the margin.'
          ) : (
            <>
              Margin{' '}
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  margin < 0.08 ? 'text-chilli-600' : 'text-ink',
                )}
              >
                {formatPercent(margin)}
              </span>{' '}
              ({formatINR(rupeesToPaise(price - cost))} per unit, before GST)
              {margin < 0.08 && ', which is thin for grocery'}
            </>
          )}
        </p>
      </Section>

      <Section title="Stock and identification">
        {isNew && (
          <Field
            label="Opening stock"
            hint="Recorded in the stock ledger"
            error={errors.stock?.message}
          >
            {(p) => (
              <Input
                {...p}
                type="number"
                min="0"
                step="1"
                className="tabular-nums"
                {...register('stock', {
                  validate: (v) =>
                    (Number.isInteger(Number(v)) && Number(v) >= 0) || 'Enter a whole number',
                })}
              />
            )}
          </Field>
        )}
        <Field
          label="Reorder point"
          hint="Flag as running low at or below this"
          error={errors.reorderPoint?.message}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              min="0"
              step="1"
              className="tabular-nums"
              {...register('reorderPoint')}
            />
          )}
        </Field>
        <Field
          label="Expiry date"
          hint="Of the batch on the shelf"
          error={errors.expiryDate?.message}
        >
          {(p) => <Input {...p} type="date" {...register('expiryDate')} />}
        </Field>
        <Field
          label="SKU"
          hint={isNew ? 'Leave empty to generate one' : undefined}
          error={errors.sku?.message}
        >
          {(p) => <Input {...p} {...register('sku')} className="tabular-nums" />}
        </Field>
        <Field label="Barcode" hint="EAN printed on the pack" error={errors.barcode?.message}>
          {(p) => (
            <Input {...p} inputMode="numeric" {...register('barcode')} className="tabular-nums" />
          )}
        </Field>
      </Section>

      <Section title="Online shop">
        <Field
          label="Image URL"
          hint="Optional. Without one, the shop draws a pack for the product."
          error={errors.imageUrl?.message}
          className="sm:col-span-2"
        >
          {(p) => <Input {...p} type="url" placeholder="https://" {...register('imageUrl')} />}
        </Field>
        <Checkbox
          label="Show this product in the online shop"
          checked={watch('isPublished')}
          onChange={(e) => form.setValue('isPublished', e.target.checked, { shouldDirty: true })}
          className="sm:col-span-2"
        />
      </Section>
    </div>
  );
}

function AdjustStockDialog({
  product,
  open,
  onOpenChange,
}: {
  product: ProductDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<'add' | 'remove'>('remove');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const qty = Math.max(0, Math.round(Number(quantity) || 0));
  const delta = direction === 'add' ? qty : -qty;

  const adjust = useMutation({
    mutationFn: () =>
      api.post<ProductDTO>('/inventory/adjustments', {
        productId: product.id,
        delta,
        note: note.trim(),
      }),
    onSuccess: (updated) => {
      toast.success('Stock adjusted', {
        description: `${updated.name} now has ${updated.stock} in stock.`,
      });
      queryClient.setQueryData(['product', product.id], updated);
      for (const key of ['products', 'movements', 'inventory-alerts']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      setQuantity('');
      setNote('');
      onOpenChange(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not adjust stock.'),
  });

  const submit = () => {
    setError(null);
    if (qty === 0) return setError('Enter how many units to add or remove.');
    if (note.trim().length < 3)
      return setError('Add a short reason, for example "Damaged in storage".');
    adjust.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Adjust stock"
        description="For stock counts, damage and write-offs. Deliveries should come in through a purchase order."
      >
        <div className="space-y-4">
          <Segmented
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'remove', label: 'Remove units' },
              { value: 'add', label: 'Add units' },
            ]}
          />
          <Field label="Units">
            {(p) => (
              <Input
                {...p}
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="tabular-nums"
                autoFocus
              />
            )}
          </Field>
          <Field label="Reason">
            {(p) => (
              <Input
                {...p}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Stock count correction"
                maxLength={200}
              />
            )}
          </Field>
          <p className="text-sm text-ink-soft">
            Stock goes from{' '}
            <span className="font-medium text-ink tabular-nums">{product.stock}</span> to{' '}
            <span
              className={cn(
                'font-medium tabular-nums',
                product.stock + delta < 0 ? 'text-chilli-600' : 'text-ink',
              )}
            >
              {product.stock + delta}
            </span>
            .
          </p>
          {error && (
            <p role="alert" className="rounded-lg bg-chilli-50 px-3 py-2 text-sm text-chilli-700">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} loading={adjust.isPending} disabled={product.stock + delta < 0}>
            Adjust stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecentMovements({ productId }: { productId: string }) {
  const movements = useQuery({
    queryKey: ['movements', { productId }],
    queryFn: () =>
      api.get<Paginated<StockMovementDTO>>('/inventory/movements', { productId, pageSize: 8 }),
  });
  return (
    <Panel className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="type-heading text-lg">Recent stock movements</h2>
        <Link
          to={`/admin/inventory?productId=${productId}`}
          className="text-sm text-peacock-600 hover:underline"
        >
          Full ledger
        </Link>
      </div>
      {movements.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : movements.data?.items.length ? (
        <ul className="divide-y divide-line text-sm">
          {movements.data.items.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block">{label(m.reason)}</span>
                <span className="block text-xs text-ink-faint">{formatRelative(m.createdAt)}</span>
              </span>
              <span className="text-right tabular-nums">
                <span
                  className={cn('font-medium', m.delta > 0 ? 'text-leaf-600' : 'text-chilli-600')}
                >
                  {m.delta > 0 ? '+' : '−'}
                  {Math.abs(m.delta)}
                </span>
                <span className="block text-xs text-ink-faint">{m.balanceAfter} after</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">No stock has moved yet.</p>
      )}
    </Panel>
  );
}

export default function ProductFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const manage = canManage(user);
  const categories = useCategories();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const product = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get<ProductDTO>(`/catalog/products/${id}`),
    enabled: !isNew,
  });
  useDocumentTitle(isNew ? 'New product' : (product.data?.name ?? 'Product'));

  const form = useForm<FormValues>({ defaultValues: EMPTY });
  useEffect(() => {
    if (product.data) form.reset(toForm(product.data));
  }, [product.data, form]);

  const applyServerErrors = (error: unknown) => {
    if (!(error instanceof ApiError)) return;
    const fields = Object.entries(error.fieldErrors);
    for (const [path, message] of fields) {
      if (path in EMPTY) form.setError(path as keyof FormValues, { message });
    }
    if (fields.length === 0) toast.error(error.message);
  };

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      isNew
        ? api.post<ProductDTO>('/catalog/products', {
            ...toPayload(values),
            stock: Math.max(0, Math.round(Number(values.stock) || 0)),
          })
        : api.patch<ProductDTO>(`/catalog/products/${id}`, toPayload(values)),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
      queryClient.setQueryData(['product', saved.id], saved);
      if (isNew) {
        toast.success('Product created', { description: saved.name });
        navigate(`/admin/products/${saved.id}`, { replace: true });
      } else {
        toast.success('Changes saved', { description: saved.name });
      }
    },
    onError: applyServerErrors,
  });

  const archive = useMutation({
    mutationFn: () => api.delete(`/catalog/products/${id}`),
    onSuccess: () => {
      toast.success('Product archived', { description: product.data?.name });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/admin/products');
    },
  });

  if (!isNew && product.isError) {
    return <ErrorState error={product.error} onRetry={() => product.refetch()} />;
  }

  const watched = form.watch();
  const department = categories.data?.find((c) => c.id === watched.categoryId)?.department ?? '';
  const categoryName = categories.data?.find((c) => c.id === watched.categoryId)?.name ?? '';
  const loading = !isNew && product.isPending;

  return (
    <>
      <Link
        to="/admin/products"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" /> All products
      </Link>
      <PageHeader
        title={
          isNew ? 'New product' : loading ? <Skeleton className="h-8 w-64" /> : product.data?.name
        }
        description={
          !isNew && product.data
            ? `Last updated ${formatRelative(product.data.updatedAt)}`
            : 'Add something new to the shelves.'
        }
        actions={
          !isNew &&
          manage &&
          product.data && (
            <Button variant="secondary" onClick={() => setArchiveOpen(true)}>
              <Archive /> Archive
            </Button>
          )
        }
      />

      <form
        noValidate
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div>
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-80 w-full rounded-2xl" />
              <Skeleton className="h-56 w-full rounded-2xl" />
            </div>
          ) : (
            <fieldset disabled={!manage || save.isPending} className="min-w-0">
              <ProductFields form={form} isNew={isNew} />
            </fieldset>
          )}

          {manage && (
            <div className="sticky bottom-0 z-10 mt-6 flex items-center justify-end gap-2 border-t border-line bg-paper/95 py-4 backdrop-blur">
              {form.formState.isDirty && !isNew && (
                <span className="mr-auto text-sm text-ink-soft">You have unsaved changes</span>
              )}
              <Button asChild variant="secondary">
                <Link to="/admin/products">Cancel</Link>
              </Button>
              <Button
                type="submit"
                loading={save.isPending}
                disabled={!isNew && !form.formState.isDirty}
              >
                {isNew ? 'Create product' : 'Save changes'}
              </Button>
            </div>
          )}
          {!manage && (
            <p className="mt-4 text-sm text-ink-soft">
              Only managers and admins can edit products.
            </p>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20">
          <Panel className="overflow-hidden">
            <Packshot
              product={{
                name: watched.name || 'Product name',
                brand: watched.brand || null,
                unit: watched.unit || '1 pc',
                imageUrl: watched.imageUrl || null,
                department,
                category: categoryName,
              }}
              className="aspect-square w-full"
            />
            <div className="flex items-baseline justify-between gap-3 border-t border-line px-4 py-3">
              <span className="truncate text-sm text-ink-soft">Shop preview</span>
              <span className="font-semibold tabular-nums">
                {Number(watched.price) > 0 ? formatINR(rupeesToPaise(Number(watched.price))) : '—'}
              </span>
            </div>
          </Panel>

          {product.data && (
            <>
              <Panel className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-ink-soft">In stock</p>
                    <p className="type-display mt-1 text-5xl tabular-nums">{product.data.stock}</p>
                  </div>
                  <StockBadge product={product.data} />
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  Reorder at {product.data.reorderPoint}
                  {product.data.expiryDate && (
                    <>, batch expires {formatDate(product.data.expiryDate)}</>
                  )}
                </p>
                {manage && (
                  <Button
                    variant="secondary"
                    className="mt-4 w-full"
                    onClick={() => setAdjustOpen(true)}
                  >
                    <SlidersHorizontal /> Adjust stock
                  </Button>
                )}
              </Panel>
              <RecentMovements productId={product.data.id} />
            </>
          )}
        </aside>
      </form>

      {product.data && (
        <>
          <AdjustStockDialog
            product={product.data}
            open={adjustOpen}
            onOpenChange={setAdjustOpen}
          />
          <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
            <DialogContent
              title={`Archive ${product.data.name}?`}
              description="It disappears from the till and the online shop. Past bills, orders and the stock ledger keep their records."
            >
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Keep product</Button>
                </DialogClose>
                <Button
                  variant="danger"
                  loading={archive.isPending}
                  onClick={() => archive.mutate()}
                >
                  Archive product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
