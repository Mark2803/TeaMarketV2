export type ArticleListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  cover_alt: string | null;
  reading_time_minutes: number;
  is_featured: boolean;
  sort_order: number;
  published_at: string | null;
};

export type ArticleDetails =
  ArticleListItem & {
    content: string;
    seo_title: string | null;
    seo_description: string | null;
    created_at: string;
    updated_at: string;
  };

export type ArticlesResponse = {
  data: ArticleListItem[];
};

export type ArticleResponse = {
  data: ArticleDetails;
};
