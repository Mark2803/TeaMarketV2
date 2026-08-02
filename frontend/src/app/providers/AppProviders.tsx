import type {
  PropsWithChildren
} from "react";

import {
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query";

const queryClient =
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:
          60_000,

        retry:
          1,

        refetchOnWindowFocus:
          false
      }
    }
  });

export default function AppProviders({
  children
}: PropsWithChildren) {
  return (
    <QueryClientProvider
      client={queryClient}
    >
      {children}
    </QueryClientProvider>
  );
}