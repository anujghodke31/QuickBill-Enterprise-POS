import { useMutation } from '@tanstack/react-query';
import { ChevronDown, LogOut, Menu as MenuIcon, Search, Sparkles, Store } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Dialog as D } from 'radix-ui';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/display';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/overlay';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { label } from '@/lib/format';
import { useHotkey } from '@/lib/hooks';
import { canManage, useAuth } from '@/stores/auth';
import { CommandPalette } from './command-palette';
import { navFor } from './nav';

function BrandMark() {
  return (
    <Link to="/admin" className="flex items-center gap-2.5 px-2">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#0F6B73" />
        <path d="M9 7h14v18l-2.33-1.5L18.33 25 16 23.5 13.67 25l-2.34-1.5L9 25z" fill="#fff" />
        <rect x="12" y="11" width="8" height="2" rx="1" fill="#E8A317" />
        <rect x="12" y="15" width="6" height="2" rx="1" fill="#0F6B73" />
      </svg>
      <div className="leading-tight">
        <p className="type-heading text-[17px]">QuickBill</p>
        <p className="text-xs text-ink-faint">QuickBill Mart, Baner</p>
      </div>
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuth((s) => s.user)!;
  return (
    <nav className="flex flex-col gap-5 px-3" aria-label="Back office">
      {navFor(user.role).map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-2 text-xs font-medium text-ink-faint">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex h-9 items-center gap-2.5 rounded-lg px-2 text-[15px] text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink',
                      isActive && 'bg-turmeric-100 font-medium text-ink hover:bg-turmeric-100',
                    )
                  }
                >
                  <item.icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserMenu() {
  const user = useAuth((s) => s.user)!;
  const clear = useAuth((s) => s.clear);
  const navigate = useNavigate();
  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      clear();
      navigate('/login');
    },
  });
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
  return (
    <Menu>
      <MenuTrigger className="flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 hover:bg-ink/[0.04]">
        <span className="grid size-8 place-items-center rounded-full bg-peacock-600 text-sm font-semibold text-white">
          {initials}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="block text-xs text-ink-faint">{label(user.role)}</span>
        </span>
        <ChevronDown className="size-4 text-ink-faint" />
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>{user.email}</MenuLabel>
        <MenuItem asChild>
          <Link to="/">
            <Store /> Open the shop
          </Link>
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => logout.mutate()}>
          <LogOut /> Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

export default function AdminLayout() {
  const user = useAuth((s) => s.user)!;
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  // The till and the copilot fill the screen; other pages sit in a padded column.
  const fullBleed = ['/admin/pos', '/admin/copilot'].some((p) => location.pathname.startsWith(p));

  const openPalette = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    setPaletteOpen(true);
  }, []);
  useHotkey('mod+k', openPalette);

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-line bg-surface py-5 lg:flex">
        <BrandMark />
        <SidebarNav />
      </aside>

      <D.Root open={navOpen} onOpenChange={setNavOpen}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-40 bg-ink/30 lg:hidden" />
          <D.Content className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col gap-6 overflow-y-auto bg-surface py-5 shadow-float lg:hidden">
            <D.Title className="sr-only">Navigation</D.Title>
            <D.Description className="sr-only">Back office sections</D.Description>
            <BrandMark />
            <SidebarNav onNavigate={() => setNavOpen(false)} />
          </D.Content>
        </D.Portal>
      </D.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
          >
            <MenuIcon />
          </Button>
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink-faint transition-colors hover:border-line-strong"
          >
            <Search className="size-4" />
            <span className="truncate">Find a product, customer or bill</span>
            <Kbd className="ml-auto hidden sm:inline-flex">Ctrl K</Kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {canManage(user) && !location.pathname.startsWith('/admin/copilot') && (
              <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
                <Link to="/admin/copilot">
                  <Sparkles className="text-peacock-600" /> Ask Copilot
                </Link>
              </Button>
            )}
            <UserMenu />
          </div>
        </header>
        <main
          className={cn(
            'flex-1',
            fullBleed ? '' : 'mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:py-8',
          )}
        >
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
