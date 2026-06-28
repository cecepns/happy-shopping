import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import BuyerOrders from './pages/buyer/BuyerOrders';
import BuyerBalance from './pages/buyer/BuyerBalance';
import BuyerChat from './pages/buyer/BuyerChat';
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerProducts from './pages/seller/SellerProducts';
import SellerOrders from './pages/seller/SellerOrders';
import SellerChat from './pages/seller/SellerChat';
import StoreSettings from './pages/seller/StoreSettings';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminOrders from './pages/admin/AdminOrders';
import AdminBanners from './pages/admin/AdminBanners';
import AdminBalance from './pages/admin/AdminBalance';
import AdminTopup from './pages/admin/AdminTopup';
import AdminCategories from './pages/admin/AdminCategories';
import AdminSettings from './pages/admin/AdminSettings';
import LoadingSpinner from './components/ui/LoadingSpinner';

const MEMBER_ROLES = ['pembeli', 'seller'];

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === 'admin' && roles.includes('admin')) return children;
    if (MEMBER_ROLES.includes(user.role) && roles.some(r => MEMBER_ROLES.includes(r))) return children;
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<ProtectedRoute roles={MEMBER_ROLES}><Checkout /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/buyer/orders" element={<ProtectedRoute roles={MEMBER_ROLES}><BuyerOrders /></ProtectedRoute>} />
            <Route path="/buyer/balance" element={<ProtectedRoute roles={MEMBER_ROLES}><BuyerBalance /></ProtectedRoute>} />
            <Route path="/buyer/chat" element={<ProtectedRoute roles={MEMBER_ROLES}><BuyerChat /></ProtectedRoute>} />

            <Route path="/seller" element={<ProtectedRoute roles={MEMBER_ROLES}><SellerDashboard /></ProtectedRoute>} />
            <Route path="/seller/products" element={<ProtectedRoute roles={MEMBER_ROLES}><SellerProducts /></ProtectedRoute>} />
            <Route path="/seller/orders" element={<ProtectedRoute roles={MEMBER_ROLES}><SellerOrders /></ProtectedRoute>} />
            <Route path="/seller/chat" element={<ProtectedRoute roles={MEMBER_ROLES}><SellerChat /></ProtectedRoute>} />
            <Route path="/seller/settings" element={<ProtectedRoute roles={MEMBER_ROLES}><StoreSettings /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute roles={['admin']}><AdminOrders /></ProtectedRoute>} />
            <Route path="/admin/banners" element={<ProtectedRoute roles={['admin']}><AdminBanners /></ProtectedRoute>} />
            <Route path="/admin/balance" element={<ProtectedRoute roles={['admin']}><AdminBalance /></ProtectedRoute>} />
            <Route path="/admin/topup" element={<ProtectedRoute roles={['admin']}><AdminTopup /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute roles={['admin']}><AdminCategories /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><AdminSettings /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
