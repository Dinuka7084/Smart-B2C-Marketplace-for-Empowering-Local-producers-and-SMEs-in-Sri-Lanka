import { Navigate, Route, Routes } from 'react-router';

import App from './App';
import { ProtectedRoute } from './auth/protected-route';
import { AuthPage } from './pages/auth-page';
import { CartPage } from './pages/cart-page';
import { DashboardPage } from './pages/dashboard-page';
import { NotFoundPage } from './pages/not-found-page';
import { ProductDetailPage } from './pages/product-detail-page';
import { ProductsPage } from './pages/products-page';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:slug" element={<ProductDetailPage />} />
      <Route
        path="/cart"
        element={
          <ProtectedRoute roles={['customer']}>
            <CartPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute roles={['customer']}>
            <DashboardPage workspace="customer" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor"
        element={
          <ProtectedRoute roles={['vendor']}>
            <DashboardPage workspace="vendor" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/products"
        element={
          <ProtectedRoute roles={['vendor']}>
            <DashboardPage workspace="vendor" view="products" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <DashboardPage workspace="admin" />
          </ProtectedRoute>
        }
      />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
