import { useQuery } from "@tanstack/react-query";
import { searchProducts } from "../api/search";

export function useSearchProducts(query: string) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: ["search", normalizedQuery],
    queryFn: () => searchProducts(normalizedQuery),
    enabled: normalizedQuery.length >= 2,
    staleTime: 30_000
  });
}
