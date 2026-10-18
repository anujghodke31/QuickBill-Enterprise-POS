import { useMutation } from '@tanstack/react-query';
import { Star, UserRound, X } from 'lucide-react';
import { useState, type RefObject } from 'react';
import { indianPhone, type CustomerDTO } from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Kbd } from '@/components/ui/display';
import { api } from '@/lib/api';
import { usePos } from './pos-store';

/** Attaches a loyalty customer to the bill by phone number, creating one if needed. */
export function CustomerPicker({ phoneRef }: { phoneRef: RefObject<HTMLInputElement | null> }) {
  const customer = usePos((s) => s.customer);
  const setCustomer = usePos((s) => s.setCustomer);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useMutation({
    mutationFn: (p: string) => api.get<CustomerDTO | null>('/customers/lookup', { phone: p }),
    onSuccess: (found) => {
      if (found) {
        setCustomer(found);
        setPhone('');
      } else {
        setNotFound(true);
      }
    },
    onError: (e) => setError(e.message),
  });

  const create = useMutation({
    mutationFn: () => api.post<CustomerDTO>('/customers', { name: name.trim(), phone }),
    onSuccess: (created) => {
      setCustomer(created);
      setPhone('');
      setName('');
      setNotFound(false);
    },
    onError: (e) => setError(e.message),
  });

  if (customer) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-peacock-50 px-3 py-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-peacock-600 text-white">
          <UserRound className="size-4" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-medium">{customer.name}</p>
          <p className="text-[13px] text-ink-soft tabular-nums">
            {customer.phone}
            <span className="ml-3 inline-flex items-center gap-1 text-turmeric-800">
              <Star className="size-3.5 fill-current" />
              {customer.loyaltyPoints} points
            </span>
          </p>
        </div>
        <button
          onClick={() => setCustomer(null)}
          className="grid size-8 place-items-center rounded-lg text-ink-faint hover:bg-white hover:text-ink"
          aria-label="Remove customer from bill"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  const submitPhone = () => {
    setError(null);
    setNotFound(false);
    const parsed = indianPhone.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid mobile number');
      return;
    }
    lookup.mutate(parsed.data);
  };

  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitPhone();
        }}
      >
        <div className="relative flex-1">
          <Input
            ref={phoneRef}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
              setNotFound(false);
              setError(null);
            }}
            inputMode="numeric"
            placeholder="Customer mobile for points"
            aria-label="Customer mobile number"
            className="pr-10"
          />
          <Kbd className="absolute top-1/2 right-2.5 -translate-y-1/2">F4</Kbd>
        </div>
        <Button type="submit" variant="secondary" loading={lookup.isPending}>
          Find
        </Button>
      </form>
      {error && <p className="mt-1.5 text-[13px] text-chilli-600">{error}</p>}
      {notFound && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length >= 2) create.mutate();
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`New customer for ${phone}: name`}
            aria-label="New customer name"
            autoFocus
          />
          <Button type="submit" loading={create.isPending} disabled={name.trim().length < 2}>
            Add
          </Button>
        </form>
      )}
    </div>
  );
}
