import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Contact, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { CustomerDTO, Paginated } from '@quickbill/shared';
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
import { Segmented } from '@/components/ui/form';
import { api } from '@/lib/api';
import { formatINR, formatNumber, formatRelative } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { rowLinkClass, SearchField, SkeletonRows, useListParams } from '../sales/list-params';
import { CustomerDialog } from './customer-dialog';

type Sort = 'recent' | 'spend' | 'name' | 'points';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'Recent visits' },
  { value: 'spend', label: 'Top spenders' },
  { value: 'points', label: 'Most points' },
  { value: 'name', label: 'Name' },
];

export default function CustomersPage() {
  useDocumentTitle('Customers');
  const navigate = useNavigate();
  const { values, page, set } = useListParams({ q: '', sort: 'recent' as Sort });
  const [adding, setAdding] = useState(false);

  const customers = useQuery({
    queryKey: ['customers', values, page],
    queryFn: () =>
      api.get<Paginated<CustomerDTO>>('/customers', {
        q: values.q,
        sort: values.sort,
        page,
        pageSize: 25,
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Shoppers known by phone or email, in store and online, with their loyalty points."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus /> Add customer
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchField
          value={values.q}
          onChange={(q) => set({ q })}
          placeholder="Name, phone or email"
        />
        <div className="max-w-full relative overflow-x-auto">
          <Segmented value={values.sort} options={SORTS} onChange={(sort) => set({ sort })} />
        </div>
      </div>

      {customers.isError && (
        <ErrorState error={customers.error} onRetry={() => customers.refetch()} />
      )}

      <Panel className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Phone</Th>
              <Th className="text-right">Visits</Th>
              <Th className="text-right">Points</Th>
              <Th className="text-right">Total spent</Th>
              <Th>Last visit</Th>
            </tr>
          </thead>
          <tbody>
            {customers.isPending ? (
              <SkeletonRows cols={6} />
            ) : (
              customers.data?.items.map((c) => (
                <tr
                  key={c.id}
                  className={rowLinkClass}
                  onClick={() => navigate(`/admin/customers/${c.id}`)}
                >
                  <Td>
                    <Link
                      to={`/admin/customers/${c.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block font-medium hover:text-peacock-600"
                    >
                      {c.name}
                    </Link>
                    {c.email && <span className="block text-xs text-ink-faint">{c.email}</span>}
                  </Td>
                  <Td className="text-ink-soft tabular-nums">{c.phone ?? ''}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(c.visitCount)}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(c.loyaltyPoints)}</Td>
                  <Td className="text-right font-medium tabular-nums">{formatINR(c.totalSpent)}</Td>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {c.lastVisitAt ? (
                      formatRelative(c.lastVisitAt)
                    ) : (
                      <span className="text-ink-faint">Never</span>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {customers.data && customers.data.items.length === 0 && (
          <EmptyState
            icon={<Contact />}
            title={values.q ? `No customers match “${values.q}”` : 'No customers yet'}
            action={
              <Button variant="secondary" onClick={() => setAdding(true)}>
                Add customer
              </Button>
            }
          >
            Customers are added at the till by phone number, or when they shop online.
          </EmptyState>
        )}
        {customers.data && (
          <Pagination
            page={customers.data.page}
            totalPages={customers.data.totalPages}
            total={customers.data.total}
            onPage={(p) => set({ page: p })}
          />
        )}
      </Panel>

      <CustomerDialog
        open={adding}
        onOpenChange={setAdding}
        onSaved={(c) => navigate(`/admin/customers/${c.id}`)}
      />
    </>
  );
}
