import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async (sessionUser) => {
        if (!sessionUser) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', sessionUser.id)
                .single();

            if (error) {
                console.error("No se pudo obtener el perfil de usuario:", error);
                setUser(sessionUser); // Fallback to basic session
            } else {
                // Mezclamos la data de Auth con la tabla usuarios, inyectando el ROL y asegurando que el email sea el de Auth
                setUser({ ...sessionUser, ...data, email: sessionUser.email });
            }
        } catch (err) {
            console.error("Error inesperado obteniendo perfil de auth:", err);
            setUser(sessionUser);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Obtener la sesión actual al cargar
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            fetchUserProfile(session?.user);
        });

        // Escuchar cambios de autenticación (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setLoading(true); // Evitar parpadeos de UI
            setSession(session);
            fetchUserProfile(session?.user);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Funciones de ayuda
    const login = async (email, password) => {
        return await supabase.auth.signInWithPassword({ email, password });
    };

    const registro = async (email, password, nombreData) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            // Aunque creamos al usuario en auth, también guardaremos sus datos extra
            options: {
                data: {
                    nombre_completo: nombreData
                }
            }
        });
        return { data, error };
    };

    const logout = async () => {
        return await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, login, registro, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
