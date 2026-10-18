// Response shapes returned by the API. Money is integer paise; dates are ISO strings.
import type {
  OrderPaymentMethod,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PurchaseOrderSource,
  PurchaseOrderStatus,
  Role,
  StockReason,
} from './constants';
import type { ShippingAddress } from './schemas';

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDTO;
}

export interface StaffDTO extends UserDTO {
  isActive: boolean;
  createdAt: string;
  salesCount: number;
}

// ── Catalog ─────────────────────────────────────────────────────────────────

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  department: string;
  productCount: number;
}

export interface ProductDTO {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  slug: string;
  description: string;
  brand: string | null;
  unit: string;
  category: { id: string; name: string; slug: string };
  supplier: { id: string; name: string } | null;
  price: number;
  costPrice: number;
  compareAtPrice: number | null;
  taxRate: number;
  stock: number;
  reorderPoint: number;
  imageUrl: string | null;
  tags: string[];
  isPublished: boolean;
  expiryDate: string | null;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export type StockLevel = 'in' | 'low' | 'out';

/** Public product shape: no cost price, supplier or exact stock. */
export interface StoreProductDTO {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  unit: string;
  description: string;
  category: { name: string; slug: string; department: string };
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  tags: string[];
  ratingAvg: number;
  ratingCount: number;
  stockLevel: StockLevel;
}

export interface StoreSearchResult extends Paginated<StoreProductDTO> {
  /** How the results were found, surfaced in the UI for transparency. */
  mode: 'browse' | 'keyword' | 'hybrid';
}

export interface DepartmentDTO {
  name: string;
  categories: { name: string; slug: string; productCount: number }[];
}

export interface StockMovementDTO {
  id: string;
  product: { id: string; name: string; sku: string };
  delta: number;
  reason: StockReason;
  balanceAfter: number;
  note: string | null;
  user: { id: string; name: string } | null;
  createdAt: string;
}

// ── People ──────────────────────────────────────────────────────────────────

export interface CustomerDTO {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  lastVisitAt: string | null;
  createdAt: string;
}

export interface SupplierDTO {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  address: string | null;
  leadTimeDays: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
}

// ── Sales ───────────────────────────────────────────────────────────────────

export interface SaleItemDTO {
  id: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  taxRate: number;
  lineTotal: number;
  returnedQty: number;
}

export interface SaleDTO {
  id: string;
  number: string;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null } | null;
  cashier: { id: string; name: string };
  items: SaleItemDTO[];
  subtotal: number;
  discount: number;
  taxTotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountTendered: number | null;
  changeDue: number | null;
  pointsEarned: number;
  pointsRedeemed: number;
}

export interface SaleSummaryDTO {
  id: string;
  number: string;
  createdAt: string;
  customerName: string | null;
  cashierName: string;
  itemCount: number;
  total: number;
  paymentMethod: PaymentMethod;
}

export interface ReturnDTO {
  id: string;
  number: string;
  sale: { id: string; number: string };
  reason: string;
  refundAmount: number;
  refundMethod: PaymentMethod;
  processedBy: { id: string; name: string };
  createdAt: string;
  items: { productId: string; name: string; quantity: number; amount: number; restock: boolean }[];
}

// ── Online orders ───────────────────────────────────────────────────────────

export interface OrderItemDTO {
  productId: string;
  name: string;
  slug: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderDTO {
  id: string;
  number: string;
  status: OrderStatus;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: PaymentStatus;
  contact: { name: string; email: string; phone: string };
  shippingAddress: ShippingAddress;
  items: OrderItemDTO[];
  subtotal: number;
  shippingFee: number;
  taxTotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

// ── Purchasing ──────────────────────────────────────────────────────────────

export interface PurchaseOrderItemDTO {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  lineTotal: number;
}

export interface PurchaseOrderDTO {
  id: string;
  number: string;
  status: PurchaseOrderStatus;
  source: PurchaseOrderSource;
  supplier: { id: string; name: string };
  items: PurchaseOrderItemDTO[];
  subtotal: number;
  taxTotal: number;
  total: number;
  notes: string | null;
  supplierInvoiceNo: string | null;
  invoiceDate: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
  receivedAt: string | null;
}

// ── Analytics ───────────────────────────────────────────────────────────────

export interface KpiSnapshot {
  revenue: number;
  transactions: number;
  avgBasket: number;
  itemsSold: number;
  grossMargin: number;
}

export interface DashboardDTO {
  today: KpiSnapshot;
  yesterday: KpiSnapshot;
  last30: KpiSnapshot;
  revenueSeries: { date: string; pos: number; online: number }[];
  hourly: { hour: number; revenue: number; transactions: number }[];
  topProducts: { productId: string; name: string; units: number; revenue: number }[];
  categoryMix: { category: string; revenue: number }[];
  paymentMix: { method: string; revenue: number; count: number }[];
  lowStock: { id: string; name: string; stock: number; reorderPoint: number }[];
  lowStockCount: number;
  expiringCount: number;
  pendingOrders: number;
  recentSales: SaleSummaryDTO[];
}

// ── AI: forecasting ─────────────────────────────────────────────────────────

export type ForecastRisk = 'critical' | 'warning' | 'ok';

export interface ForecastRowDTO {
  productId: string;
  name: string;
  sku: string;
  category: string;
  supplier: { id: string; name: string; leadTimeDays: number } | null;
  stock: number;
  /** Units on open (ordered, not yet received) purchase orders. */
  onOrder: number;
  unitCost: number;
  avgDailyDemand: number;
  forecastDailyDemand: number;
  demandStdDev: number;
  /** Week-over-week change in demand, as a fraction (0.2 = +20%). */
  trend: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  daysOfCover: number | null;
  stockoutDate: string | null;
  suggestedQty: number;
  risk: ForecastRisk;
  /** Daily units sold for the last 28 days, oldest first. */
  history: number[];
  /** Forecast daily units for the next 14 days. */
  forecast: number[];
}

export interface ForecastSummaryDTO {
  generatedAt: string;
  horizonDays: number;
  serviceLevel: number;
  rows: ForecastRowDTO[];
  totals: { critical: number; warning: number; reorderValue: number };
}

// ── AI: bill scanning ───────────────────────────────────────────────────────

export interface BillScanCandidate {
  productId: string;
  name: string;
  sku: string;
  costPrice: number;
  taxRate: number;
  score: number;
}

export interface BillScanLineDTO {
  description: string;
  quantity: number;
  unit: string | null;
  unitCost: number;
  taxRate: number;
  amount: number;
  candidates: BillScanCandidate[];
  /** The best candidate when it is confident enough to pre-select. */
  suggestedProductId: string | null;
}

export interface BillScanDTO {
  id: string;
  status: 'EXTRACTED' | 'CONFIRMED' | 'FAILED';
  fileName: string;
  supplier: { name: string | null; gstin: string | null; matchedSupplierId: string | null };
  invoiceNumber: string | null;
  invoiceDate: string | null;
  lines: BillScanLineDTO[];
  totals: { subtotal: number | null; tax: number | null; total: number | null };
  warnings: string[];
  purchaseOrderId: string | null;
  createdAt: string;
}

// ── AI: copilot ─────────────────────────────────────────────────────────────

export interface ChartSpec {
  kind: 'bar' | 'line' | 'area' | 'pie';
  title: string;
  xKey: string;
  series: { key: string; label: string }[];
  data: Record<string, string | number>[];
  valueFormat: 'currency' | 'number' | 'percent';
}

export type CopilotEvent =
  | { type: 'conversation'; conversationId: string; title: string }
  | { type: 'text'; delta: string }
  | { type: 'tool_start'; id: string; name: string; label: string }
  | { type: 'tool_end'; id: string; name: string; ok: boolean }
  | { type: 'chart'; chart: ChartSpec }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface CopilotTurnDTO {
  role: 'user' | 'assistant';
  text: string;
  charts: ChartSpec[];
  tools: { name: string; label: string }[];
}

export interface CopilotConversationDTO {
  id: string;
  title: string;
  updatedAt: string;
  turns: CopilotTurnDTO[];
}

export interface AiStatusDTO {
  /** Claude-backed features (copilot, bill scan, forecast briefings). */
  llm: boolean;
  model: string | null;
  /** Local embedding model used by semantic search. */
  embeddings: boolean;
}
