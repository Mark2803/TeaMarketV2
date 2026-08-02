import {
  apiRequest
} from "./client";

import type {
  ProductsResponse
} from "../types/product";

export type GetProductsParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  collection?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
};

export function getProducts(
  params: GetProductsParams = {}
): Promise<ProductsResponse> {
  return apiRequest<ProductsResponse>(
    "/products",
    {
      query: params
    }
  );
}