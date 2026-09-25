import {
  Search
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
          <img
            src="https://tea-master-team.ru/bimi/logo.svg"
            alt=""
            className="app-header__logo-image"
            aria-hidden="true"
          />
        </span>

        <span className="app-header__brand-text">
          Чайный Мастер
        </span>
      </Link>

      <div className="app-header__actions">
        <Link
          to="/contacts"
          className="app-header__contacts"
        >
          Контакты
        </Link>

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
      </div>
    </header>
  );
}
