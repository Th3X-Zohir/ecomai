import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { CartProvider } from './contexts/CartContext';
import { StoreProvider } from './contexts/StoreContext';

// Public pages
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Signup from './pages/Signup';
import Login from './pages/Login';

// Admin pages
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Customers from './pages/Customers';
import Campaigns from './pages/Campaigns';
import Deliveries from './pages/Deliveries';
import Payments from './pages/Payments';
import Categories from './pages/Categories';
import WebsiteSettings from './pages/WebsiteSettings';
import ShopSettings from './pages/ShopSettings';

// Storefront pages
import StorefrontLayout from './storefront/StorefrontLayout';
import StoreHome from './storefront/pages/StoreHome';
import StoreProducts from './storefront/pages/StoreProducts';
import StoreProductDetail from './storefront/pages/StoreProductDetail';
import StoreCart from './storefront/pages/StoreCart';
import StoreCheckout from './storefront/pages/StoreCheckout';
import StoreLogin from './storefront/pages/StoreLogin';
import StoreRegister from './storefront/pages/StoreRegister';
import StoreAccount from './storefront/pages/StoreAccount';
import StorePolicy from './storefront/pages/StorePolicy';
import CheckoutSuccess from './storefront/pages/CheckoutSuccess';
import CheckoutFail from './storefront/pages/CheckoutFail';
import CheckoutCancel from './storefront/pages/CheckoutCancel';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function StorefrontWrapper() {
  return (
    <CartProvider>
      <Routes>
        <Route path=":shopSlug" element={<StorefrontShell />}>
          <Route index element={<StoreHome />} />
          <Route path="products" element={<StoreProducts />} />
          <Route path="products/:productId" element={<StoreProductDetail />} />
          <Route path="cart" element={<StoreCart />} />
          <Route path="checkout" element={<StoreCheckout />} />
          <Route path="checkout/success" element={<CheckoutSuccess />} />
          <Route path="checkout/fail" element={<CheckoutFail />} />
          <Route path="checkout/cancel" element={<CheckoutCancel />} />
          <Route path="auth/login" element={<StoreLogin />} />
          <Route path="auth/register" element={<StoreRegister />} />
          <Route path="account" element={<StoreAccount />} />
          <Route path="policy/:type" element={<StorePolicy />} />
        </Route>
      </Routes>
    </CartProvider>
  );
}

function StorefrontShell() {
  const { shopSlug } = useParams();
  return (
    <StoreProvider shopSlug={shopSlug}>
      <StorefrontLayout />
    </StoreProvider>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public marketing pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />

      {/* Public storefront — no auth needed */}
      <Route path="/store/*" element={<StorefrontWrapper />} />

      {/* Admin dashboard — auth required */}
      <Route path="/admin" element={<ProtectedRoute><AdminProvider><Layout /></AdminProvider></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="categories" element={<Categories />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="payments" element={<Payments />} />
        <Route path="website-settings" element={<WebsiteSettings />} />
        <Route path="shop" element={<ShopSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
