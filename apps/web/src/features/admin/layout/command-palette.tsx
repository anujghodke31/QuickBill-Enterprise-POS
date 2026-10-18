import { useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import { Contact, Package, ReceiptIndianRupee } from 'lucide-react';
import { Dialog as D } from 'radix-ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { CustomerDTO, Paginated, ProductDTO, SaleSummaryDTO } from '@quickbill/shared';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import { useAuth } from '@/stores/auth';
import { navFor } from './nav';

const itemClass =
  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[15px] text-ink data-[selected=true]:bg-paper [&_svg]:size-4 [&_svg]:text-ink-faint';

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const user = useAuth((s) => s.user)!;
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 200);
  const enabled = open && q.length >= 2;

  const products = useQuery({
    queryKey: ['palette', 'products', q],
    queryFn: () => api.get<Paginated<ProductDTO>>('/catalog/products', { q, pageSize: 6 }),
    enabled,
  });
  const customers = useQuery({
    queryKey: ['palette', 'customers', q],
    queryFn: () => api.get<Paginated<CustomerDTO>>('/customers', { q, pageSize: 5 }),
    enabled,
  });
  const sales = useQuery({
    queryKey: ['palette', 'sales', q],
    queryFn: () => api.get<Paginated<SaleSummaryDTO>>('/sales', { q, pageSize: 5 }),
    enabled: enabled && /\d/.test(q),
  });

  const go = (to: string) => {
    onOpenChange(false);
    setSearch('');
    navigate(to);
  };

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-fade-in" />
        <D.Content className="fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl bg-surface shadow-float focus:outline-none">
          <D.Title className="sr-only">Search QuickBill</D.Title>
          <D.Description className="sr-only">
            Jump to a page, product, customer or bill
          </D.Description>
          <Command shouldFilter={false} loop>
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search products, customers, bill numbers, or pages"
              className="h-14 w-full border-b border-line bg-transparent px-5 text-base outline-none placeholder:text-ink-faint"
            />
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-ink-soft">
                Nothing matches “{search}”.
              </Command.Empty>

              {products.data && products.data.items.length > 0 && (
                <Command.Group
                  heading="Products"
                  className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ink-faint"
                >
                  {products.data.items.map((p) => (
                    <Command.Item
                      key={p.id}
                      value={`product-${p.id}`}
                      onSelect={() => go(`/admin/products/${p.id}`)}
                      className={itemClass}
                    >
                      <Package />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="text-sm text-ink-faint tabular-nums">
                        {formatINR(p.price)}
                      </span>
                      <span className="w-20 text-right text-sm text-ink-faint tabular-nums">
                        {p.stock} in stock
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {customers.data && customers.data.items.length > 0 && (
                <Command.Group
                  heading="Customers"
                  className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ink-faint"
                >
                  {customers.data.items.map((c) => (
                    <Command.Item
                      key={c.id}
                      value={`customer-${c.id}`}
                      onSelect={() => go(`/admin/customers/${c.id}`)}
                      className={itemClass}
                    >
                      <Contact />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-sm text-ink-faint">{c.phone}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {sales.data && sales.data.items.length > 0 && (
                <Command.Group
                  heading="Bills"
                  className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ink-faint"
                >
                  {sales.data.items.map((s) => (
                    <Command.Item
                      key={s.id}
                      value={`sale-${s.id}`}
                      onSelect={() => go(`/admin/sales/${s.id}`)}
                      className={itemClass}
                    >
                      <ReceiptIndianRupee />
                      <span className="flex-1">{s.number}</span>
                      <span className="text-sm text-ink-faint tabular-nums">
                        {formatINR(s.total)}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              <Command.Group
                heading="Go to"
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ink-faint"
              >
                {navFor(user.role)
                  .flatMap((g) => g.items)
                  .filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase()))
                  .map((item) => (
                    <Command.Item
                      key={item.to}
                      value={`nav-${item.to}`}
                      onSelect={() => go(item.to)}
                      className={itemClass}
                    >
                      <item.icon />
                      {item.label}
                    </Command.Item>
                  ))}
              </Command.Group>
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
