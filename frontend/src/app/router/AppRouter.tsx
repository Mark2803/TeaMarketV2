import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import CheckoutLayout from "../layouts/CheckoutLayout";
import ClientLayout from "../layouts/ClientLayout";

import ArticlePage from "../../pages/ArticlePage";
import ArticlesPage from "../../pages/ArticlesPage";
import AuthPage from "../../pages/AuthPage";
import CartPage from "../../pages/CartPage";
import CatalogPage from "../../pages/CatalogPage";
import CategoryPage from "../../pages/CategoryPage";
import CheckoutPage from "../../pages/CheckoutPage";
import CollectionPage from "../../pages/CollectionPage";
import CollectionsPage from "../../pages/CollectionsPage";
import FavoritesPage from "../../pages/FavoritesPage";
import HomePage from "../../pages/HomePage";
import NotFoundPage from "../../pages/NotFoundPage";
import OrderDetailsPage from "../../pages/OrderDetailsPage";
import OrdersPage from "../../pages/OrdersPage";
import ProductPage from "../../pages/ProductPage";
import ProfileDetailsPage from "../../pages/ProfileDetailsPage";
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
            path="collections"
            element={<CollectionsPage />}
          />

          <Route
            path="collections/:collectionSlug"
            element={<CollectionPage />}
          />

          <Route
            path="articles"
            element={<ArticlesPage />}
          />

          <Route
            path="articles/:articleSlug"
            element={<ArticlePage />}
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

          <Route
            path="profile/details"
            element={<ProfileDetailsPage />}
          />

          <Route
            path="profile/orders"
            element={<OrdersPage />}
          />

          <Route
            path="profile/orders/:orderNumber"
            element={<OrderDetailsPage />}
          />
        </Route>

        <Route element={<AuthLayout />}>
          <Route
            path="/auth"
            element={<AuthPage />}
          />

          <Route
            path="/auth/*"
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
