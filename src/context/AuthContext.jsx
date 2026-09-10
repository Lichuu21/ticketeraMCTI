import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async () => {
        const isAuthRoute = ['/login', '/registro'].includes(window.location.pathname);
        if (isAuthRoute) {
            setUser(null);
            setLoading(false);
            return;
        }
        try {
            const { data, error } = await api.auth.getSession();
            if (error || !data.session) {
                setUser(null);
            } else {
                const userData = data.session.user;
                const perfil = await api.from('usuarios').single().eq('id', userData.id).select();
                setUser({ ...userData, ...perfil.data });
            }
        } catch (err) {
            console.error("Error obteniendo perfil:", err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const login = async (email, password) => {
        try {
            const { data, error } = await api.auth.signInWithPassword({ email, password });
            if (error) return { data: null, error };
            const userData = data.user;
            const perfil = await api.from('usuarios').single().eq('id', userData.id).select();
            const fullUser = { ...userData, ...(perfil?.data || {}) };
            setUser(fullUser);
            return { data: fullUser, error: null };
        } catch (err) {
            return { data: null, error: { message: err.message || 'Error al iniciar sesión' } };
        }
    };

    const registro = async (email, password, nombreData) => {
        const { data, error } = await api.auth.signUp({
            email,
            password,
            data: { nombre_completo: nombreData }
        });
        return { data, error };
    };

    const logout = async () => {
        await api.auth.signOut();
        setUser(null);
    };

    const resetPasswordForEmail = async (email) => {
        return await api.auth.resetPasswordForEmail(email);
    };

    return (
        <AuthContext.Provider value={{ user, login, registro, logout, resetPasswordForEmail, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
