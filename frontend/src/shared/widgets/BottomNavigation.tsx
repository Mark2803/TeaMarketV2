import {
  Heart,
  Home,
  LayoutGrid,
  ShoppingCart,
  User
} from "lucide-react";

import {
  NavLink
} from "react-router-dom";

import {
  useCart
} from "../../features/cart/useCart";

import {
  useFavorites
} from "../../features/favorites/useFavorites";

import "../styles/navigation-badges.css";

const navigationItems = [
  {
    to: "/",
    label: "Главная",
    icon: Home,
    end: true
  },
  {
    to: "/catalog",
    label: "Каталог",
    icon: LayoutGrid
  },
  {
    to: "/favorites",
    label: "Избранное",
    icon: Heart
  },
  {
    to: "/cart",
    label: "Корзина",
    icon: ShoppingCart
  },
  {
    to: "/profile",
    label: "Профиль",
    icon: User
  }
];

function formatCounter(
  count: number
): string {
  return count > 99
    ? "99+"
    : String(count);
}

export default function BottomNavigation() {
  const {
    totalQuantity
  } = useCart();

  const {
    count: favoriteCount
  } = useFavorites();

  return (
    <nav
      className="bottom-navigation"
      aria-label="Основная навигация"
    >
      {navigationItems.map(
        ({
          to,
          label,
          icon: Icon,
          end
        }) => {
          const counter =
            to === "/favorites"
              ? favoriteCount
              : to === "/cart"
                ? totalQuantity
                : 0;

          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({
                isActive
              }) =>
                isActive
                  ? "bottom-navigation__item bottom-navigation__item--active"
                  : "bottom-navigation__item"
              }
            >
              <div className="bottom-navigation__icon">
                <Icon
                  size={22}
                  strokeWidth={1.8}
                  fill={
                    to === "/favorites"
                    && favoriteCount > 0
                      ? "currentColor"
                      : "none"
                  }
                  aria-hidden="true"
                />

                {counter > 0 && (
                  <span
                    className="navigation-count-badge"
                    aria-hidden="true"
                  >
                    {formatCounter(counter)}
                  </span>
                )}
              </div>

              <span className="bottom-navigation__label">
                {label}
              </span>
            </NavLink>
          );
        }
      )}
    </nav>
  );
}
