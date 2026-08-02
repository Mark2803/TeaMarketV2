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

export default function BottomNavigation() {
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
        }) => (
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
            <Icon
              size={22}
              strokeWidth={1.8}
              aria-hidden="true"
            />

            <span>
              {label}
            </span>
          </NavLink>
        )
      )}
    </nav>
  );
}