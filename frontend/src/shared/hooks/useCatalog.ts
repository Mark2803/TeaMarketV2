import {
  useQuery
} from "@tanstack/react-query";

import {
  getCategories,
  getCategoryBySlug,
  getCategoryProducts,
  getCollectionBySlug,
  getCollectionProducts,
  getCollections
} from "../api/catalog";

import type {
  GetProductsParams
} from "../api/products";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories
  });
}

export function useCategory(
  slug: string
) {
  return useQuery({
    queryKey: ["category", slug],
    queryFn: () =>
      getCategoryBySlug(slug),
    enabled: Boolean(slug)
  });
}

export function useCategoryProducts(
  slug: string,
  params: GetProductsParams
) {
  return useQuery({
    queryKey: [
      "category-products",
      slug,
      params
    ],
    queryFn: () =>
      getCategoryProducts(
        slug,
        params
      ),
    enabled: Boolean(slug)
  });
}

export function useCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: getCollections
  });
}

export function useCollection(
  slug: string
) {
  return useQuery({
    queryKey: ["collection", slug],
    queryFn: () =>
      getCollectionBySlug(slug),
    enabled: Boolean(slug)
  });
}

export function useCollectionProducts(
  slug: string,
  params: GetProductsParams
) {
  return useQuery({
    queryKey: [
      "collection-products",
      slug,
      params
    ],
    queryFn: () =>
      getCollectionProducts(
        slug,
        params
      ),
    enabled: Boolean(slug)
  });
}
