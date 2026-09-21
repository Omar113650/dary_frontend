import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LocaleContext } from './utils/LocaleContext';
import { translations, getDirection } from './utils/i18n';
import type { Locale } from './utils/i18n';
import { AuthProvider } from './context/AuthContext';
import TenantRoute from './components/auth/TenantRoute';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardOverviewPage from './pages/dashboard/DashboardOverviewPage';
import RentalsPage from './pages/dashboard/RentalsPage';
import FavoritesPage from './pages/dashboard/FavoritesPage';
import RecentlyViewedPage from './pages/dashboard/RecentlyViewedPage';
import SavedSearchesPage from './pages/dashboard/SavedSearchesPage';
import NotificationsPage from './pages/dashboard/NotificationsPage';
import SupportTicketsPage from './pages/dashboard/SupportTicketsPage';
import ProfilePage from './pages/dashboard/ProfilePage';
import DevDashboardPreview from './components/dashboard/DevDashboardPreview';
import OwnerRoute from './components/auth/OwnerRoute';
import OwnerDashboardLayout from './components/ownerDashboard/OwnerDashboardLayout';
import OwnerOverviewPage from './pages/ownerDashboard/OwnerOverviewPage';
import OwnerPropertiesPage from './pages/ownerDashboard/OwnerPropertiesPage';
import OwnerBookingsPage from './pages/ownerDashboard/OwnerBookingsPage';
import OwnerRevenuePage from './pages/ownerDashboard/OwnerRevenuePage';
import OwnerCalendarPage from './pages/ownerDashboard/OwnerCalendarPage';
import OwnerProfilePage from './pages/ownerDashboard/OwnerProfilePage';
import AddPropertyPage from './pages/ownerDashboard/AddPropertyPage';
import DevOwnerDashboardPreview from './components/ownerDashboard/DevOwnerDashboardPreview';
import AdminRoute from './components/auth/AdminRoute';
import AdminDashboardLayout from './components/adminDashboard/AdminDashboardLayout';
import AdminOverviewPage from './pages/adminDashboard/AdminOverviewPage';
import AdminUsersPage from './pages/adminDashboard/AdminUsersPage';
import AdminPropertiesPage from './pages/adminDashboard/AdminPropertiesPage';
import AdminBookingsPage from './pages/adminDashboard/AdminBookingsPage';
import AdminReportsPage from './pages/adminDashboard/AdminReportsPage';
import AdminAnalyticsPage from './pages/adminDashboard/AdminAnalyticsPage';
import AdminCalendarPage from './pages/adminDashboard/AdminCalendarPage';
import AdminProfilePage from './pages/adminDashboard/AdminProfilePage';
import DevAdminDashboardPreview from './components/adminDashboard/DevAdminDashboardPreview';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailsPage from './pages/PropertyDetailsPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

export default function App() {
  const [locale, setLocale] = useState<Locale>('ar');
  const direction = getDirection(locale);
  const t = translations[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, direction }}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Standalone full-viewport Authentication routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:userId/:resetToken" element={<ResetPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Production Tenant Dashboard routes */}
            <Route
              path="/dashboard"
              element={
                <TenantRoute>
                  <DashboardLayout />
                </TenantRoute>
              }
            >
              <Route index element={<DashboardOverviewPage />} />
              <Route path="rentals" element={<RentalsPage />} />
              <Route path="favorites" element={<FavoritesPage />} />
              <Route path="recently-viewed" element={<RecentlyViewedPage />} />
              <Route path="saved-searches" element={<SavedSearchesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="support" element={<SupportTicketsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Development-Only Preview Route (Never active in production) */}
            {import.meta.env.DEV && (
              <Route path="/dashboard-preview" element={<DevDashboardPreview />}>
                <Route index element={<DashboardOverviewPage />} />
                <Route path="rentals" element={<RentalsPage />} />
                <Route path="favorites" element={<FavoritesPage />} />
                <Route path="recently-viewed" element={<RecentlyViewedPage />} />
                <Route path="saved-searches" element={<SavedSearchesPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="support" element={<SupportTicketsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            )}

            {/* Protected Production Owner Dashboard routes */}
            <Route
              path="/owner-dashboard"
              element={
                <OwnerRoute>
                  <OwnerDashboardLayout />
                </OwnerRoute>
              }
            >
              <Route index element={<OwnerOverviewPage />} />
              <Route path="properties" element={<OwnerPropertiesPage />} />
              <Route path="properties/new" element={<AddPropertyPage />} />
              <Route path="add-property" element={<AddPropertyPage />} />
              <Route path="bookings" element={<OwnerBookingsPage />} />
              <Route path="revenue" element={<OwnerRevenuePage />} />
              <Route path="calendar" element={<OwnerCalendarPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<OwnerProfilePage />} />
            </Route>

            {/* Development-Only Owner Preview Route */}
            {import.meta.env.DEV && (
              <Route path="/owner-dashboard-preview" element={<DevOwnerDashboardPreview />}>
                <Route index element={<OwnerOverviewPage />} />
                <Route path="properties" element={<OwnerPropertiesPage />} />
                <Route path="properties/new" element={<AddPropertyPage />} />
                <Route path="add-property" element={<AddPropertyPage />} />
                <Route path="bookings" element={<OwnerBookingsPage />} />
                <Route path="revenue" element={<OwnerRevenuePage />} />
                <Route path="calendar" element={<OwnerCalendarPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<OwnerProfilePage />} />
              </Route>
            )}

            {/* Protected Production Admin Dashboard routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboardLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminOverviewPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="properties" element={<AdminPropertiesPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="calendar" element={<AdminCalendarPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
            </Route>

            {/* Development-Only Admin Preview Route */}
            {import.meta.env.DEV && (
              <Route path="/admin-preview" element={<DevAdminDashboardPreview />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="properties" element={<AdminPropertiesPage />} />
                <Route path="bookings" element={<AdminBookingsPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="calendar" element={<AdminCalendarPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<AdminProfilePage />} />
              </Route>
            )}

            {/* Core app routes wrapped in Navbar & Footer Layout */}
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/properties/:id" element={<PropertyDetailsPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LocaleContext.Provider>
  );
}

