import { Navigate, Route, Routes } from 'react-router';

import App from './App';
import { ProtectedRoute } from './auth/protected-route';
import { AuthPage } from './pages/auth-page';
import { CartPage } from './pages/cart-page';
import { CheckoutPage } from './pages/checkout-page';
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
        path="/checkout"
        element={
          <ProtectedRoute roles={['customer']}>
            <CheckoutPage />
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
        path="/account/orders"
        element={
          <ProtectedRoute roles={['customer']}>
            <DashboardPage workspace="customer" view="orders" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account/orders/:orderId"
        element={
          <ProtectedRoute roles={['customer']}>
            <DashboardPage workspace="customer" view="order-detail" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account/wishlist"
        element={
          <ProtectedRoute roles={['customer']}>
            <DashboardPage workspace="customer" view="wishlist" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account/notifications"
        element={
          <ProtectedRoute roles={['customer']}>
            <DashboardPage workspace="customer" view="notifications" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account/complaints"
        element={
          <ProtectedRoute roles={['customer']}>
            <DashboardPage workspace="customer" view="complaints" />
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
        path="/vendor/orders"
        element={
          <ProtectedRoute roles={['vendor']}>
            <DashboardPage workspace="vendor" view="orders" />
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
      <Route
        path="/admin/support"
        element={
          <ProtectedRoute roles={['admin']}>
            <DashboardPage workspace="admin" view="support" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <ProtectedRoute roles={['admin']}>
            <DashboardPage workspace="admin" view="categories" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <DashboardPage workspace="admin" view="users" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute roles={['admin']}>
            <DashboardPage workspace="admin" view="admin-products" />
          </ProtectedRoute>
        }
      />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
