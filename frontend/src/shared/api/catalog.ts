import {
  apiRequest
} from "./client";

import type {
  GetProductsParams
} from "./products";

import type {
  CategoriesResponse,
  CategoryProductsResponse,
  CategoryResponse,
  CollectionProductsResponse,
  CollectionResponse,
  CollectionsResponse
} from "../types/catalog";

export function getCategories(): Promise<CategoriesResponse> {
  return apiRequest<CategoriesResponse>(
    "/categories"
  );
}

export function getCategoryBySlug(
  slug: string
): Promise<CategoryResponse> {
  return apiRequest<CategoryResponse>(
    `/categories/${encodeURIComponent(slug)}`
  );
}

export function getCategoryProducts(
  slug: string,
  params: GetProductsParams = {}
): Promise<CategoryProductsResponse> {
  return apiRequest<CategoryProductsResponse>(
    `/categories/${encodeURIComponent(slug)}/products`,
    { query: params }
  );
}

export function getCollections(): Promise<CollectionsResponse> {
  return apiRequest<CollectionsResponse>(
    "/collections"
  );
}

export function getCollectionBySlug(
  slug: string
): Promise<CollectionResponse> {
  return apiRequest<CollectionResponse>(
    `/collections/${encodeURIComponent(slug)}`
  );
}

export function getCollectionProducts(
  slug: string,
  params: GetProductsParams = {}
): Promise<CollectionProductsResponse> {
  return apiRequest<CollectionProductsResponse>(
    `/collections/${encodeURIComponent(slug)}/products`,
    { query: params }
  );
}
