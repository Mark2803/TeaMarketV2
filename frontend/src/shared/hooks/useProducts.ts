import {
  useQuery
} from "@tanstack/react-query";

import {
  getProducts
} from "../api/products";

import type {
  GetProductsParams
} from "../api/products";

export function useProducts(
  params: GetProductsParams = {}
) {
  return useQuery({
    queryKey: [
      "products",
      params
    ],

    queryFn: () =>
      getProducts(params)
  });
}