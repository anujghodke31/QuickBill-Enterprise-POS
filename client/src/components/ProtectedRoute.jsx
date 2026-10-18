import { Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

export default function ProtectedRoute({ children, allowedRoles }) {
    const location = useLocation();
    const token = localStorage.getItem('quickbill_token');

    if (!token) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    try {
        const decoded = jwtDecode(token);
        // Master admin override
        const userRole = decoded.id === 'master-admin' ? 'superadmin' : decoded.role;

        // Verify the role allows access
        if (allowedRoles && userRole) {
            // Note: superadmin overrides everything by default unless strictly typed
            if (userRole === 'superadmin') return children;
            
            if (!allowedRoles.includes(userRole)) {
                return <Navigate to="/admin/unauthorized" replace />;
            }
        }

        return children;
    } catch (error) {
        // If token fails to decode, kick to login
        localStorage.removeItem('quickbill_token');
        localStorage.removeItem('quickbill_auth');
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
}
