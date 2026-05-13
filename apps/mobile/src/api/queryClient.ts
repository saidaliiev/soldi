/**
 * SOLDI TanStack Query client — singleton instance.
 *
 * Used by the QueryClientProvider in app/_layout.tsx.
 * All server-state hooks in Phase 1+ use this shared client.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
