import {
  useQuery
} from "@tanstack/react-query";

import {
  getProductBySlug
} from "../api/products";

export function useProduct(
  slug: string
) {
  return useQuery({
    queryKey: [
      "product",
      slug
    ],

    queryFn: () =>
      getProductBySlug(slug),

    enabled:
      slug.trim().length > 0
  });
}
