import { Navigate, Route, Routes } from 'react-router';

import App from './App';
import { ProtectedRoute } from './auth/protected-route';
import { AuthPage } from './pages/auth-page';
import { DashboardPage } from './pages/dashboard-page';
import { NotFoundPage } from './pages/not-found-page';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
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
