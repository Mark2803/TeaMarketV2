import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import { lazy, Suspense } from "react";
import AnalyticsRouteTracker from "../../features/analytics/AnalyticsRouteTracker";

// Route-level lazy loading keeps the storefront and admin panel in separate chunks.
// A page is downloaded only when its route is opened.
const AuthLayout = lazy(() => import("../layouts/AuthLayout"));
const CheckoutLayout = lazy(() => import("../layouts/CheckoutLayout"));
const ClientLayout = lazy(() => import("../layouts/ClientLayout"));
const AdminLayout = lazy(() => import("../layouts/AdminLayout"));

const ArticlePage = lazy(() => import("../../pages/ArticlePage"));
const ArticlesPage = lazy(() => import("../../pages/ArticlesPage"));
const AuthPage = lazy(() => import("../../pages/AuthPage"));
const CartPage = lazy(() => import("../../pages/CartPage"));
const CatalogPage = lazy(() => import("../../pages/CatalogPage"));
const CategoryPage = lazy(() => import("../../pages/CategoryPage"));
const DeliveryAddressesPage = lazy(() => import("../../pages/DeliveryAddressesPage"));
const CheckoutPage = lazy(() => import("../../pages/CheckoutPage"));
const CollectionPage = lazy(() => import("../../pages/CollectionPage"));
const ContactsPage = lazy(() => import("../../pages/ContactsPage"));
const CollectionsPage = lazy(() => import("../../pages/CollectionsPage"));
const FavoritesPage = lazy(() => import("../../pages/FavoritesPage"));
const HomePage = lazy(() => import("../../pages/HomePage"));
const NotFoundPage = lazy(() => import("../../pages/NotFoundPage"));
const NewProductsPage = lazy(() => import("../../pages/NewProductsPage"));
const OrderDetailsPage = lazy(() => import("../../pages/OrderDetailsPage"));
const OrdersPage = lazy(() => import("../../pages/OrdersPage"));
const ProductPage = lazy(() => import("../../pages/ProductPage"));
const ProfileDetailsPage = lazy(() => import("../../pages/ProfileDetailsPage"));
const ProfilePage = lazy(() => import("../../pages/ProfilePage"));
const SearchPage = lazy(() => import("../../pages/SearchPage"));

const AdminLoginPage = lazy(() => import("../../pages/admin/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("../../pages/admin/AdminDashboardPage"));
const AdminPlaceholderPage = lazy(() => import("../../pages/admin/AdminPlaceholderPage"));
const AdminProductsPage = lazy(() => import("../../pages/admin/AdminProductsPage"));
const AdminProductEditPage = lazy(() => import("../../pages/admin/AdminProductEditPage"));
const AdminProductCreatePage = lazy(() => import("../../pages/admin/AdminProductCreatePage"));
const AdminCategoriesPage = lazy(() => import("../../pages/admin/AdminCategoriesPage"));
const AdminCategoryEditPage = lazy(() => import("../../pages/admin/AdminCategoryEditPage"));
const AdminStockPage = lazy(() => import("../../pages/admin/AdminStockPage"));
const AdminContentPage = lazy(() => import("../../pages/admin/AdminContentPage"));
const AdminOrdersPage = lazy(() => import("../../pages/admin/AdminOrdersPage"));
const AdminOrderEditPage = lazy(() => import("../../pages/admin/AdminOrderEditPage"));
const AdminCustomersPage = lazy(() => import("../../pages/admin/AdminCustomersPage"));
const AdminCustomerEditPage = lazy(() => import("../../pages/admin/AdminCustomerEditPage"));
const AdminPromotionsPage = lazy(() => import("../../pages/admin/AdminPromotionsPage"));
const AdminNotificationsPage = lazy(() => import("../../pages/admin/AdminNotificationsPage"));
const AdminAnalyticsPage = lazy(() => import("../../pages/admin/AdminAnalyticsPage"));
const AdminSettingsPage = lazy(() => import("../../pages/admin/AdminSettingsPage"));


export default function AppRouter() {
  return (
    <BrowserRouter>
      <AnalyticsRouteTracker />
      <Suspense fallback={<div className="route-loading" aria-live="polite">Загрузка…</div>}>
        <Routes>
        <Route element={<ClientLayout />}>
          <Route index element={<HomePage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="catalog/:categorySlug" element={<CategoryPage />} />
          <Route path="new" element={<NewProductsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="collections/:collectionSlug" element={<CollectionPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="articles" element={<ArticlesPage />} />
          <Route path="articles/:articleSlug" element={<ArticlePage />} />
          <Route path="products/:slug" element={<ProductPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/details" element={<ProfileDetailsPage />} />
          <Route path="profile/delivery-addresses" element={<DeliveryAddressesPage />} />
          <Route path="profile/orders" element={<OrdersPage />} />
          <Route path="profile/orders/:orderNumber" element={<OrderDetailsPage />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/*" element={<AuthPage />} />
        </Route>

        <Route element={<CheckoutLayout />}>
          <Route path="/checkout" element={<CheckoutPage />} />
        </Route>

        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/new" element={<AdminProductCreatePage />} />
          <Route path="products/:productId" element={<AdminProductEditPage />} />
          <Route path="stock" element={<AdminStockPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="categories/new" element={<AdminCategoryEditPage />} />
          <Route path="categories/:categoryId" element={<AdminCategoryEditPage />} />
          <Route path="collections" element={<AdminPlaceholderPage />} />
          <Route path="home" element={<AdminPlaceholderPage />} />
          <Route path="articles" element={<AdminPlaceholderPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:orderNumber" element={<AdminOrderEditPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="customers/:id" element={<AdminCustomerEditPage />} />
          <Route path="promotions" element={<AdminPromotionsPage />} />
          <Route path="content" element={<AdminContentPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
