import { Check } from 'lucide-react';
import type { OrderDTO, OrderStatus } from '@quickbill/shared';
import { Badge, type Tone } from '@/components/ui/display';
import { cn } from '@/lib/cn';
import { label } from '@/lib/format';

const STATUS_TONE: Record<OrderStatus, Tone> = {
  PENDING: 'turmeric',
  CONFIRMED: 'peacock',
  PACKED: 'peacock',
  SHIPPED: 'aubergine',
  DELIVERED: 'leaf',
  CANCELLED: 'chilli',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{label(status)}</Badge>;
}

const STEPS: { status: OrderStatus; title: string; detail: string }[] = [
  { status: 'PENDING', title: 'Order placed', detail: 'We have your order.' },
  { status: 'CONFIRMED', title: 'Confirmed', detail: 'The store has accepted it.' },
  { status: 'PACKED', title: 'Packed', detail: 'Your items are bagged and ready.' },
  { status: 'SHIPPED', title: 'Out for delivery', detail: 'A rider is on the way.' },
  { status: 'DELIVERED', title: 'Delivered', detail: 'Enjoy your groceries.' },
];

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return (
      <p className="rounded-xl border border-chilli-100 bg-chilli-50 px-4 py-3 text-chilli-700">
        This order was cancelled. Any online payment is refunded to the original method within 5–7
        working days.
      </p>
    );
  }
  const reached = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="relative grid gap-0 sm:grid-cols-5" aria-label="Order progress">
      {STEPS.map((step, i) => {
        const done = i <= reached;
        const current = i === reached;
        return (
          <li key={step.status} className="relative flex gap-3 pb-5 sm:flex-col sm:gap-2 sm:pb-0">
            {/* connector */}
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-7 left-[13px] h-[calc(100%-1.25rem)] w-0.5 sm:top-[13px] sm:left-7 sm:h-0.5 sm:w-[calc(100%-1.75rem)]',
                  i < reached ? 'bg-peacock-600' : 'bg-line',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold',
                done
                  ? 'border-peacock-600 bg-peacock-600 text-white'
                  : 'border-line-strong bg-surface text-ink-faint',
                current && 'ring-4 ring-peacock-500/15',
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <div className="sm:pr-3">
              <p className={cn('font-medium', done ? 'text-ink' : 'text-ink-faint')}>
                {step.title}
                {current && <span className="sr-only"> (current)</span>}
              </p>
              <p className="text-sm text-ink-faint">{step.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function orderItemCount(order: OrderDTO): number {
  return order.items.reduce((sum, i) => sum + i.quantity, 0);
}
