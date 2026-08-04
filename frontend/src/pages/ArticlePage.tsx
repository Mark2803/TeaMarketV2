import {
  ArrowLeft,
  Clock3
} from "lucide-react";

import {
  Link,
  Navigate,
  useParams
} from "react-router-dom";

import {
  useArticle
} from "../shared/hooks/useArticles";

function renderArticleContent(
  content: string
) {
  return content
    .split(/\n\s*\n/)
    .map((block, index) => {
      const value = block.trim();

      if (value.startsWith("## ")) {
        return (
          <h2 key={`${index}-${value}`}>
            {value.slice(3)}
          </h2>
        );
      }

      return (
        <p key={`${index}-${value.slice(0, 20)}`}>
          {value}
        </p>
      );
    });
}

export default function ArticlePage() {
  const { articleSlug = "" } =
    useParams<{ articleSlug: string }>();

  const articleQuery =
    useArticle(articleSlug);

  if (
    articleQuery.isError
    && articleQuery.error.message
      === "Статья не найдена"
  ) {
    return <Navigate to="/404" replace />;
  }

  if (articleQuery.isLoading) {
    return (
      <div className="articles-state">
        Загружаем статью…
      </div>
    );
  }

  if (
    articleQuery.isError
    || !articleQuery.data
  ) {
    return (
      <div className="articles-state articles-state--error">
        {articleQuery.error?.message
          ?? "Не удалось загрузить статью"}
      </div>
    );
  }

  const article =
    articleQuery.data.data;

  return (
    <article className="article-page">
      <Link
        to="/articles"
        className="article-page__back"
      >
        <ArrowLeft
          size={18}
          aria-hidden="true"
        />
        Все статьи
      </Link>

      <header className="article-page__header">
        <span className="article-page__time">
          <Clock3
            size={16}
            aria-hidden="true"
          />
          {article.reading_time_minutes} мин чтения
        </span>

        <h1>
          {article.title}
        </h1>

        <p>
          {article.excerpt}
        </p>
      </header>

      {article.cover_url && (
        <img
          className="article-page__cover"
          src={article.cover_url}
          alt={article.cover_alt ?? article.title}
        />
      )}

      <div className="article-page__content">
        {renderArticleContent(
          article.content
        )}
      </div>
    </article>
  );
}
