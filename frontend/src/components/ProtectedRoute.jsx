import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredPermission }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spinner" style={{ width:32, height:32, borderWidth:3 }} />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (requiredPermission && !user.permissions?.includes(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
