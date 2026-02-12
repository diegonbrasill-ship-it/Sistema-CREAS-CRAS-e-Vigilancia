import { useAuth } from "./AuthContext";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Modificamos o tipo para aceitar strings puras ou arrays de strings
interface ProtectedRouteProps {
    element: JSX.Element;
    requiredPermissions: Array<string>;
    fallbackPath?: string;

}

export function ProtectedRoute({ element, requiredPermissions, fallbackPath = "/dashboard" }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    
    if (isLoading) return <div>Carregando sistema...</div>;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    
    const currentUserPermissions = user?.permissions;
    const hasAccess = requiredPermissions.every(permission => currentUserPermissions?.includes(permission)) 
    
    return hasAccess ? element : <Navigate to={fallbackPath} replace />;
}