import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RutaProtegida() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-300">
                <div className="w-8 h-8 border-4 border-[#065E94] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Si no hay usuario, mandarlo al login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Si hay usuario, mostrar el contenido hijo (las rutas protegidas)
    return <Outlet />;
}
