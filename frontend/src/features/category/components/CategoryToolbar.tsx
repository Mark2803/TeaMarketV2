import {
  ArrowLeft,
  ShoppingCart
} from "lucide-react";

import {
  Link
} from "react-router-dom";

type CategoryToolbarProps = {
  categoryName: string;
};

export default function CategoryToolbar({
  categoryName
}: CategoryToolbarProps) {
  return (
    <header className="category-toolbar">
      <Link
        to="/catalog"
        className="category-toolbar__back"
        aria-label="Вернуться в каталог"
      >
        <ArrowLeft
          size={23}
          strokeWidth={1.7}
          aria-hidden="true"
        />
      </Link>

      <h1>
        {categoryName}
      </h1>

      <Link
        to="/cart"
        className="category-toolbar__cart"
        aria-label="Открыть корзину"
      >
        <ShoppingCart
          size={23}
          strokeWidth={1.7}
          aria-hidden="true"
        />

        <span>
          2
        </span>
      </Link>
    </header>
  );
}
