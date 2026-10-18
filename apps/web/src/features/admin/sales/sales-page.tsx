import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ReceiptIndianRupee, ScanBarcode } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import type { Paginated, PaymentMethod, SaleSummaryDTO } from '@quickbill/shared';
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
import { Input, Segmented } from '@/components/ui/form';
import { api } from '@/lib/api';
import { formatDateTime, formatINR, label } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { dayBoundary, rowLinkClass, SearchField, SkeletonRows, useListParams } from './list-params';

const PAYMENT_FILTERS: { value: '' | PaymentMethod; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
];

export default function SalesPage() {
  useDocumentTitle('Bills');
  const navigate = useNavigate();
  const { values, page, set } = useListParams({ q: '', from: '', to: '', payment: '' });

  const sales = useQuery({
    queryKey: ['sales', values, page],
    queryFn: () =>
      api.get<Paginated<SaleSummaryDTO>>('/sales', {
        q: values.q,
        from: dayBoundary(values.from, 'start'),
        to: dayBoundary(values.to, 'end'),
        paymentMethod: values.payment,
        page,
        pageSize: 25,
      }),
    placeholderData: keepPreviousData,
  });

  const filtered = values.q || values.from || values.to || values.payment;

  return (
    <>
      <PageHeader
        title="Bills"
        description="Every sale rung up at the counter, newest first."
        actions={
          <Button asChild>
            <Link to="/admin/pos">
              <ScanBarcode /> Open the till
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchField
          value={values.q}
          onChange={(q) => set({ q })}
          placeholder="Bill number, customer or phone"
        />
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <label className="sr-only" htmlFor="sales-from">
            From date
          </label>
          <Input
            id="sales-from"
            type="date"
            value={values.from}
            max={values.to || undefined}
            onChange={(e) => set({ from: e.target.value })}
            className="w-40"
          />
          <span aria-hidden>to</span>
          <label className="sr-only" htmlFor="sales-to">
            To date
          </label>
          <Input
            id="sales-to"
            type="date"
            value={values.to}
            min={values.from || undefined}
            onChange={(e) => set({ to: e.target.value })}
            className="w-40"
          />
        </div>
        <Segmented
          value={values.payment as '' | PaymentMethod}
          options={PAYMENT_FILTERS}
          onChange={(payment) => set({ payment })}
        />
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => set({ q: '', from: '', to: '', payment: '' })}
          >
            Clear filters
          </Button>
        )}
      </div>

      {sales.isError && <ErrorState error={sales.error} onRetry={() => sales.refetch()} />}

      <Panel className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <Th>Bill</Th>
              <Th>Time</Th>
              <Th>Customer</Th>
              <Th>Cashier</Th>
              <Th className="text-right">Items</Th>
              <Th>Payment</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {sales.isPending ? (
              <SkeletonRows cols={7} />
            ) : (
              sales.data?.items.map((sale) => (
                <tr
                  key={sale.id}
                  className={rowLinkClass}
                  onClick={() => navigate(`/admin/sales/${sale.id}`)}
                >
                  <Td>
                    <Link
                      to={`/admin/sales/${sale.id}`}
                      className="font-medium text-ink tabular-nums hover:text-peacock-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {sale.number}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {formatDateTime(sale.createdAt)}
                  </Td>
                  <Td>{sale.customerName ?? <span className="text-ink-faint">Walk-in</span>}</Td>
                  <Td className="text-ink-soft">{sale.cashierName}</Td>
                  <Td className="text-right tabular-nums">{sale.itemCount}</Td>
                  <Td>
                    <Badge>{label(sale.paymentMethod)}</Badge>
                  </Td>
                  <Td className="text-right font-medium tabular-nums">{formatINR(sale.total)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {sales.data && sales.data.items.length === 0 && (
          <EmptyState
            icon={<ReceiptIndianRupee />}
            title={filtered ? 'No bills match these filters' : 'No bills yet'}
          >
            {filtered
              ? 'Try a different bill number, customer or date range.'
              : 'Bills appear here as soon as the first sale is rung up at the till.'}
          </EmptyState>
        )}
        {sales.data && (
          <Pagination
            page={sales.data.page}
            totalPages={sales.data.totalPages}
            total={sales.data.total}
            onPage={(p) => set({ page: p })}
          />
        )}
      </Panel>
    </>
  );
}
