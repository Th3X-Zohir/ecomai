import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { StoreProvider } from './contexts/StoreContext';
import Login from './pages/Login';
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
import WebsiteSettings from './pages/WebsiteSettings';
import ShopSettings from './pages/ShopSettings';

// Storefront
import StorefrontLayout from './storefront/StorefrontLayout';
import StoreHome from './storefront/pages/StoreHome';
import StoreProducts from './storefront/pages/StoreProducts';
import StoreProductDetail from './storefront/pages/StoreProductDetail';
import StoreCart from './storefront/pages/StoreCart';
import StoreCheckout from './storefront/pages/StoreCheckout';

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

import { useParams } from 'react-router-dom';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Public storefront — no auth needed */}
      <Route path="/store/*" element={<StorefrontWrapper />} />

      {/* Admin dashboard — auth required */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetail />} />
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
