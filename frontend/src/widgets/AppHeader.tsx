import {
  Search,
  ShoppingCart
} from "lucide-react";

import {
  Link
} from "react-router-dom";

export default function AppHeader() {
  return (
    <header className="app-header">
      <Link
        to="/"
        className="app-header__brand"
        aria-label="На главную"
      >
        <span className="app-header__logo-placeholder">
          TM
        </span>

        <span className="app-header__brand-text">
          Tea Market
        </span>
      </Link>

      <div className="app-header__actions">
        <Link
          to="/search"
          className="app-header__action"
          aria-label="Поиск"
        >
          <Search
            size={22}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </Link>

        <Link
          to="/cart"
          className="app-header__action"
          aria-label="Корзина"
        >
          <ShoppingCart
            size={22}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </Link>
      </div>
    </header>
  );
}