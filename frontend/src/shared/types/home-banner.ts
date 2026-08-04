export interface HomeBanner {
  id: string; eyebrow: string | null; title: string; subtitle: string | null;
  image_url: string | null; image_alt: string | null; sort_order: number;
  collections: { id: string; slug: string; name: string; description: string | null };
}
export interface HomeBannersResponse { data: HomeBanner[]; }
