import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Undo2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import type { Paginated, ReturnDTO, SaleDTO } from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Panel,
  Table,
  Td,
  Th,
} from '@/components/ui/display';
import { Field, Input } from '@/components/ui/form';
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/overlay';
import { api, ApiError } from '@/lib/api';
import { formatDateTime, formatINR, label } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { SkeletonRows, useListParams } from './list-params';
import { ReturnDialog } from './return-dialog';

function FindBillDialog({
  open,
  onOpenChange,
  onFound,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFound: (sale: SaleDTO) => void;
}) {
  const [number, setNumber] = useState('');
  const lookup = useMutation({
    mutationFn: (value: string) => api.get<SaleDTO>(`/sales/${encodeURIComponent(value)}`),
    onSuccess: (sale) => {
      setNumber('');
      onFound(sale);
    },
    onError: () => {},
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = number.trim().toUpperCase();
    if (value) lookup.mutate(value);
  };

  const error =
    lookup.error instanceof ApiError && lookup.error.status === 404
      ? `No bill numbered ${number.trim().toUpperCase()}. Check the number printed at the top of the receipt.`
      : lookup.error?.message;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) lookup.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent
        title="Find the bill"
        description="Returns are made against the original bill. Enter the number printed on the receipt."
      >
        <form onSubmit={submit}>
          <Field label="Bill number" error={error}>
            {(p) => (
              <Input
                {...p}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="S-26-000123"
                autoFocus
                className="font-medium tabular-nums uppercase"
              />
            )}
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={lookup.isPending} disabled={!number.trim()}>
              Find bill
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ReturnsPage() {
  useDocumentTitle('Returns');
  const { page, set } = useListParams({});
  const [findOpen, setFindOpen] = useState(false);
  const [sale, setSale] = useState<SaleDTO | null>(null);

  const returns = useQuery({
    queryKey: ['returns', page],
    queryFn: () => api.get<Paginated<ReturnDTO>>('/returns', { page, pageSize: 25 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Returns"
        description="Refunds issued against in-store bills, and whether the goods went back on the shelf."
        actions={
          <Button onClick={() => setFindOpen(true)}>
            <Plus /> New return
          </Button>
        }
      />

      {returns.isError && <ErrorState error={returns.error} onRetry={() => returns.refetch()} />}

      <Panel className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <Th>Return</Th>
              <Th>Date</Th>
              <Th>Bill</Th>
              <Th>Items</Th>
              <Th>Reason</Th>
              <Th>Processed by</Th>
              <Th className="text-right">Refund</Th>
            </tr>
          </thead>
          <tbody>
            {returns.isPending ? (
              <SkeletonRows cols={7} />
            ) : (
              returns.data?.items.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium tabular-nums">{r.number}</Td>
                  <Td className="whitespace-nowrap text-ink-soft">{formatDateTime(r.createdAt)}</Td>
                  <Td>
                    <Link
                      to={`/admin/sales/${r.sale.id}`}
                      className="text-peacock-600 tabular-nums hover:underline"
                    >
                      {r.sale.number}
                    </Link>
                  </Td>
                  <Td className="max-w-72">
                    <ul className="space-y-0.5">
                      {r.items.map((i) => (
                        <li key={i.productId} className="flex items-center gap-2">
                          <span className="truncate">
                            {i.quantity} × {i.name}
                          </span>
                          {!i.restock && <Badge tone="chilli">Written off</Badge>}
                        </li>
                      ))}
                    </ul>
                  </Td>
                  <Td className="max-w-56 text-ink-soft">
                    <span className="line-clamp-2">{r.reason}</span>
                  </Td>
                  <Td className="text-ink-soft">{r.processedBy.name}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <span className="font-medium tabular-nums">{formatINR(r.refundAmount)}</span>
                    <span className="block text-xs text-ink-faint">{label(r.refundMethod)}</span>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {returns.data && returns.data.items.length === 0 && (
          <EmptyState
            icon={<Undo2 />}
            title="No returns yet"
            action={
              <Button variant="secondary" onClick={() => setFindOpen(true)}>
                Record a return
              </Button>
            }
          >
            When a customer brings something back, find their bill and record the refund here.
          </EmptyState>
        )}
        {returns.data && (
          <Pagination
            page={returns.data.page}
            totalPages={returns.data.totalPages}
            total={returns.data.total}
            onPage={(p) => set({ page: p })}
          />
        )}
      </Panel>

      <FindBillDialog
        open={findOpen}
        onOpenChange={setFindOpen}
        onFound={(found) => {
          setFindOpen(false);
          setSale(found);
        }}
      />
      {sale && (
        <ReturnDialog
          key={sale.id}
          sale={sale}
          open
          onOpenChange={(open) => !open && setSale(null)}
        />
      )}
    </>
  );
}
