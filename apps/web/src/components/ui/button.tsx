import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './display';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-peacock-600 text-white hover:bg-peacock-700 active:bg-peacock-800',
        secondary:
          'bg-surface text-ink border border-line-strong hover:bg-paper hover:border-ink-faint',
        ghost: 'text-ink-soft hover:bg-ink/5 hover:text-ink',
        accent: 'bg-turmeric-500 text-ink hover:bg-turmeric-300',
        danger: 'bg-chilli-600 text-white hover:bg-chilli-700',
        link: 'text-peacock-600 underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-8 rounded-md px-3 text-sm',
        md: 'h-10 rounded-lg px-4 text-[15px]',
        lg: 'h-12 rounded-xl px-6 text-base',
        icon: 'size-9 rounded-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner className="size-4" />}
          {children}
        </>
      )}
    </Comp>
  );
}

export { buttonVariants };
