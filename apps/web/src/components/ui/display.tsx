import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// ── Badge ────────────────────────────────────────────────────────────────────

const TONES = {
  neutral: 'bg-ink/[0.06] text-ink-soft',
  peacock: 'bg-peacock-50 text-peacock-700',
  turmeric: 'bg-turmeric-100 text-turmeric-800',
  chilli: 'bg-chilli-50 text-chilli-700',
  leaf: 'bg-leaf-50 text-leaf-700',
  aubergine: 'bg-aubergine-50 text-aubergine-600',
} as const;

export type Tone = keyof typeof TONES;

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Loading ──────────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('size-5 animate-spin', className)} viewBox="0 0 24 24" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-ink/[0.07]', className)} />;
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface px-1 font-sans text-[11px] font-semibold text-ink-soft',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

// ── Layout helpers ───────────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="type-heading text-[28px] text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface', className)} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="type-heading text-lg">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      {icon && <div className="mb-3 text-ink-faint [&_svg]:size-8">{icon}</div>}
      <p className="type-heading text-lg">{title}</p>
      {children && <p className="mt-1 max-w-sm text-ink-soft">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-chilli-100 bg-chilli-50 px-4 py-3 text-sm text-chilli-700">
      {error instanceof Error ? error.message : 'Something went wrong.'}
      {onRetry && (
        <button className="ml-2 font-semibold underline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

// ── Tables ───────────────────────────────────────────────────────────────────

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('relative overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-line px-4 py-2.5 text-[13px] font-medium whitespace-nowrap text-ink-faint',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-line px-4 py-3 align-middle', className)} {...props} />;
}

export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-ink-soft">
      <span>{total.toLocaleString('en-IN')} results</span>
      <div className="flex items-center gap-1">
        <span className="mr-2 tabular-nums">
          Page {page} of {totalPages}
        </span>
        <button
          className="grid size-8 place-items-center rounded-md border border-line hover:bg-paper disabled:opacity-40"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          className="grid size-8 place-items-center rounded-md border border-line hover:bg-paper disabled:opacity-40"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── Figures ──────────────────────────────────────────────────────────────────

/** A change indicator such as "+12.4% vs yesterday". */
export function Delta({ value, suffix }: { value: number | null; suffix?: string }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-ink-faint">{suffix ? `no data ${suffix}` : '—'}</span>;
  }
  const up = value >= 0;
  return (
    <span className={cn('font-medium tabular-nums', up ? 'text-leaf-600' : 'text-chilli-600')}>
      {up ? '+' : '−'}
      {Math.abs(value * 100).toFixed(1)}%
      {suffix && <span className="font-normal text-ink-faint"> {suffix}</span>}
    </span>
  );
}
