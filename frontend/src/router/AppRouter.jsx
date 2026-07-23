import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ExpensesPage from '../pages/ExpensesPage';
import CategoriesPage from '../pages/CategoriesPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';
import UserManagementPage from '../pages/UserManagementPage';
import NotFoundPage from '../pages/NotFoundPage';
import { useAuth } from '../context/AuthContext';

/** Wrapper that redirects non-admins away from admin-only routes. */
function AdminRoute() {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <ProtectedRoute /> : <Navigate to="/" replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        {/* Admin-only routes */}
        <Route element={<AdminRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/admin/users" element={<UserManagementPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
