import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** Two-column frame for sign-in and sign-up: the store's signboard on one side, the form on the other. */
export function AuthShell({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-peacock-700 px-12 py-12 text-white lg:flex lg:flex-col">
        <Link to="/" className="text-sm text-white/70 hover:text-white">
          QuickBill Mart, Baner Road, Pune
        </Link>
        <p className="type-display mt-auto text-[88px] leading-[0.86] xl:text-[112px]">
          Quick
          <br />
          <span className="text-turmeric-300">Bill</span>
        </p>
        <p className="mt-6 max-w-sm text-lg text-white/80">
          The till, the stockroom and the online shop of one neighbourhood store, with an AI
          assistant that reads the numbers for you.
        </p>
        {aside}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full border-[40px] border-white/[0.04]"
        />
      </section>
      <section className="flex flex-col px-6 py-10 sm:px-12">
        <Link to="/" className="type-heading text-lg text-peacock-700 lg:hidden">
          QuickBill Mart
        </Link>
        <div className="mx-auto my-auto w-full max-w-sm py-10">{children}</div>
        <p className="text-center text-xs text-ink-faint">
          <Link to="/" className="hover:text-ink">
            Back to the shop
          </Link>
        </p>
      </section>
    </div>
  );
}
