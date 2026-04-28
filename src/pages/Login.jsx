import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const { login, user } = useAuth();
    const navigate = useNavigate();

    // Prevent fully authenticated users from staying on the login page (unless actively changing passwords)
    useEffect(() => {
        if (user && !requiresPasswordChange && !loading) {
            // Only navigate if we're absolutely certain they're not in the password-change flow.
            // Using a short timeout ensures any pending state updates for requiresPasswordChange have settled.
            const timeoutId = setTimeout(() => {
                if (!requiresPasswordChange) navigate('/');
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [user, navigate, requiresPasswordChange, loading]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        // Anticipate the default password directly to prevent race conditions with AuthContext's onAuthStateChange
        const isDefaultPassword = password === 'Cti1234' || password === 'Cambiame123!';
        if (isDefaultPassword) {
            setRequiresPasswordChange(true);
        }

        const { error } = await login(email, password);

        if (error) {
            setErrorMsg('Credenciales incorrectas o cuenta no registrada.');
            setLoading(false);
            if (isDefaultPassword) setRequiresPasswordChange(false); // Rollback if login failed
        } else {
            // Check if they used the temporary password
            if (isDefaultPassword) {
                // Keep the loading spinner off so they can interact with the password change form
                setLoading(false);
            } else {
                navigate('/');
            }
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmNewPassword) {
            setErrorMsg('Las contraseñas no coinciden.');
            return;
        }

        if (newPassword.length < 6) {
            setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);
        setErrorMsg('');

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            'https://deftutfyjpdlneiyzejm.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZnR1dGZ5anBkbG5laXl6ZWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTU1MzEsImV4cCI6MjA4NzY5MTUzMX0.LHP2e4eZ-CIwHvKMCQhKXK-TOH6XJBvK7si9E_DBGSA'
        );

        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            setErrorMsg('Error al actualizar la contraseña: ' + error.message);
            setLoading(false);
        } else {
            // Password updated successfully, redirect to dashboard
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen flex text-slate-800 bg-slate-300">
            {/* Lado Izquierdo (Visual) */}
            <div className="hidden lg:flex w-1/2 flex-col justify-center items-center bg-[#065E94] relative overflow-hidden">
                {/* Efectos de fondo calmos */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#065E94] to-[#043d63] opacity-90 z-0"></div>
                <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-white opacity-5 blur-3xl"></div>
                <div className="absolute top-[60%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-300 opacity-10 blur-3xl"></div>

                <div className="z-10 text-center px-12">
                    <h1 className="text-6xl font-extrabold text-white mb-6 tracking-tight drop-shadow-md">
                        Ticketera CTI
                    </h1>
                    <p className="text-blue-100 text-lg font-medium leading-relaxed max-w-md mx-auto">
                        El sistema inteligente de gestión de tareas. Autentícate para acceder a tus tableros de Soporte Técnico y Telefonía.
                    </p>
                </div>
            </div>

            {/* Lado Derecho (Formulario) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-10">
                <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[32px] shadow-2xl w-full max-w-md border border-slate-100">
                    <div className="mb-10 text-center">
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#065E94] to-[#043d63]">
                            Iniciar Sesión
                        </h2>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Ingresa tus credenciales para continuar</p>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-semibold border border-red-100 flex items-center gap-3">
                            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            {errorMsg}
                        </div>
                    )}

                    {requiresPasswordChange ? (
                        <form onSubmit={handlePasswordChange} className="space-y-6">
                            <div className="mb-4 p-4 bg-yellow-50 text-yellow-800 rounded-2xl text-sm font-semibold border border-yellow-200">
                                Por seguridad, debes cambiar la contraseña temporal proporcionada por el administrador antes de continuar.
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#065E94]/50 focus:border-[#065E94]/50 outline-none transition-all shadow-sm"
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Confirmar Nueva Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmNewPassword}
                                    onChange={e => setConfirmNewPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#065E94]/50 focus:border-[#065E94]/50 outline-none transition-all shadow-sm"
                                    placeholder="Repite la contraseña"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 mt-2 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#054b77] hover:to-[#032e4b] shadow-xl shadow-[#065E94]/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {loading ? 'Actualizando...' : 'Actualizar y Entrar'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Correo Electrónico</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#065E94]/50 focus:border-[#065E94]/50 outline-none transition-all shadow-sm"
                                    placeholder="usuario@ejemplo.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#065E94]/50 focus:border-[#065E94]/50 outline-none transition-all shadow-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 mt-2 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#054b77] hover:to-[#032e4b] shadow-xl shadow-[#065E94]/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Iniciando...
                                    </>
                                ) : (
                                    'Ingresar al Tablero'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
