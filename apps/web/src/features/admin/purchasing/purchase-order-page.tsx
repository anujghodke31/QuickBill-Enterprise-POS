import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PackageCheck, Send } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import type { PurchaseOrderDTO, PurchaseOrderStatus } from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import { ErrorState, PageHeader, Panel, Skeleton, Table, Td, Th } from '@/components/ui/display';
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/overlay';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, formatINR } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { SourceBadge, StatusBadge } from './po-shared';

const DONE: Partial<Record<PurchaseOrderStatus, string>> = {
  ORDERED: 'Marked as ordered',
  RECEIVED: 'Goods received',
  CANCELLED: 'Purchase order cancelled',
};

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-ink-soft">{term}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default function PurchaseOrderPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<'RECEIVED' | 'CANCELLED' | null>(null);

  const po = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => api.get<PurchaseOrderDTO>(`/purchase-orders/${id}`),
  });
  useDocumentTitle(po.data ? `Purchase order ${po.data.number}` : 'Purchase order');

  const setStatus = useMutation({
    mutationFn: (status: PurchaseOrderStatus) =>
      api.patch<PurchaseOrderDTO>(`/purchase-orders/${id}/status`, { status }),
    onSuccess: (updated) => {
      toast.success(DONE[updated.status] ?? 'Purchase order updated', {
        description: updated.number,
      });
      queryClient.setQueryData(['purchase-order', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      if (updated.status === 'RECEIVED') {
        for (const key of ['products', 'product', 'movements', 'inventory-alerts', 'forecast']) {
          void queryClient.invalidateQueries({ queryKey: [key] });
        }
      }
      setConfirm(null);
    },
  });

  if (po.isError) return <ErrorState error={po.error} onRetry={() => po.refetch()} />;
  const data = po.data;
  const units = data?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <>
      <Link
        to="/admin/purchasing"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" /> All purchase orders
      </Link>
      <PageHeader
        title={data ? `Purchase order ${data.number}` : <Skeleton className="h-8 w-64" />}
        description={
          data ? `${data.supplier.name}, created ${formatDate(data.createdAt)}` : undefined
        }
        actions={
          data && (
            <>
              {(data.status === 'DRAFT' || data.status === 'ORDERED') && (
                <Button
                  variant="secondary"
                  className="text-chilli-600"
                  onClick={() => setConfirm('CANCELLED')}
                >
                  Cancel order
                </Button>
              )}
              {data.status === 'DRAFT' && (
                <Button
                  onClick={() => setStatus.mutate('ORDERED')}
                  loading={setStatus.isPending && setStatus.variables === 'ORDERED'}
                >
                  <Send /> Mark as ordered
                </Button>
              )}
              {data.status === 'ORDERED' && (
                <Button onClick={() => setConfirm('RECEIVED')}>
                  <PackageCheck /> Receive goods
                </Button>
              )}
            </>
          )
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <Panel className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Unit cost</Th>
                <Th className="text-right">GST</Th>
                <Th className="text-right">Line total</Th>
              </tr>
            </thead>
            <tbody>
              {!data
                ? Array.from({ length: 5 }, (_, i) => (
                    <tr key={i}>
                      <Td colSpan={5}>
                        <Skeleton className="h-5 w-full" />
                      </Td>
                    </tr>
                  ))
                : data.items.map((item) => (
                    <tr key={item.id}>
                      <Td>
                        <Link
                          to={`/admin/products/${item.productId}`}
                          className="hover:text-peacock-600"
                        >
                          {item.productName}
                        </Link>
                        <span className="block text-xs text-ink-faint tabular-nums">
                          {item.sku}
                        </span>
                      </Td>
                      <Td className="text-right tabular-nums">{item.quantity}</Td>
                      <Td className="text-right tabular-nums">{formatINR(item.unitCost)}</Td>
                      <Td className="text-right text-ink-soft tabular-nums">{item.taxRate}%</Td>
                      <Td className="text-right font-medium tabular-nums">
                        {formatINR(item.lineTotal)}
                      </Td>
                    </tr>
                  ))}
            </tbody>
            {data && (
              <tfoot>
                <tr>
                  <td colSpan={4} className="px-4 pt-3 text-right text-ink-soft">
                    Taxable value
                  </td>
                  <td className="px-4 pt-3 text-right tabular-nums">{formatINR(data.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-1 text-right text-ink-soft">
                    GST
                  </td>
                  <td className="px-4 py-1 text-right tabular-nums">{formatINR(data.taxTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 pb-4 text-right font-semibold">
                    Total
                  </td>
                  <td className="px-4 pb-4 text-right text-base font-semibold tabular-nums">
                    {formatINR(data.total)}
                  </td>
                </tr>
              </tfoot>
            )}
          </Table>
        </Panel>

        <Panel className="px-5 py-2">
          {data ? (
            <dl className="divide-y divide-line">
              <Detail term="Status">
                <StatusBadge status={data.status} />
              </Detail>
              <Detail term="Created from">
                <SourceBadge source={data.source} />
              </Detail>
              <Detail term="Supplier">{data.supplier.name}</Detail>
              <Detail term="Units">
                <span className="tabular-nums">
                  {units} across {data.items.length} products
                </span>
              </Detail>
              <Detail term="Created by">{data.createdBy.name}</Detail>
              <Detail term="Created">{formatDateTime(data.createdAt)}</Detail>
              {data.receivedAt && (
                <Detail term="Received">{formatDateTime(data.receivedAt)}</Detail>
              )}
              {data.supplierInvoiceNo && (
                <Detail term="Supplier invoice">
                  <span className="tabular-nums">{data.supplierInvoiceNo}</span>
                  {data.invoiceDate && (
                    <span className="block text-xs text-ink-faint">
                      {formatDate(data.invoiceDate)}
                    </span>
                  )}
                </Detail>
              )}
              {data.notes && (
                <div className="py-2.5">
                  <dt className="text-ink-soft">Notes</dt>
                  <dd className="mt-1">{data.notes}</dd>
                </div>
              )}
            </dl>
          ) : (
            <div className="space-y-3 py-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {data && (
        <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
          {confirm === 'RECEIVED' ? (
            <DialogContent
              title={`Receive ${data.number}?`}
              description={`This adds ${units} units across ${data.items.length} products to stock and records each line's unit cost as the product's new cost price.`}
            >
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Not yet</Button>
                </DialogClose>
                <Button loading={setStatus.isPending} onClick={() => setStatus.mutate('RECEIVED')}>
                  Receive goods
                </Button>
              </DialogFooter>
            </DialogContent>
          ) : (
            <DialogContent
              title={`Cancel ${data.number}?`}
              description="The order stays on record as cancelled. No stock changes."
            >
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Keep order</Button>
                </DialogClose>
                <Button
                  variant="danger"
                  loading={setStatus.isPending}
                  onClick={() => setStatus.mutate('CANCELLED')}
                >
                  Cancel order
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      )}
    </>
  );
}
