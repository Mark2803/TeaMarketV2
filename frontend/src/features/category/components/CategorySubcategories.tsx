import type {
  CatalogCategory
} from "../../../shared/types/catalog";

type CategorySubcategoriesProps = {
  items: CatalogCategory[];
  activeSlug: string | null;
  onSelect: (slug: string) => void;
};

export default function CategorySubcategories({
  items,
  activeSlug,
  onSelect
}: CategorySubcategoriesProps) {
  return (
    <section className="category-subcategories">
      <h2>Подкатегории</h2>

      <div className="category-subcategories__grid">
        {items.map((subcategory) => {
          const isActive =
            activeSlug === subcategory.slug;

          return (
            <button
              key={subcategory.id}
              type="button"
              className={
                isActive
                  ? "category-subcategory-button category-subcategory-button--active"
                  : "category-subcategory-button"
              }
              aria-pressed={isActive}
              onClick={() =>
                onSelect(subcategory.slug)
              }
            >
              {subcategory.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
