import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async () => {
        try {
            const { data, error } = await api.auth.getSession();
            if (error || !data.session) {
                setUser(null);
            } else {
                const userData = data.session.user;
                const { data: perfil } = await api.usuarios.getById(userData.id);
                setUser({ ...userData, ...perfil });
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
        const { data, error } = await api.auth.signInWithPassword({ email, password });
        if (error) return { error };
        const userData = data.user;
        const { data: perfil } = await api.usuarios.getById(userData.id);
        setUser({ ...userData, ...perfil });
        return { error: null };
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
