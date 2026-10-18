import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Undo2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { gstComponent, type SaleDTO } from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import { Badge, ErrorState, PageHeader, Panel, Skeleton } from '@/components/ui/display';
import { api, openFile } from '@/lib/api';
import { formatDate, formatINR, label } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { ReturnDialog } from './return-dialog';

function gstSummary(sale: SaleDTO) {
  const ratio = sale.subtotal === 0 ? 0 : sale.total / sale.subtotal;
  const byRate = new Map<number, { taxable: number; tax: number }>();
  for (const item of sale.items) {
    const net = Math.round(item.lineTotal * ratio);
    const tax = gstComponent(net, item.taxRate);
    const entry = byRate.get(item.taxRate) ?? { taxable: 0, tax: 0 };
    entry.taxable += net - tax;
    entry.tax += tax;
    byRate.set(item.taxRate, entry);
  }
  return [...byRate.entries()].filter(([rate]) => rate > 0).sort(([a], [b]) => a - b);
}

function ReceiptRow({ left, right, strong }: { left: string; right: string; strong?: boolean }) {
  return (
    <div
      className={
        strong ? 'flex justify-between gap-4 text-base font-semibold' : 'flex justify-between gap-4'
      }
    >
      <span>{left}</span>
      <span className="tabular-nums">{right}</span>
    </div>
  );
}

/** The bill as it printed at the counter. */
export function BillReceipt({ sale }: { sale: SaleDTO }) {
  const gst = gstSummary(sale);
  return (
    <div className="receipt px-6 font-mono text-[13px] leading-relaxed text-ink shadow-lift">
      <p className="text-center text-base font-semibold">QuickBill Mart</p>
      <p className="text-center text-ink-faint">Tax invoice</p>
      <div className="receipt-rule my-3" />
      <ReceiptRow
        left={`Bill ${sale.number}`}
        right={formatDate(sale.createdAt, { day: 'numeric', month: 'short', year: '2-digit' })}
      />
      <ReceiptRow
        left={`Cashier ${sale.cashier.name.split(' ')[0]}`}
        right={new Date(sale.createdAt).toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
        })}
      />
      {sale.customer && <ReceiptRow left={sale.customer.name} right={sale.customer.phone ?? ''} />}
      <div className="receipt-rule my-3" />
      <ul className="space-y-1.5">
        {sale.items.map((item) => (
          <li key={item.id}>
            <p className="truncate">{item.name}</p>
            <div className="flex justify-between gap-4 text-ink-soft">
              <span className="tabular-nums">
                {item.quantity} x {formatINR(item.unitPrice)}
                {item.returnedQty > 0 && (
                  <span className="ml-2 text-chilli-600">({item.returnedQty} returned)</span>
                )}
              </span>
              <span className="text-ink tabular-nums">{formatINR(item.lineTotal)}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="receipt-rule my-3" />
      <ReceiptRow left="Subtotal" right={formatINR(sale.subtotal)} />
      {sale.discount > 0 && (
        <ReceiptRow
          left={`Points redeemed (${sale.pointsRedeemed})`}
          right={`-${formatINR(sale.discount)}`}
        />
      )}
      <div className="-mx-6 my-2 bg-turmeric-300 px-6 py-1.5">
        <ReceiptRow left="Total" right={formatINR(sale.total)} strong />
      </div>
      <ReceiptRow
        left={`Paid by ${label(sale.paymentMethod)}`}
        right={sale.amountTendered !== null ? formatINR(sale.amountTendered) : ''}
      />
      {sale.changeDue !== null && <ReceiptRow left="Change" right={formatINR(sale.changeDue)} />}
      {gst.length > 0 && (
        <>
          <div className="receipt-rule my-3" />
          <p className="text-ink-faint">GST included in total</p>
          {gst.map(([rate, { taxable, tax }]) => (
            <ReceiptRow
              key={rate}
              left={`${rate}% on ${formatINR(taxable)}`}
              right={formatINR(tax)}
            />
          ))}
        </>
      )}
      <div className="receipt-rule my-3" />
      <p className="text-center text-ink-faint">Thank you, visit again</p>
    </div>
  );
}

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-ink-soft">{term}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export default function SaleDetailPage() {
  const { id = '' } = useParams();
  const [returnOpen, setReturnOpen] = useState(false);

  const sale = useQuery({
    queryKey: ['sale', id],
    queryFn: () => api.get<SaleDTO>(`/sales/${encodeURIComponent(id)}`),
  });
  useDocumentTitle(sale.data ? `Bill ${sale.data.number}` : 'Bill');

  const print = useMutation({
    mutationFn: () => openFile(`/sales/${encodeURIComponent(id)}/receipt.pdf`),
    onError: () => toast.error('Could not open the receipt PDF.'),
  });

  if (sale.isError) return <ErrorState error={sale.error} onRetry={() => sale.refetch()} />;

  const data = sale.data;
  const returnedUnits = data?.items.reduce((s, i) => s + i.returnedQty, 0) ?? 0;
  const canReturn = data?.items.some((i) => i.quantity - i.returnedQty > 0) ?? false;

  return (
    <>
      <Link
        to="/admin/sales"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" /> All bills
      </Link>
      <PageHeader
        title={data ? `Bill ${data.number}` : <Skeleton className="h-8 w-48" />}
        description={
          data ? formatDate(data.createdAt, { dateStyle: 'full', timeStyle: 'short' }) : undefined
        }
        actions={
          data && (
            <>
              <Button variant="secondary" onClick={() => print.mutate()} loading={print.isPending}>
                <Printer /> Print receipt
              </Button>
              <Button onClick={() => setReturnOpen(true)} disabled={!canReturn}>
                <Undo2 /> Start a return
              </Button>
            </>
          )
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div>{data ? <BillReceipt sale={data} /> : <Skeleton className="h-[520px] w-full" />}</div>

        <div className="space-y-6">
          <Panel className="px-5 py-2">
            <dl className="divide-y divide-line">
              <Detail term="Customer">
                {data?.customer ? (
                  <Link
                    to={`/admin/customers/${data.customer.id}`}
                    className="text-peacock-600 hover:underline"
                  >
                    {data.customer.name}
                  </Link>
                ) : (
                  <span className="font-normal text-ink-faint">Walk-in</span>
                )}
              </Detail>
              <Detail term="Cashier">{data?.cashier.name}</Detail>
              <Detail term="Payment">{data && <Badge>{label(data.paymentMethod)}</Badge>}</Detail>
              <Detail term="Items">
                <span className="tabular-nums">
                  {data?.items.reduce((s, i) => s + i.quantity, 0)} units, {data?.items.length}{' '}
                  lines
                </span>
              </Detail>
              <Detail term="GST included">
                <span className="tabular-nums">{data && formatINR(data.taxTotal)}</span>
              </Detail>
            </dl>
          </Panel>

          {data?.customer && (
            <Panel className="px-5 py-4">
              <h2 className="type-heading text-lg">Loyalty</h2>
              <p className="mt-1 text-ink-soft">
                {data.pointsEarned > 0
                  ? `${data.customer.name.split(' ')[0]} earned ${data.pointsEarned} points on this bill`
                  : 'No points were earned on this bill'}
                {data.pointsRedeemed > 0 &&
                  ` and redeemed ${data.pointsRedeemed} points for ${formatINR(data.discount)} off`}
                .
              </p>
            </Panel>
          )}

          {returnedUnits > 0 && data && (
            <Panel className="px-5 py-4">
              <h2 className="type-heading text-lg">Returned items</h2>
              <ul className="mt-2 space-y-1.5">
                {data.items
                  .filter((i) => i.returnedQty > 0)
                  .map((i) => (
                    <li key={i.id} className="flex justify-between gap-4 text-sm">
                      <span>{i.name}</span>
                      <span className="text-ink-soft tabular-nums">
                        {i.returnedQty} of {i.quantity}
                      </span>
                    </li>
                  ))}
              </ul>
              <Link
                to="/admin/returns"
                className="mt-3 inline-block text-sm text-peacock-600 hover:underline"
              >
                See all returns
              </Link>
            </Panel>
          )}
        </div>
      </div>

      {data && <ReturnDialog sale={data} open={returnOpen} onOpenChange={setReturnOpen} />}
    </>
  );
}
