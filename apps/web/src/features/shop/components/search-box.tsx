import { Search, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { cn } from '@/lib/cn';

/** Search field that sends the shopper to /search?q=… on submit. */
export function SearchBox({
  size = 'md',
  autoFocus,
  placeholder = 'Search for products, brands, or what you need them for',
  className,
  initial,
}: {
  size?: 'md' | 'lg';
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  initial?: string;
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const current = initial ?? params.get('q') ?? '';
  const [value, setValue] = useState(current);

  // Keep the field in step with the URL when the shopper navigates between searches.
  useEffect(() => setValue(current), [current]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const large = size === 'lg';
  return (
    <form role="search" onSubmit={submit} className={cn('relative w-full', className)}>
      <label htmlFor={large ? 'hero-search' : 'header-search'} className="sr-only">
        Search the shop
      </label>
      <Search
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-faint',
          large ? 'left-5 size-6' : 'left-3 size-4',
        )}
      />
      <input
        id={large ? 'hero-search' : 'header-search'}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        className={cn(
          'w-full rounded-xl border border-line-strong bg-surface text-ink placeholder:text-ink-faint focus:border-peacock-500 focus:ring-4 focus:ring-peacock-500/15 focus:outline-none [&::-webkit-search-cancel-button]:hidden',
          large ? 'h-16 pr-36 pl-14 text-lg shadow-lift' : 'h-10 pr-9 pl-9 text-[15px]',
        )}
      />
      {value && !large && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-faint hover:bg-paper hover:text-ink"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}
      {large && (
        <button
          type="submit"
          className="absolute top-2 right-2 bottom-2 rounded-lg bg-peacock-600 px-6 font-semibold text-white hover:bg-peacock-700"
        >
          Search
        </button>
      )}
    </form>
  );
}
