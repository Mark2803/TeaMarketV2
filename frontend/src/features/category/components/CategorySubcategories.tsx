type CategorySubcategoriesProps = {
  items: string[];
};

export default function CategorySubcategories({
  items
}: CategorySubcategoriesProps) {
  return (
    <section className="category-subcategories">
      <h2>
        Подкатегории
      </h2>

      <div className="category-subcategories__grid">
        {items.map(
          (subcategory) => (
            <button
              key={subcategory}
              type="button"
            >
              {subcategory}
            </button>
          )
        )}
      </div>
    </section>
  );
}
