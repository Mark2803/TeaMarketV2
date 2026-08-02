import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import CheckoutLayout from "../layouts/CheckoutLayout";
import ClientLayout from "../layouts/ClientLayout";

import AuthPage from "../../pages/AuthPage";
import CartPage from "../../pages/CartPage";
import CatalogPage from "../../pages/CatalogPage";
import CategoryPage from "../../pages/CategoryPage";
import CheckoutPage from "../../pages/CheckoutPage";
import FavoritesPage from "../../pages/FavoritesPage";
import HomePage from "../../pages/HomePage";
import NotFoundPage from "../../pages/NotFoundPage";
import ProductPage from "../../pages/ProductPage";
import ProfilePage from "../../pages/ProfilePage";
import SearchPage from "../../pages/SearchPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ClientLayout />}>
          <Route
            index
            element={<HomePage />}
          />

          <Route
            path="catalog"
            element={<CatalogPage />}
          />

          <Route
            path="catalog/:categorySlug"
            element={<CategoryPage />}
          />

          <Route
            path="search"
            element={<SearchPage />}
          />

          <Route
            path="products/:slug"
            element={<ProductPage />}
          />

          <Route
            path="favorites"
            element={<FavoritesPage />}
          />

          <Route
            path="cart"
            element={<CartPage />}
          />

          <Route
            path="profile"
            element={<ProfilePage />}
          />
        </Route>

        <Route element={<AuthLayout />}>
          <Route
            path="/auth"
            element={<AuthPage />}
          />
        </Route>

        <Route element={<CheckoutLayout />}>
          <Route
            path="/checkout"
            element={<CheckoutPage />}
          />
        </Route>

        <Route
          path="/404"
          element={<NotFoundPage />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/404"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
