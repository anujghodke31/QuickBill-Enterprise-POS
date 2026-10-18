import {
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  Contact,
  LayoutDashboard,
  type LucideIcon,
  Package,
  ReceiptIndianRupee,
  ScanLine,
  ScanBarcode,
  ShoppingBag,
  Sparkles,
  Truck,
  Undo2,
  UserCog,
} from 'lucide-react';
import type { Role } from '@quickbill/shared';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  /** Matches only the exact path (for index routes). */
  end?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const ALL: Role[] = ['ADMIN', 'MANAGER', 'CASHIER'];
const MGMT: Role[] = ['ADMIN', 'MANAGER'];

export const NAV: NavGroup[] = [
  {
    label: 'Today',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: MGMT, end: true },
      { to: '/admin/pos', label: 'Point of sale', icon: ScanBarcode, roles: ALL },
      { to: '/admin/copilot', label: 'Copilot', icon: Sparkles, roles: MGMT },
    ],
  },
  {
    label: 'Sell',
    items: [
      { to: '/admin/sales', label: 'Bills', icon: ReceiptIndianRupee, roles: ALL },
      { to: '/admin/orders', label: 'Online orders', icon: ShoppingBag, roles: ALL },
      { to: '/admin/returns', label: 'Returns', icon: Undo2, roles: ALL },
    ],
  },
  {
    label: 'Stock',
    items: [
      { to: '/admin/products', label: 'Products', icon: Package, roles: ALL },
      { to: '/admin/inventory', label: 'Inventory', icon: Boxes, roles: ALL },
      { to: '/admin/forecast', label: 'Reorder forecast', icon: ChartNoAxesCombined, roles: MGMT },
      { to: '/admin/purchasing', label: 'Purchase orders', icon: ClipboardList, roles: MGMT },
      { to: '/admin/bill-scan', label: 'Scan a bill', icon: ScanLine, roles: MGMT },
      { to: '/admin/suppliers', label: 'Suppliers', icon: Truck, roles: ALL },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/customers', label: 'Customers', icon: Contact, roles: ALL },
      { to: '/admin/staff', label: 'Staff', icon: UserCog, roles: ['ADMIN'] },
    ],
  },
];

export function navFor(role: Role): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter(
    (g) => g.items.length > 0,
  );
}
