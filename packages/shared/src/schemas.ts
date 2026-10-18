import { z } from 'zod';
import {
  GST_RATES,
  ORDER_PAYMENT_METHODS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PURCHASE_ORDER_STATUSES,
  STAFF_ROLES,
} from './constants';

// ── Primitives ──────────────────────────────────────────────────────────────

const id = z.string().min(1).max(64);
const paise = z.number().int().min(0).max(100_000_000_00);
const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    // An empty field means 'clear this value'.
    .transform((v) => (v === '' ? null : v));

export const indianPhone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number');

export const gstin = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/, 'Enter a valid 15-character GSTIN');

export const gstRate = z
  .number()
  .int()
  .refine((v) => (GST_RATES as readonly number[]).includes(v), 'GST rate must be 0, 5, 18 or 40');

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// ── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

export const registerSchema = z.object({
  name: trimmed(80).min(2, 'Enter your name'),
  email: z.email().trim().toLowerCase(),
  password: passwordSchema,
  phone: indianPhone.optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// ── Staff ───────────────────────────────────────────────────────────────────

export const staffCreateSchema = z.object({
  name: trimmed(80).min(2),
  email: z.email().trim().toLowerCase(),
  role: z.enum(STAFF_ROLES),
  password: passwordSchema,
});
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;

export const staffUpdateSchema = z.object({
  name: trimmed(80).min(2).optional(),
  role: z.enum(STAFF_ROLES).optional(),
  isActive: z.boolean().optional(),
  password: passwordSchema.optional(),
});
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;

// ── Catalog ─────────────────────────────────────────────────────────────────

export const productInputSchema = z.object({
  name: trimmed(160).min(2),
  sku: trimmed(40).min(2).optional(),
  barcode: optionalText(32),
  description: trimmed(4000).default(''),
  brand: optionalText(80),
  unit: trimmed(30).default('1 pc'),
  categoryId: id,
  supplierId: id.optional().nullable(),
  price: paise.min(1, 'Price must be above zero'),
  costPrice: paise.default(0),
  compareAtPrice: paise.optional().nullable(),
  taxRate: gstRate.default(0),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  reorderPoint: z.number().int().min(0).max(100_000).default(10),
  imageUrl: z.url().max(1000).optional().nullable(),
  tags: z.array(trimmed(40).min(1)).max(20).default([]),
  isPublished: z.boolean().default(true),
  expiryDate: z.coerce.date().optional().nullable(),
});
export type ProductInput = z.input<typeof productInputSchema>;

/** Stock is changed through adjustments, never by editing the product. */
export const productUpdateSchema = productInputSchema.omit({ stock: true }).partial();
export type ProductUpdateInput = z.input<typeof productUpdateSchema>;

export const productListQuery = paginationQuery.extend({
  q: trimmed(100).optional(),
  categoryId: id.optional(),
  supplierId: id.optional(),
  status: z.enum(['all', 'low', 'out', 'expiring', 'unpublished']).default('all'),
  sort: z.enum(['name', 'stock', 'price', 'updated']).default('name'),
});
export type ProductListQuery = z.infer<typeof productListQuery>;

export const categoryInputSchema = z.object({
  name: trimmed(60).min(2),
  department: trimmed(60).min(2),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const stockAdjustmentSchema = z.object({
  productId: id,
  delta: z
    .number()
    .int()
    .refine((v) => v !== 0, 'Adjustment cannot be zero'),
  note: trimmed(200).min(3, 'Add a short reason'),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

// ── Storefront ──────────────────────────────────────────────────────────────

export const storefrontQuery = paginationQuery.extend({
  q: trimmed(120).optional(),
  category: trimmed(80).optional(),
  department: trimmed(80).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['relevance', 'newest', 'price_asc', 'price_desc', 'rating']).default('relevance'),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});
export type StorefrontQuery = z.infer<typeof storefrontQuery>;

// ── Customers & suppliers ───────────────────────────────────────────────────

export const customerInputSchema = z.object({
  name: trimmed(80).min(2),
  phone: indianPhone.optional(),
  email: z.email().trim().toLowerCase().optional(),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;

export const supplierInputSchema = z.object({
  name: trimmed(120).min(2),
  contactName: optionalText(80),
  email: z.email().trim().toLowerCase().optional(),
  phone: optionalText(20),
  gstin: gstin.optional(),
  address: optionalText(300),
  leadTimeDays: z.number().int().min(1).max(60).default(3),
  isActive: z.boolean().default(true),
});
export type SupplierInput = z.input<typeof supplierInputSchema>;

// ── POS sales & returns ─────────────────────────────────────────────────────

export const cartLineSchema = z.object({
  productId: id,
  quantity: z.number().int().min(1).max(999),
});

export const checkoutSchema = z
  .object({
    items: z.array(cartLineSchema).min(1, 'Cart is empty').max(200),
    customerId: id.optional(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    amountTendered: paise.optional(),
    redeemPoints: z.number().int().min(0).default(0),
    /** Lets a client retry a checkout safely after a network error. */
    idempotencyKey: z.string().min(8).max(64).optional(),
  })
  .refine((v) => v.paymentMethod !== 'CASH' || v.amountTendered !== undefined, {
    message: 'Enter the cash received',
    path: ['amountTendered'],
  })
  .refine((v) => v.redeemPoints === 0 || v.customerId !== undefined, {
    message: 'Select a customer to redeem points',
    path: ['redeemPoints'],
  });
export type CheckoutInput = z.input<typeof checkoutSchema>;

export const returnInputSchema = z.object({
  saleId: id,
  items: z
    .array(
      z.object({
        saleItemId: id,
        quantity: z.number().int().min(1),
        restock: z.boolean().default(true),
      }),
    )
    .min(1),
  reason: trimmed(300).min(3, 'Add a reason for the return'),
  refundMethod: z.enum(PAYMENT_METHODS),
});
export type ReturnInput = z.input<typeof returnInputSchema>;

// ── Online orders ───────────────────────────────────────────────────────────

export const shippingAddressSchema = z.object({
  line1: trimmed(160).min(3),
  line2: optionalText(160),
  city: trimmed(60).min(2),
  state: trimmed(60).min(2),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, 'Enter a 6-digit PIN code'),
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const placeOrderSchema = z.object({
  items: z.array(cartLineSchema).min(1, 'Your cart is empty').max(100),
  contact: z.object({
    name: trimmed(80).min(2),
    email: z.email().trim().toLowerCase(),
    phone: indianPhone,
  }),
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(ORDER_PAYMENT_METHODS),
});
export type PlaceOrderInput = z.input<typeof placeOrderSchema>;

export const orderLookupSchema = z.object({
  number: trimmed(30).min(3),
  email: z.email().trim().toLowerCase(),
});
export type OrderLookupInput = z.infer<typeof orderLookupSchema>;

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

// ── Purchasing ──────────────────────────────────────────────────────────────

export const purchaseOrderItemSchema = z.object({
  productId: id,
  quantity: z.number().int().min(1).max(100_000),
  unitCost: paise,
  taxRate: gstRate.default(0),
});

export const purchaseOrderInputSchema = z.object({
  supplierId: id,
  items: z.array(purchaseOrderItemSchema).min(1).max(300),
  notes: optionalText(500),
  supplierInvoiceNo: optionalText(60),
  invoiceDate: z.coerce.date().optional(),
});
export type PurchaseOrderInput = z.input<typeof purchaseOrderInputSchema>;

export const purchaseOrderStatusSchema = z.object({
  status: z.enum(PURCHASE_ORDER_STATUSES),
});

// ── AI ──────────────────────────────────────────────────────────────────────

export const copilotMessageSchema = z.object({
  message: trimmed(2000).min(1),
});

/** A bill-scan line after the user has reviewed and matched it. */
export const billScanConfirmSchema = z.object({
  supplierId: id,
  supplierInvoiceNo: optionalText(60),
  invoiceDate: z.coerce.date().optional(),
  lines: z
    .array(
      z.discriminatedUnion('action', [
        z.object({
          action: z.literal('match'),
          productId: id,
          quantity: z.number().int().min(1),
          unitCost: paise,
          taxRate: gstRate.default(0),
        }),
        z.object({
          action: z.literal('create'),
          name: trimmed(160).min(2),
          categoryId: id,
          quantity: z.number().int().min(1),
          unitCost: paise,
          price: paise.min(1),
          taxRate: gstRate.default(0),
        }),
        z.object({ action: z.literal('skip') }),
      ]),
    )
    .min(1),
});
export type BillScanConfirmInput = z.input<typeof billScanConfirmSchema>;
