import {
  apiRequest
} from "./client";

import {
  getAuthHeaders
} from "../../features/auth/auth.storage";

import type {
  ProductImage,
  ProductVariant
} from "../types/product";

export type FavoriteProductApi = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  tea_type: string | null;
  country: string | null;
  region: string | null;
  manufacturer: string | null;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
};

export type FavoriteApiItem = {
  addedAt: string;
  product: FavoriteProductApi;
};

type FavoritesResponse = {
  data: FavoriteApiItem[];
};

type FavoriteMutationResponse = {
  data: {
    productId: string;
    isFavorite: boolean;
  };
};

export function getFavorites(): Promise<FavoritesResponse> {
  return apiRequest<FavoritesResponse>(
    "/favorites",
    {
      headers: getAuthHeaders()
    }
  );
}

export function addFavorite(
  productId: string
): Promise<FavoriteMutationResponse> {
  return apiRequest<FavoriteMutationResponse>(
    `/favorites/${encodeURIComponent(productId)}`,
    {
      method: "POST",
      headers: getAuthHeaders()
    }
  );
}

export function removeFavorite(
  productId: string
): Promise<FavoriteMutationResponse> {
  return apiRequest<FavoriteMutationResponse>(
    `/favorites/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders()
    }
  );
}

export function resolveGuestFavorites(
  productIds: string[]
): Promise<FavoritesResponse> {
  return apiRequest<FavoritesResponse>(
    "/favorites/resolve",
    {
      method: "POST",
      body: JSON.stringify({ productIds })
    }
  );
}

export function mergeGuestFavorites(
  productIds: string[]
): Promise<FavoritesResponse> {
  return apiRequest<FavoritesResponse>(
    "/favorites/merge",
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ productIds })
    }
  );
}
