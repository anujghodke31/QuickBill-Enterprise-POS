import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Skeleton } from '@/components/ui/display';
import { cn } from '@/lib/cn';
import { useDebounced } from '@/lib/hooks';

/**
 * List filters and pagination kept in the URL, so a filtered view survives a
 * reload and can be shared. Changing any filter resets to page 1.
 */
export function useListParams<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(
    Object.keys(defaults).map((key) => [key, params.get(key) ?? defaults[key]]),
  ) as T;
  const page = Math.max(1, Number(params.get('page')) || 1);

  const set = (patch: Partial<T> & { page?: number }) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (key === 'page') continue;
          if (value === undefined || value === '' || value === defaults[key]) next.delete(key);
          else next.set(key, String(value));
        }
        if (patch.page && patch.page > 1) next.set('page', String(patch.page));
        else next.delete('page');
        return next;
      },
      { replace: true },
    );
  };

  return { values, page, set };
}

/** Search box that updates its filter after the user pauses typing. */
export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [text, setText] = useState(value);
  const debounced = useDebounced(text, 300);

  useEffect(() => {
    if (debounced.trim() !== value) onChange(debounced.trim());
    // Only react to the user's typing, not to the parent re-rendering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    // Keep in sync when the URL changes from elsewhere (back button, clear filters).
    setText((current) => (current.trim() === value ? current : value));
  }, [value]);

  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-lg border border-line-strong bg-surface pr-9 pl-9 text-[15px] placeholder:text-ink-faint hover:border-ink-faint focus:border-peacock-500 focus:ring-3 focus:ring-peacock-500/15 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText('')}
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-ink-faint hover:text-ink"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Placeholder rows shown while a table loads. */
export function SkeletonRows({ rows = 8, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="border-b border-line px-4 py-3.5">
              <Skeleton className={cn('h-4', c === 0 ? 'w-32' : 'w-16')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Converts a date input value (YYYY-MM-DD, local) to an ISO instant at the start or end of that day. */
export function dayBoundary(date: string, edge: 'start' | 'end'): string | undefined {
  if (!date) return undefined;
  return new Date(`${date}T${edge === 'start' ? '00:00:00' : '23:59:59.999'}`).toISOString();
}

/** Makes a whole table row act as a link while keeping a real link for keyboard users. */
export const rowLinkClass = 'cursor-pointer transition-colors hover:bg-paper/70';
