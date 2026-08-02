import {
  Outlet,
  useLocation
} from "react-router-dom";

import AppHeader from "../../widgets/AppHeader";
import BottomNavigation from "../../widgets/BottomNavigation";

export default function ClientLayout() {
  const location = useLocation();

  const isCatalogPage =
    location.pathname === "/catalog"
    || location.pathname.startsWith("/catalog/");

  const isProductPage =
    location.pathname.startsWith("/products/");

  const usesOwnHeader =
    isCatalogPage
    || isProductPage;

  const contentClassName =
    isProductPage
      ? "client-layout__content client-layout__content--product"
      : isCatalogPage
        ? "client-layout__content client-layout__content--catalog"
        : "client-layout__content";

  return (
    <div className="client-layout">
      {!usesOwnHeader && <AppHeader />}

      <main className={contentClassName}>
        <Outlet />
      </main>

      <BottomNavigation />
    </div>
  );
}
