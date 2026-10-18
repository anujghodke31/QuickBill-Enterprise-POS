import type { PurchaseOrderSource, PurchaseOrderStatus } from '@quickbill/shared';
import { Badge, type Tone } from '@/components/ui/display';
import { label } from '@/lib/format';

export const PO_STATUS_TONES: Record<PurchaseOrderStatus, Tone> = {
  DRAFT: 'neutral',
  ORDERED: 'turmeric',
  RECEIVED: 'leaf',
  CANCELLED: 'chilli',
};

const SOURCE_TONES: Record<PurchaseOrderSource, Tone> = {
  MANUAL: 'neutral',
  FORECAST: 'aubergine',
  BILL_SCAN: 'peacock',
};

export function SourceBadge({ source }: { source: PurchaseOrderSource }) {
  return <Badge tone={SOURCE_TONES[source]}>{label(source)}</Badge>;
}

export function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return <Badge tone={PO_STATUS_TONES[status]}>{label(status)}</Badge>;
}
