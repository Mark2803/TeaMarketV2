import {
  apiRequest
} from "./client";

import type {
  ArticleResponse,
  ArticlesResponse
} from "../types/article";

export function getArticles(
  featuredOnly = false
): Promise<ArticlesResponse> {
  return apiRequest<ArticlesResponse>(
    "/articles",
    {
      query: featuredOnly
        ? { featured: true }
        : undefined
    }
  );
}

export function getArticleBySlug(
  slug: string
): Promise<ArticleResponse> {
  return apiRequest<ArticleResponse>(
    `/articles/${encodeURIComponent(slug)}`
  );
}
