import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/authStore';
import ProtectedRoute from './components/common/ProtectedRoute';
import LandingPage from './pages/public/LandingPage';
import AboutPage from './pages/public/AboutPage';
import PublicSearchPage from './pages/public/PublicSearchPage';
import ContactPage from './pages/public/ContactPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import {
  AdminDashboard,
  BadgesPage,
  BloodInventory,
  BookAppointment,
  BroadcastAlerts,
  ChatPage,
  DonorAnalytics,
  DonorDashboard,
  DonorProfile,
  DonorSearch,
  DonationHistory,
  EligibilityPage,
  ExpiryAlerts,
  HospitalAppointments,
  ForgotPasswordPage,
  HospitalDashboard,
  HospitalNotifications,
  HospitalPendingApproval,
  HospitalProfile,
  InventoryOverview,
  NearbyRequestsPage,
  NotificationsPage,
  RaiseRequest,
  Reports,
  RequestsLog,
  RequestStatus,
  SystemSettings,
  UserManagement,
} from './pages/AppPages';

const RoleRedirect = () => {
  const { isAuthenticated, user, dashboardFor, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <LandingPage />;
  if (user.role === 'hospital' && user.isApproved === false) return <Navigate to="/hospital/pending" replace />;
  return <Navigate to={dashboardFor(user.role)} replace />;
};

const Protected = ({ role, children }) => (
  <ProtectedRoute role={role}>{children}</ProtectedRoute>
);

function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/search" element={<PublicSearchPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route path="/donor/dashboard" element={<Protected role="donor"><DonorDashboard /></Protected>} />
      <Route path="/donor/profile" element={<Protected role="donor"><DonorProfile /></Protected>} />
      <Route path="/donor/eligibility" element={<Protected role="donor"><EligibilityPage /></Protected>} />
      <Route path="/donor/appointments" element={<Protected role="donor"><BookAppointment /></Protected>} />
      <Route path="/donor/history" element={<Protected role="donor"><DonationHistory /></Protected>} />
      <Route path="/donor/badges" element={<Protected role="donor"><BadgesPage /></Protected>} />
      <Route path="/donor/notifications" element={<Protected role="donor"><NotificationsPage /></Protected>} />
      <Route path="/donor/nearby-requests" element={<Protected role="donor"><NearbyRequestsPage /></Protected>} />
      <Route path="/donor/sos" element={<Protected role="donor"><RaiseRequest /></Protected>} />
      <Route path="/donor/chat/:requestId" element={<Protected role="donor"><ChatPage /></Protected>} />

      <Route path="/hospital/dashboard" element={<Protected role="hospital"><HospitalDashboard /></Protected>} />
      <Route path="/hospital/pending" element={<Protected role="hospital"><HospitalPendingApproval /></Protected>} />
      <Route path="/hospital/inventory" element={<Protected role="hospital"><BloodInventory /></Protected>} />
      <Route path="/hospital/raise-request" element={<Protected role="hospital"><RaiseRequest /></Protected>} />
      <Route path="/hospital/requests" element={<Protected role="hospital"><RequestStatus /></Protected>} />
      <Route path="/hospital/donor-search" element={<Protected role="hospital"><DonorSearch /></Protected>} />
      <Route path="/hospital/expiry-alerts" element={<Protected role="hospital"><ExpiryAlerts /></Protected>} />
      <Route path="/hospital/appointments" element={<Protected role="hospital"><HospitalAppointments /></Protected>} />
      <Route path="/hospital/profile" element={<Protected role="hospital"><HospitalProfile /></Protected>} />
      <Route path="/hospital/notifications" element={<Protected role="hospital"><HospitalNotifications /></Protected>} />
      <Route path="/hospital/chat/:requestId" element={<Protected role="hospital"><ChatPage /></Protected>} />

      <Route path="/admin/dashboard" element={<Protected role="admin"><AdminDashboard /></Protected>} />
      <Route path="/admin/users" element={<Protected role="admin"><UserManagement /></Protected>} />
      <Route path="/admin/inventory" element={<Protected role="admin"><InventoryOverview /></Protected>} />
      <Route path="/admin/requests" element={<Protected role="admin"><RequestsLog /></Protected>} />
      <Route path="/admin/analytics" element={<Protected role="admin"><DonorAnalytics /></Protected>} />
      <Route path="/admin/broadcast" element={<Protected role="admin"><BroadcastAlerts /></Protected>} />
      <Route path="/admin/settings" element={<Protected role="admin"><SystemSettings /></Protected>} />
      <Route path="/admin/reports" element={<Protected role="admin"><Reports /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
