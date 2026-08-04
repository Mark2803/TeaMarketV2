import type {
  Request,
  Response
} from "express";

import {
  getPublishedArticleBySlug,
  getPublishedArticles
} from "./articles.service.js";

export async function getArticlesController(
  req: Request,
  res: Response
): Promise<void> {
  const featuredOnly =
    req.query.featured === "true";

  const articles =
    await getPublishedArticles(
      featuredOnly
    );

  res.json({
    data: articles
  });
}

export async function getArticleBySlugController(
  req: Request,
  res: Response
): Promise<void> {
  const slugParam = req.params.slug;

  const slug = Array.isArray(slugParam)
    ? slugParam[0]
    : slugParam;

  if (!slug) {
    res.status(400).json({
      error: {
        code: "INVALID_ARTICLE_SLUG",
        message: "Slug статьи не указан"
      }
    });
    return;
  }

  const article =
    await getPublishedArticleBySlug(slug);

  if (!article) {
    res.status(404).json({
      error: {
        code: "ARTICLE_NOT_FOUND",
        message: "Статья не найдена"
      }
    });
    return;
  }

  res.json({
    data: article
  });
}
