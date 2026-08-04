import { apiRequest } from "./client";
import type { ProductListItem } from "../types/product";

export type SearchResponse = {
  data: ProductListItem[];
};

export function searchProducts(query: string): Promise<SearchResponse> {
  return apiRequest<SearchResponse>("/search", {
    query: { q: query }
  });
}
