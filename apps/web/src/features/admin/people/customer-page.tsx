import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Mail, Pencil, Phone, ReceiptIndianRupee } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { LOYALTY, type CustomerDTO, type SaleSummaryDTO } from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Skeleton,
  Table,
  Td,
  Th,
} from '@/components/ui/display';
import { api } from '@/lib/api';
import {
  formatDate,
  formatDateTime,
  formatINR,
  formatNumber,
  formatRelative,
  label,
} from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { rowLinkClass } from '../sales/list-params';
import { CustomerDialog } from './customer-dialog';

type CustomerDetail = CustomerDTO & { recentSales: SaleSummaryDTO[] };

function Figure({ term, value, note }: { term: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="text-sm text-ink-soft">{term}</dt>
      <dd className="type-heading mt-1 text-2xl tabular-nums">{value}</dd>
      {note && <dd className="mt-0.5 text-sm text-ink-faint">{note}</dd>}
    </div>
  );
}

export default function CustomerPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const customer = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<CustomerDetail>(`/customers/${id}`),
  });
  useDocumentTitle(customer.data?.name ?? 'Customer');

  if (customer.isError)
    return <ErrorState error={customer.error} onRetry={() => customer.refetch()} />;
  const c = customer.data;
  const avgBill = c && c.visitCount > 0 ? Math.round(c.totalSpent / c.visitCount) : null;

  return (
    <>
      <Link
        to="/admin/customers"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" /> All customers
      </Link>
      <PageHeader
        title={c ? c.name : <Skeleton className="h-8 w-56" />}
        description={
          c
            ? `Customer since ${formatDate(c.createdAt, { month: 'long', year: 'numeric' })}`
            : undefined
        }
        actions={
          c && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil /> Edit details
            </Button>
          )
        }
      />

      {c ? (
        <>
          <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-ink-soft">
            {c.phone && (
              <a href={`tel:${c.phone}`} className="inline-flex items-center gap-2 hover:text-ink">
                <Phone className="size-4 text-ink-faint" />
                <span className="tabular-nums">{c.phone}</span>
              </a>
            )}
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="inline-flex items-center gap-2 hover:text-ink"
              >
                <Mail className="size-4 text-ink-faint" />
                {c.email}
              </a>
            )}
            {!c.phone && !c.email && <span>No contact details on file.</span>}
          </div>

          <Panel className="mb-8">
            <dl className="grid gap-px overflow-hidden rounded-2xl bg-line sm:grid-cols-2 lg:grid-cols-4">
              <Figure
                term="Total spent"
                value={formatINR(c.totalSpent)}
                note={avgBill !== null ? `${formatINR(avgBill)} per visit` : undefined}
              />
              <Figure term="Visits to the store" value={formatNumber(c.visitCount)} />
              <Figure
                term="Loyalty points"
                value={formatNumber(c.loyaltyPoints)}
                note={`Worth ${formatINR(c.loyaltyPoints * LOYALTY.pointValuePaise)} at the till`}
              />
              <Figure
                term="Last visit"
                value={c.lastVisitAt ? formatRelative(c.lastVisitAt) : 'Never'}
                note={c.lastVisitAt ? formatDate(c.lastVisitAt) : undefined}
              />
            </dl>
          </Panel>
        </>
      ) : (
        <Skeleton className="mb-8 h-28 w-full rounded-2xl" />
      )}

      <h2 className="type-heading mb-3 text-xl">Recent bills</h2>
      <Panel className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <Th>Bill</Th>
              <Th>Date</Th>
              <Th>Cashier</Th>
              <Th className="text-right">Items</Th>
              <Th>Payment</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {c?.recentSales.map((s) => (
              <tr
                key={s.id}
                className={rowLinkClass}
                onClick={() => navigate(`/admin/sales/${s.id}`)}
              >
                <Td>
                  <Link
                    to={`/admin/sales/${s.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium tabular-nums hover:text-peacock-600"
                  >
                    {s.number}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">{formatDateTime(s.createdAt)}</Td>
                <Td className="text-ink-soft">{s.cashierName}</Td>
                <Td className="text-right tabular-nums">{s.itemCount}</Td>
                <Td>
                  <Badge>{label(s.paymentMethod)}</Badge>
                </Td>
                <Td className="text-right font-medium tabular-nums">{formatINR(s.total)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {c && c.recentSales.length === 0 && (
          <EmptyState icon={<ReceiptIndianRupee />} title="No bills yet">
            In-store bills for {c.name.split(' ')[0]} will appear here once they are rung up with
            this customer selected.
          </EmptyState>
        )}
      </Panel>

      {c && <CustomerDialog customer={c} open={editing} onOpenChange={setEditing} />}
    </>
  );
}
