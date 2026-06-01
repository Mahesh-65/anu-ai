import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredPermission }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spinner" style={{ width:32, height:32, borderWidth:3 }} />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (requiredPermission && !user.permissions?.includes(requiredPermission)) {
    return (
      <div style={{ height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
        <div style={{ fontSize:48 }}>🔒</div>
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  return children;
}
