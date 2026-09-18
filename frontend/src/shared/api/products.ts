import {
  apiRequest
} from "./client";

import type {
  ProductDetailsResponse,
  ProductsResponse
} from "../types/product";

export type GetProductsParams = {
  page?: number;
  limit?: number;
  teaType?: string;
  country?: string;
  region?: string;
  manufacturer?: string;
  sort?: "newest" | "name-asc" | "name-desc";
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isNew?: boolean;
  rotation?: "daily";
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

export function getProductBySlug(
  slug: string
): Promise<ProductDetailsResponse> {
  return apiRequest<ProductDetailsResponse>(
    `/products/${encodeURIComponent(slug)}`
  );
}
