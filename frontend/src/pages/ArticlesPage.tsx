import {
  ArrowRight,
  BookOpen,
  Clock3
} from "lucide-react";

import {
  Link
} from "react-router-dom";

import {
  useArticles
} from "../shared/hooks/useArticles";

export default function ArticlesPage() {
  const articlesQuery =
    useArticles(false);

  return (
    <div className="articles-page">
      <header className="articles-page__heading">
        <span>
          База знаний
        </span>

        <h1>
          Статьи о чае
        </h1>

        <p>
          Заваривание, хранение, виды чая и простые ориентиры для выбора.
        </p>
      </header>

      {articlesQuery.isLoading && (
        <div className="articles-state">
          Загружаем статьи…
        </div>
      )}

      {articlesQuery.isError && (
        <div className="articles-state articles-state--error">
          {articlesQuery.error.message}
        </div>
      )}

      {!articlesQuery.isLoading
        && !articlesQuery.isError
        && (articlesQuery.data?.data.length ?? 0) === 0 && (
          <div className="articles-state">
            Опубликованных статей пока нет.
          </div>
        )}

      <div className="articles-grid">
        {articlesQuery.data?.data.map(
          (article) => (
            <article
              key={article.id}
              className="article-card"
            >
              <Link
                to={`/articles/${article.slug}`}
                className="article-card__media"
                aria-label={`Открыть статью ${article.title}`}
              >
                {article.cover_url ? (
                  <img
                    src={article.cover_url}
                    alt={article.cover_alt ?? article.title}
                  />
                ) : (
                  <BookOpen
                    size={42}
                    strokeWidth={1.25}
                    aria-hidden="true"
                  />
                )}
              </Link>

              <div className="article-card__body">
                <span className="article-card__time">
                  <Clock3
                    size={15}
                    aria-hidden="true"
                  />

                  {article.reading_time_minutes} мин чтения
                </span>

                <h2>
                  <Link to={`/articles/${article.slug}`}>
                    {article.title}
                  </Link>
                </h2>

                <p>
                  {article.excerpt}
                </p>

                <Link
                  to={`/articles/${article.slug}`}
                  className="article-card__more"
                >
                  Читать
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </article>
          )
        )}
      </div>
    </div>
  );
}
