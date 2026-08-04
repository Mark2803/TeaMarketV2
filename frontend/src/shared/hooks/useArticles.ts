import {
  useQuery
} from "@tanstack/react-query";

import {
  getArticleBySlug,
  getArticles
} from "../api/articles";

export function useArticles(
  featuredOnly = false
) {
  return useQuery({
    queryKey: [
      "articles",
      { featuredOnly }
    ],
    queryFn: () =>
      getArticles(featuredOnly)
  });
}

export function useArticle(
  slug: string
) {
  return useQuery({
    queryKey: ["article", slug],
    queryFn: () =>
      getArticleBySlug(slug),
    enabled: Boolean(slug)
  });
}
