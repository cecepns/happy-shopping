import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminOrders from './pages/admin/AdminOrders';
import AdminBanners from './pages/admin/AdminBanners';
import AdminBalance from './pages/admin/AdminBalance';
import AdminTopup from './pages/admin/AdminTopup';
import AdminCategories from './pages/admin/AdminCategories';
import AdminSettings from './pages/admin/AdminSettings';
import LoadingSpinner from './components/ui/LoadingSpinner';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
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
            <Route path="/checkout" element={<ProtectedRoute roles={['pembeli']}><Checkout /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/buyer/orders" element={<ProtectedRoute roles={['pembeli']}><BuyerOrders /></ProtectedRoute>} />
            <Route path="/buyer/balance" element={<ProtectedRoute roles={['pembeli']}><BuyerBalance /></ProtectedRoute>} />
            <Route path="/buyer/chat" element={<ProtectedRoute roles={['pembeli']}><BuyerChat /></ProtectedRoute>} />

            <Route path="/seller" element={<ProtectedRoute roles={['seller']}><SellerDashboard /></ProtectedRoute>} />
            <Route path="/seller/products" element={<ProtectedRoute roles={['seller']}><SellerProducts /></ProtectedRoute>} />
            <Route path="/seller/orders" element={<ProtectedRoute roles={['seller']}><SellerOrders /></ProtectedRoute>} />
            <Route path="/seller/chat" element={<ProtectedRoute roles={['seller']}><SellerChat /></ProtectedRoute>} />

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
