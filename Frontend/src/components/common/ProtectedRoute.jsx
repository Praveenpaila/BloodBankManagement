import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/authStore';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ role, children }) => {
  const { user, loading, isAuthenticated, dashboardFor } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={dashboardFor(user.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;
