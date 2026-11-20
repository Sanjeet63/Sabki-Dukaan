import { Compass } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { Link, Outlet, Route, Routes } from 'react-router';
import { EmptyState, Spinner } from './components/ui.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import ProfileDetailsPage from './features/auth/ProfileDetailsPage.jsx';
import ProfilePage from './features/auth/ProfilePage.jsx';
import RequireAuth from './features/auth/RequireAuth.jsx';
import CartPage from './features/cart/CartPage.jsx';
import HomePage from './features/customer/HomePage.jsx';
import ShopPage from './features/customer/ShopPage.jsx';
import OrderDetailPage from './features/orders/OrderDetailPage.jsx';
import OrdersPage from './features/orders/OrdersPage.jsx';
import CustomerLayout from './layouts/CustomerLayout.jsx';

// Seller and admin panels load on demand so the customer app stays small
const AdminDashboardPage = lazy(() => import('./features/admin/AdminDashboardPage.jsx'));
const AdminShopsPage = lazy(() => import('./features/admin/AdminShopsPage.jsx'));
const AdminCatalogPage = lazy(() => import('./features/admin/AdminCatalogPage.jsx'));
const SellerDashboardPage = lazy(() => import('./features/seller/SellerDashboardPage.jsx'));
const SellerOnboardingPage = lazy(() => import('./features/seller/SellerOnboardingPage.jsx'));
const SellerOrdersPage = lazy(() => import('./features/seller/SellerOrdersPage.jsx'));
const SellerProductsPage = lazy(() => import('./features/seller/SellerProductsPage.jsx'));
const SellerShopPage = lazy(() => import('./features/seller/SellerShopPage.jsx'));
const SellerShopSectionPage = lazy(() =>
  import('./features/seller/SellerShopPage.jsx').then((m) => ({ default: m.SellerShopSectionPage })),
);
const SellerStockLogPage = lazy(() => import('./features/seller/SellerStockLogPage.jsx'));
const SellerSharePage = lazy(() => import('./features/seller/SellerSharePage.jsx'));

const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'));
const SellerLayout = lazy(() => import('./layouts/SellerLayout.jsx'));

function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <EmptyState
        icon={Compass}
        title="Page not found"
        action={
          <Link to="/" className="btn btn-primary">
            Go home
          </Link>
        }
      >
        The page you're looking for doesn't exist.
      </EmptyState>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Spinner className="min-h-screen" />}>
    <Routes>
      <Route path="login" element={<LoginPage />} />

      {/* Customer app */}
      <Route element={<CustomerLayout />}>
        <Route index element={<HomePage />} />
        <Route path="s/:shopRef" element={<ShopPage />} />
        <Route path="shops/:shopRef" element={<ShopPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route element={<RequireAuth><Outlet /></RequireAuth>}>
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:orderId" element={<OrderDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/details" element={<ProfileDetailsPage />} />
        </Route>
      </Route>

      {/* Seller panel */}
      <Route path="seller" element={<RequireAuth><Outlet /></RequireAuth>}>
        <Route path="onboarding" element={<SellerOnboardingPage />} />
        <Route element={<SellerLayout />}>
          <Route index element={<SellerDashboardPage />} />
          <Route path="orders" element={<SellerOrdersPage />} />
          <Route path="products" element={<SellerProductsPage />} />
          <Route path="stock" element={<SellerStockLogPage />} />
          <Route path="shop" element={<SellerShopPage />} />
          <Route path="shop/:section" element={<SellerShopSectionPage />} />
          <Route path="share" element={<SellerSharePage />} />
        </Route>
      </Route>

      {/* Admin panel */}
      <Route path="admin" element={<RequireAuth roles={['admin']}><AdminLayout /></RequireAuth>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="shops" element={<AdminShopsPage />} />
        <Route path="catalog" element={<AdminCatalogPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
