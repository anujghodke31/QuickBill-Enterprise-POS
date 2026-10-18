import type { ComponentType } from 'react';
import { createBrowserRouter, Link, useRouteError } from 'react-router';
import { Button } from '@/components/ui/button';
import { RequireAuth, RequireStaff } from './guards';

/** Code-splits each page: `lazy: page(() => import('./x'))` where the module default-exports a component. */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

function RouteError() {
  const error = useRouteError() as { status?: number; message?: string } | undefined;
  // The catch-all route renders this without an error, which also means "not found".
  const notFound = !error || error.status === 404;
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="type-display text-7xl text-peacock-600">{notFound ? '404' : 'Oops'}</p>
        <h1 className="type-heading mt-4 text-2xl">
          {notFound ? 'This page does not exist' : 'This page failed to load'}
        </h1>
        <p className="mt-2 text-ink-soft">
          {notFound
            ? 'Check the address, or head back to the shop.'
            : 'Reload the page. If it keeps happening, the app may have been updated.'}
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Go to the shop</Link>
        </Button>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: '/login', lazy: page(() => import('@/features/auth/login-page')) },
  { path: '/register', lazy: page(() => import('@/features/auth/register-page')) },
  {
    path: '/',
    lazy: page(() => import('@/features/shop/shop-layout')),
    errorElement: <RouteError />,
    children: [
      { index: true, lazy: page(() => import('@/features/shop/home-page')) },
      { path: 'search', lazy: page(() => import('@/features/shop/search-page')) },
      { path: 'p/:slug', lazy: page(() => import('@/features/shop/product-page')) },
      { path: 'cart', lazy: page(() => import('@/features/shop/cart-page')) },
      { path: 'checkout', lazy: page(() => import('@/features/shop/checkout-page')) },
      { path: 'orders/:number', lazy: page(() => import('@/features/shop/order-page')) },
      { path: 'track', lazy: page(() => import('@/features/shop/track-page')) },
      {
        path: 'account',
        lazy: async () => {
          const { default: AccountPage } = await import('@/features/shop/account-page');
          return {
            Component: () => (
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            ),
          };
        },
      },
    ],
  },
  {
    path: '/admin',
    errorElement: <RouteError />,
    lazy: async () => {
      const { default: AdminLayout } = await import('@/features/admin/layout/admin-layout');
      return {
        Component: () => (
          <RequireStaff>
            <AdminLayout />
          </RequireStaff>
        ),
      };
    },
    children: [
      { index: true, lazy: page(() => import('@/features/admin/dashboard/dashboard-page')) },
      { path: 'pos', lazy: page(() => import('@/features/admin/pos/pos-page')) },
      { path: 'sales', lazy: page(() => import('@/features/admin/sales/sales-page')) },
      { path: 'sales/:id', lazy: page(() => import('@/features/admin/sales/sale-detail-page')) },
      { path: 'returns', lazy: page(() => import('@/features/admin/sales/returns-page')) },
      { path: 'orders', lazy: page(() => import('@/features/admin/orders/orders-page')) },
      { path: 'products', lazy: page(() => import('@/features/admin/catalog/products-page')) },
      {
        path: 'products/new',
        lazy: page(() => import('@/features/admin/catalog/product-form-page')),
      },
      {
        path: 'products/:id',
        lazy: page(() => import('@/features/admin/catalog/product-form-page')),
      },
      { path: 'inventory', lazy: page(() => import('@/features/admin/catalog/inventory-page')) },
      {
        path: 'purchasing',
        lazy: page(() => import('@/features/admin/purchasing/purchase-orders-page')),
      },
      {
        path: 'purchasing/:id',
        lazy: page(() => import('@/features/admin/purchasing/purchase-order-page')),
      },
      { path: 'suppliers', lazy: page(() => import('@/features/admin/purchasing/suppliers-page')) },
      { path: 'customers', lazy: page(() => import('@/features/admin/people/customers-page')) },
      { path: 'customers/:id', lazy: page(() => import('@/features/admin/people/customer-page')) },
      { path: 'staff', lazy: page(() => import('@/features/admin/people/staff-page')) },
      { path: 'forecast', lazy: page(() => import('@/features/admin/ai/forecast-page')) },
      { path: 'bill-scan', lazy: page(() => import('@/features/admin/ai/bill-scan-page')) },
      { path: 'copilot', lazy: page(() => import('@/features/admin/ai/copilot-page')) },
      { path: 'copilot/:id', lazy: page(() => import('@/features/admin/ai/copilot-page')) },
    ],
  },
  { path: '*', element: <RouteError /> },
]);
