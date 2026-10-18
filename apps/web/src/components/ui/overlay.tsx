import { X } from 'lucide-react';
import { Dialog as D, DropdownMenu as M, Tooltip as T } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

// ── Dialog ───────────────────────────────────────────────────────────────────

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  className,
  children,
  wide,
}: {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface p-6 shadow-float focus:outline-none data-[state=open]:animate-fade-in',
          wide ? 'max-w-3xl' : 'max-w-lg',
          className,
        )}
      >
        <div className="mb-5 pr-8">
          <D.Title className="type-heading text-xl">{title}</D.Title>
          {description ? (
            <D.Description className="mt-1 text-ink-soft">{description}</D.Description>
          ) : (
            <D.Description className="sr-only">{title}</D.Description>
          )}
        </div>
        {children}
        <D.Close
          className="absolute top-5 right-5 grid size-8 place-items-center rounded-lg text-ink-faint hover:bg-paper hover:text-ink"
          aria-label="Close"
        >
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mt-6 flex justify-end gap-2', className)}>{children}</div>;
}

/** A panel that slides in from the side of the screen. */
export function SheetContent({
  title,
  description,
  side = 'right',
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  side?: 'right' | 'left';
  className?: string;
  children: ReactNode;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/30 data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          'fixed top-0 bottom-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-float focus:outline-none',
          side === 'right' ? 'right-0' : 'left-0',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <D.Title className="type-heading text-lg">{title}</D.Title>
            {description ? (
              <D.Description className="text-sm text-ink-soft">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close
            className="grid size-8 place-items-center rounded-lg text-ink-faint hover:bg-paper hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

// ── Dropdown menu ────────────────────────────────────────────────────────────

export const Menu = M.Root;
export const MenuTrigger = M.Trigger;

export function MenuContent({ className, ...props }: ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        sideOffset={6}
        align="end"
        className={cn(
          'z-50 min-w-48 rounded-xl border border-line bg-surface p-1 shadow-lift data-[state=open]:animate-fade-in',
          className,
        )}
        {...props}
      />
    </M.Portal>
  );
}

export function MenuItem({ className, ...props }: ComponentProps<typeof M.Item>) {
  return (
    <M.Item
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-[highlighted]:bg-paper data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-ink-faint',
        className,
      )}
      {...props}
    />
  );
}

export const MenuSeparator = () => <M.Separator className="my-1 h-px bg-line" />;

export function MenuLabel({ children }: { children: ReactNode }) {
  return <M.Label className="px-2.5 py-1.5 text-xs text-ink-faint">{children}</M.Label>;
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

export const TooltipProvider = T.Provider;

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <T.Root delayDuration={250}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          sideOffset={6}
          className="z-50 rounded-md bg-ink px-2 py-1 text-xs text-white data-[state=delayed-open]:animate-fade-in"
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
