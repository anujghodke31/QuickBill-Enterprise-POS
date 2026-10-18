import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus, Trash } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  rupeesToPaise,
  type Paginated,
  type ProductDTO,
  type PurchaseOrderDTO,
  type PurchaseOrderInput,
  type PurchaseOrderStatus,
} from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Panel,
  Table,
  Td,
  Th,
} from '@/components/ui/display';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/form';
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/overlay';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import { useDebounced, useDocumentTitle } from '@/lib/hooks';
import { useSuppliers } from '../catalog/queries';
import { rowLinkClass, SkeletonRows, useListParams } from '../sales/list-params';
import { SourceBadge, StatusBadge } from './po-shared';

const STATUS_FILTERS: { value: '' | PurchaseOrderStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

interface Line {
  productId: string;
  name: string;
  sku: string;
  stock: number;
  quantity: string;
  unitCost: string;
  taxRate: number;
}

function NewPurchaseOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const suppliers = useSuppliers();
  const [supplierId, setSupplierId] = useState('');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const q = useDebounced(search.trim(), 250);

  // With no search, suggest the chosen supplier's products, lowest stock first.
  const products = useQuery({
    queryKey: ['po-picker', supplierId, q],
    queryFn: () =>
      api.get<Paginated<ProductDTO>>('/catalog/products', {
        q,
        supplierId: q ? undefined : supplierId,
        sort: q ? 'name' : 'stock',
        pageSize: 8,
      }),
    enabled: open && (!!q || !!supplierId),
  });

  const reset = () => {
    setSupplierId('');
    setSearch('');
    setLines([]);
    setNotes('');
    setError(null);
  };

  const addLine = (p: ProductDTO) => {
    if (lines.some((l) => l.productId === p.id)) return;
    setLines((prev) => [
      ...prev,
      {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        quantity: String(Math.max(1, p.reorderPoint * 2 - p.stock)),
        unitCost: String(p.costPrice / 100),
        taxRate: p.taxRate,
      },
    ]);
  };

  const updateLine = (id: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.productId === id ? { ...l, ...patch } : l)));

  const total = lines.reduce(
    (sum, l) =>
      sum + rupeesToPaise(Number(l.unitCost) || 0) * (Math.round(Number(l.quantity)) || 0),
    0,
  );

  const create = useMutation({
    mutationFn: (input: PurchaseOrderInput) =>
      api.post<PurchaseOrderDTO>('/purchase-orders', input),
    onSuccess: (po) => {
      toast.success(`Purchase order ${po.number} created`, {
        description: `Draft for ${po.supplier.name}`,
      });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      reset();
      onOpenChange(false);
      navigate(`/admin/purchasing/${po.id}`);
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Could not create the purchase order.'),
  });

  const submit = () => {
    setError(null);
    if (!supplierId) return setError('Choose a supplier.');
    if (lines.length === 0) return setError('Add at least one product.');
    const bad = lines.find(
      (l) =>
        !(Number(l.quantity) >= 1 && Number.isInteger(Number(l.quantity))) ||
        !(Number(l.unitCost) >= 0),
    );
    if (bad) return setError(`Check the quantity and cost for ${bad.name}.`);
    create.mutate({
      supplierId,
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitCost: rupeesToPaise(Number(l.unitCost)),
        taxRate: l.taxRate,
      })),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent
        wide
        title="New purchase order"
        description="Saved as a draft. Mark it as ordered once you have sent it to the supplier."
      >
        <div className="space-y-4">
          <Field label="Supplier">
            {(p) => (
              <Select {...p} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Choose a supplier</option>
                {suppliers.data
                  ?.filter((s) => s.isActive)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.leadTimeDays} day lead time)
                    </option>
                  ))}
              </Select>
            )}
          </Field>

          <div>
            <Field
              label="Add products"
              hint={
                supplierId && !q
                  ? "Showing this supplier's products, lowest stock first"
                  : undefined
              }
            >
              {(p) => (
                <Input
                  {...p}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or SKU"
                />
              )}
            </Field>
            {products.data && products.data.items.length > 0 && (
              <ul className="mt-2 max-h-48 divide-y divide-line overflow-y-auto rounded-xl border border-line">
                {products.data.items.map((p) => {
                  const added = lines.some((l) => l.productId === p.id);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        disabled={added}
                        onClick={() => addLine(p)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-paper disabled:opacity-50"
                      >
                        <span className="min-w-0 truncate">{p.name}</span>
                        <span className="shrink-0 text-ink-faint tabular-nums">
                          {added ? 'Added' : `${p.stock} in stock`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {lines.length > 0 && (
            <div className="relative overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[13px] text-ink-faint">
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="w-24 px-3 py-2 font-medium">Qty</th>
                    <th className="w-32 px-3 py-2 font-medium">Unit cost (₹)</th>
                    <th className="w-28 px-3 py-2 text-right font-medium">Line total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.productId} className="border-t border-line">
                      <td className="px-3 py-2">
                        <span className="block max-w-56 truncate">{l.name}</span>
                        <span className="text-xs text-ink-faint tabular-nums">
                          {l.stock} in stock
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={l.quantity}
                          onChange={(e) => updateLine(l.productId, { quantity: e.target.value })}
                          className="h-9 tabular-nums"
                          aria-label={`Quantity of ${l.name}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={l.unitCost}
                          onChange={(e) => updateLine(l.productId, { unitCost: e.target.value })}
                          className="h-9 tabular-nums"
                          aria-label={`Unit cost of ${l.name}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatINR(
                          rupeesToPaise(Number(l.unitCost) || 0) *
                            (Math.round(Number(l.quantity)) || 0),
                        )}
                      </td>
                      <td className="pr-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() =>
                            setLines((prev) => prev.filter((x) => x.productId !== l.productId))
                          }
                          aria-label={`Remove ${l.name}`}
                        >
                          <Trash />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Field label="Notes for the supplier" hint="Optional">
            {(p) => (
              <Textarea
                {...p}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-16"
                maxLength={500}
              />
            )}
          </Field>

          {error && (
            <p role="alert" className="rounded-lg bg-chilli-50 px-3 py-2 text-sm text-chilli-700">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="items-center">
          <p className="mr-auto text-ink-soft">
            Total <span className="font-semibold text-ink tabular-nums">{formatINR(total)}</span>
          </p>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} loading={create.isPending}>
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PurchaseOrdersPage() {
  useDocumentTitle('Purchase orders');
  const navigate = useNavigate();
  const { values, page, set } = useListParams({ status: '' });
  const [creating, setCreating] = useState(false);

  const orders = useQuery({
    queryKey: ['purchase-orders', values.status, page],
    queryFn: () =>
      api.get<Paginated<PurchaseOrderDTO>>('/purchase-orders', {
        status: values.status,
        page,
        pageSize: 25,
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Purchase orders"
        description="Stock ordered from suppliers. Receiving an order adds its items to stock."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> New purchase order
          </Button>
        }
      />

      <div className="mb-4 max-w-full relative overflow-x-auto">
        <Segmented
          value={values.status as '' | PurchaseOrderStatus}
          options={STATUS_FILTERS}
          onChange={(status) => set({ status })}
        />
      </div>

      {orders.isError && <ErrorState error={orders.error} onRetry={() => orders.refetch()} />}

      <Panel className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Supplier</Th>
              <Th>Created from</Th>
              <Th className="text-right">Lines</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Received</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {orders.isPending ? (
              <SkeletonRows cols={8} />
            ) : (
              orders.data?.items.map((po) => (
                <tr
                  key={po.id}
                  className={rowLinkClass}
                  onClick={() => navigate(`/admin/purchasing/${po.id}`)}
                >
                  <Td className="font-medium tabular-nums">{po.number}</Td>
                  <Td>{po.supplier.name}</Td>
                  <Td>
                    <SourceBadge source={po.source} />
                  </Td>
                  <Td className="text-right tabular-nums">{po.items.length}</Td>
                  <Td>
                    <StatusBadge status={po.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-ink-soft">{formatDate(po.createdAt)}</Td>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {po.receivedAt ? formatDate(po.receivedAt) : ''}
                  </Td>
                  <Td className="text-right font-medium tabular-nums">{formatINR(po.total)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {orders.data && orders.data.items.length === 0 && (
          <EmptyState
            icon={<ClipboardList />}
            title="No purchase orders here"
            action={
              <Button variant="secondary" onClick={() => setCreating(true)}>
                Create a purchase order
              </Button>
            }
          >
            Draft one by hand, let the reorder forecast draft them, or scan a supplier bill.
          </EmptyState>
        )}
        {orders.data && (
          <Pagination
            page={orders.data.page}
            totalPages={orders.data.totalPages}
            total={orders.data.total}
            onPage={(p) => set({ page: p })}
          />
        )}
      </Panel>

      <NewPurchaseOrderDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
