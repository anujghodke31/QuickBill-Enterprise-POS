export const ROLES = ['ADMIN', 'MANAGER', 'CASHIER', 'CUSTOMER'] as const;
export type Role = (typeof ROLES)[number];

/** Roles that can sign in to the back office. */
export const STAFF_ROLES = ['ADMIN', 'MANAGER', 'CASHIER'] as const satisfies readonly Role[];
export type StaffRole = (typeof STAFF_ROLES)[number];

export const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ORDER_PAYMENT_METHODS = ['COD', 'ONLINE'] as const;
export type OrderPaymentMethod = (typeof ORDER_PAYMENT_METHODS)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Allowed forward transitions for an online order. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'REFUNDED', 'FAILED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PURCHASE_ORDER_STATUSES = ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const PURCHASE_ORDER_SOURCES = ['MANUAL', 'FORECAST', 'BILL_SCAN'] as const;
export type PurchaseOrderSource = (typeof PURCHASE_ORDER_SOURCES)[number];

export const STOCK_REASONS = [
  'INITIAL',
  'SALE',
  'RETURN',
  'PURCHASE',
  'ADJUSTMENT',
  'ONLINE_ORDER',
  'ORDER_CANCEL',
] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

/**
 * Indian GST slabs in percent, as simplified by the GST 2.0 reform (Sept 2025):
 * nil, 5% merit, 18% standard and 40% for sin and luxury goods.
 * Prices in QuickBill are GST-inclusive (MRP style).
 */
export const GST_RATES = [0, 5, 18, 40] as const;
export type GstRate = (typeof GST_RATES)[number];

/** 1 loyalty point is earned per ₹100 spent and is worth ₹1 when redeemed. */
export const LOYALTY = {
  earnPerPaise: 10_000,
  pointValuePaise: 100,
  /** Redemption can cover at most this share of a bill. */
  maxRedeemShare: 0.5,
} as const;

/** Orders at or above this subtotal ship free; below it a flat fee applies. */
export const SHIPPING = {
  freeAbovePaise: 49_900,
  flatFeePaise: 4_000,
} as const;
