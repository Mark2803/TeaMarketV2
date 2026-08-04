import {
  Heart,
  LogIn,
  ShoppingBag
} from "lucide-react";

import {
  Link
} from "react-router-dom";

type EmptyFavoritesProps = {
  requiresAuth?: boolean;
};

export default function EmptyFavorites({
  requiresAuth = false
}: EmptyFavoritesProps) {
  return (
    <section className="favorites-empty">
      <span className="favorites-empty__icon">
        <Heart
          size={34}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </span>

      <h2>
        {requiresAuth
          ? "Войдите, чтобы открыть избранное"
          : "В избранном пока пусто"}
      </h2>

      <p>
        {requiresAuth
          ? "Избранные товары хранятся в вашем профиле и доступны после авторизации."
          : "Сохраняйте понравившиеся товары, чтобы быстро вернуться к ним позже."}
      </p>

      <Link
        to={requiresAuth ? "/auth" : "/catalog"}
        className="favorites-empty__action"
      >
        {requiresAuth ? (
          <LogIn
            size={19}
            strokeWidth={1.7}
            aria-hidden="true"
          />
        ) : (
          <ShoppingBag
            size={19}
            strokeWidth={1.7}
            aria-hidden="true"
          />
        )}

        {requiresAuth
          ? "Войти"
          : "Перейти в каталог"}
      </Link>
    </section>
  );
}
