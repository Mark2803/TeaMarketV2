import type {
  PropsWithChildren
} from "react";

import {
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query";

import AuthProvider from "../../features/auth/AuthProvider";
import DeliveryProvider from "../../features/delivery/DeliveryProvider";
import { AdminAuthProvider } from "../../features/admin/AdminAuthProvider";

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
      <AuthProvider>
        <AdminAuthProvider>
          <DeliveryProvider>
            {children}
          </DeliveryProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}