import { useMutation } from '@tanstack/react-query';
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Package,
  ShoppingBasket,
  UserRound,
} from 'lucide-react';
import { Dialog as D } from 'radix-ui';
import { useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  ScrollRestoration,
  useNavigate,
  useSearchParams,
} from 'react-router';
import { departmentStyle } from '@/components/packshot';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
  SheetContent,
} from '@/components/ui/overlay';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { isStaff, useAuth } from '@/stores/auth';
import { cartCount, useCart } from '@/stores/cart';
import { useDepartments } from './components/queries';
import { SearchBox } from './components/search-box';
import { ShopMark } from './components/shop-mark';

function AccountMenu() {
  const user = useAuth((s) => s.user);
  const status = useAuth((s) => s.status);
  const clear = useAuth((s) => s.clear);
  const navigate = useNavigate();
  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      clear();
      navigate('/');
    },
  });

  if (status === 'loading') return <span className="h-9 w-20" aria-hidden />;
  if (!user) {
    return (
      <Link
        to="/login"
        className="flex h-10 items-center gap-2 rounded-lg px-3 text-[15px] font-medium text-ink hover:bg-ink/[0.04]"
      >
        <UserRound className="size-5 text-ink-soft" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }
  return (
    <Menu>
      <MenuTrigger className="flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[15px] font-medium hover:bg-ink/[0.04]">
        <UserRound className="size-5 text-ink-soft" />
        <span className="hidden max-w-28 truncate sm:inline">{user.name.split(' ')[0]}</span>
        <ChevronDown className="size-4 text-ink-faint" />
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>{user.email}</MenuLabel>
        <MenuItem asChild>
          <Link to="/account">
            <Package /> Your orders
          </Link>
        </MenuItem>
        {isStaff(user) && (
          <MenuItem asChild>
            <Link to={user.role === 'CASHIER' ? '/admin/pos' : '/admin'}>
              <LayoutDashboard /> Back office
            </Link>
          </MenuItem>
        )}
        <MenuSeparator />
        <MenuItem onSelect={() => logout.mutate()}>
          <LogOut /> Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function CartButton() {
  const count = useCart((s) => cartCount(s.lines));
  return (
    <Link
      to="/cart"
      className="relative flex h-10 items-center gap-2 rounded-lg bg-peacock-600 px-3 text-[15px] font-semibold text-white hover:bg-peacock-700"
      aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
    >
      <ShoppingBasket className="size-5" />
      <span className="hidden sm:inline">Cart</span>
      {count > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-turmeric-500 px-1 text-xs font-bold text-ink tabular-nums">
          {count}
        </span>
      )}
    </Link>
  );
}

function AisleNav() {
  const { data } = useDepartments();
  const [params] = useSearchParams();
  const active = params.get('department');
  if (!data) return <div className="h-11" />;
  return (
    <nav
      aria-label="Aisles"
      className="-mx-1 flex gap-1 relative overflow-x-auto py-1.5 [scrollbar-width:none]"
    >
      {data.map((d) => (
        <NavLink
          key={d.name}
          to={`/search?department=${encodeURIComponent(d.name)}`}
          className={cn(
            'flex h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 text-sm text-ink-soft hover:bg-ink/[0.04] hover:text-ink',
            active === d.name && 'bg-ink/[0.05] font-medium text-ink',
          )}
        >
          <span
            className="size-2 rounded-full"
            style={{ background: departmentStyle(d.name).pack }}
          />
          {d.name}
        </NavLink>
      ))}
    </nav>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { data } = useDepartments();
  const close = () => setOpen(false);
  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Trigger
        className="grid size-10 place-items-center rounded-lg text-ink-soft hover:bg-ink/[0.04] lg:hidden"
        aria-label="Browse aisles"
      >
        <MenuIcon className="size-5" />
      </D.Trigger>
      <SheetContent title="Browse aisles" side="left" className="max-w-xs">
        <div className="space-y-6 p-5">
          {data?.map((d) => (
            <div key={d.name}>
              <Link
                to={`/search?department=${encodeURIComponent(d.name)}`}
                onClick={close}
                className="flex items-center gap-2 font-semibold"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: departmentStyle(d.name).pack }}
                />
                {d.name}
              </Link>
              <ul className="mt-2 space-y-1 border-l border-line pl-4">
                {d.categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      to={`/search?category=${c.slug}`}
                      onClick={close}
                      className="block py-1 text-ink-soft hover:text-ink"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="space-y-2 border-t border-line pt-5 text-ink-soft">
            <Link to="/track" onClick={close} className="block hover:text-ink">
              Track an order
            </Link>
            <Link to="/account" onClick={close} className="block hover:text-ink">
              Your orders
            </Link>
          </div>
        </div>
      </SheetContent>
    </D.Root>
  );
}

function Footer() {
  const { data } = useDepartments();
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <ShopMark />
            <p className="type-heading text-xl">QuickBill Mart</p>
          </div>
          <address className="mt-4 text-ink-soft not-italic">
            Shop 4, Baner Road
            <br />
            Pune, Maharashtra 411045
          </address>
          <p className="mt-3 text-ink-soft">Open every day, 8 am to 10 pm</p>
          <p className="text-ink-soft">+91 20 4000 1234</p>
        </div>
        <div>
          <p className="font-semibold">Aisles</p>
          <ul className="mt-3 space-y-2 text-ink-soft">
            {data?.map((d) => (
              <li key={d.name}>
                <Link
                  to={`/search?department=${encodeURIComponent(d.name)}`}
                  className="hover:text-ink"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold">Help</p>
          <ul className="mt-3 space-y-2 text-ink-soft">
            <li>
              <Link to="/track" className="hover:text-ink">
                Track an order
              </Link>
            </li>
            <li>
              <Link to="/account" className="hover:text-ink">
                Your orders
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-ink">
                Staff sign in
              </Link>
            </li>
          </ul>
          <p className="mt-6 text-sm text-ink-faint">
            Free delivery across Pune on orders above ₹499. Cash on delivery available.
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-4 text-sm text-ink-faint sm:px-6">
          QuickBill is a portfolio project. Products, prices, payments and orders are simulated.
        </p>
      </div>
    </footer>
  );
}

export default function ShopLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <div className="bg-peacock-700 text-[13px] text-white/90">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <p className="truncate">Delivering across Pune. Free delivery above ₹499.</p>
          <Link to="/track" className="shrink-0 font-medium text-white hover:underline">
            Track an order
          </Link>
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center gap-3 sm:gap-5">
            <MobileMenu />
            <Link
              to="/"
              className="flex shrink-0 items-center gap-2.5"
              aria-label="QuickBill Mart home"
            >
              <ShopMark />
              <span className="type-heading hidden text-xl sm:block">QuickBill Mart</span>
            </Link>
            <SearchBox className="hidden max-w-xl flex-1 md:block" />
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <AccountMenu />
              <CartButton />
            </div>
          </div>
          <div className="pb-3 md:hidden">
            <SearchBox placeholder="Search products or what you need" />
          </div>
          <div className="hidden lg:block">
            <AisleNav />
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
