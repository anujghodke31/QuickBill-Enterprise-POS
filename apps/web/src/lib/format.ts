import { formatINR } from '@quickbill/shared';

export { formatINR };

/** Rupees without paise for large, glanceable figures: ₹1,23,457. */
export function formatRupees(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(paise / 100));
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(n);
}

export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function formatDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
) {
  return new Intl.DateTimeFormat('en-IN', opts).format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  );
}

const relative = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' });

export function formatRelative(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return 'just now';
  if (abs < 3600) return relative.format(Math.round(diff / 60), 'minute');
  if (abs < 86_400) return relative.format(Math.round(diff / 3600), 'hour');
  if (abs < 86_400 * 30) return relative.format(Math.round(diff / 86_400), 'day');
  return formatDate(iso);
}

/** Percentage change between two values, or null when there is no baseline. */
export function change(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / previous;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
  FAILED: 'Failed',
  DRAFT: 'Draft',
  ORDERED: 'Ordered',
  RECEIVED: 'Received',
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
  COD: 'Cash on delivery',
  ONLINE: 'Paid online',
  ONLINE_PREPAID: 'Online, prepaid',
  ONLINE_COD: 'Online, COD',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
  CUSTOMER: 'Customer',
  INITIAL: 'Opening stock',
  SALE: 'Sale',
  RETURN: 'Return',
  PURCHASE: 'Received',
  ADJUSTMENT: 'Adjustment',
  ONLINE_ORDER: 'Online order',
  ORDER_CANCEL: 'Order cancelled',
  MANUAL: 'Manual',
  FORECAST: 'Forecast',
  BILL_SCAN: 'Bill scan',
};

export function label(value: string): string {
  return STATUS_LABELS[value] ?? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
}
