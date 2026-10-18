import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster, toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/overlay';
import { ApiError } from '@/lib/api';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, error) =>
        count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
  queryCache: new QueryCache(),
  mutationCache: new MutationCache({
    // Mutations without their own onError still tell the user what went wrong.
    onError: (error, _vars, _ctx, mutation) => {
      if (!mutation.options.onError) toast.error(error.message);
    },
  }),
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: '!font-sans !rounded-xl !border-line !shadow-lift',
              title: '!text-ink !text-[15px]',
              description: '!text-ink-soft',
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export { queryClient };
