import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [recoverySent, setRecoverySent] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const { login, user, resetPasswordForEmail } = useAuth();
    const navigate = useNavigate();

    // Redirect authenticated users to dashboard
    useEffect(() => {
        if (user && !requiresPasswordChange && !loading) {
            const timeoutId = setTimeout(() => {
                if (!requiresPasswordChange) navigate('/');
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [user, navigate, requiresPasswordChange, loading]);

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        if (!email) {
            setErrorMsg('Ingresa tu correo para recuperar la contraseña.');
            setLoading(false);
            return;
        }

        const { error } = await resetPasswordForEmail(email);

        if (error) {
            setErrorMsg('No se pudo enviar el enlace: ' + error.message);
        } else {
            setRecoverySent(true);
        }
        setLoading(false);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const { data: userLogged, error } = await login(email, password);

            if (error) {
                setErrorMsg(error.message || 'Credenciales incorrectas o cuenta no registrada.');
                setLoading(false);
            } else {
                if (userLogged?.debe_cambiar_password) {
                    setRequiresPasswordChange(true);
                    setLoading(false);
                } else {
                    setLoading(false);
                    navigate('/');
                }
            }
        } catch (err) {
            setErrorMsg(err.message || 'Error al iniciar sesión.');
            setLoading(false);
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

        try {
            const { error } = await api.auth.updateUser({ password: newPassword });

            if (error) {
                setErrorMsg('Error al actualizar la contraseña: ' + (error.message || 'Intente nuevamente'));
                setLoading(false);
            } else {
                setLoading(false);
                navigate('/');
            }
        } catch (err) {
            setErrorMsg('Error al actualizar la contraseña: ' + (err.message || 'Error inesperado'));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex text-slate-800 bg-[#065E94] lg:bg-slate-300 relative">
            {/* Fondo móvil (Solo visible en pantallas pequeñas) */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#065E94] to-[#043d63] opacity-90 lg:hidden z-0"></div>
            <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-white opacity-5 blur-3xl lg:hidden z-0"></div>
            <div className="absolute top-[60%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-300 opacity-10 blur-3xl lg:hidden z-0"></div>

            {/* Lado Izquierdo (Visual) */}
            <div className="hidden lg:flex w-1/2 flex-col justify-center items-center bg-[#065E94] relative overflow-hidden">
                {/* Efectos de fondo calmos */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#065E94] to-[#043d63] opacity-90 z-0"></div>
                <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-white opacity-5 blur-3xl"></div>
                <div className="absolute top-[60%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-300 opacity-10 blur-3xl"></div>

                <div className="z-10 text-center px-8 flex flex-col items-center">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <img
                            src="/logo-pba.png"
                            alt="Provincia de Buenos Aires"
                            className="h-16 sm:h-20 w-auto object-contain filter drop-shadow-md"
                        />
                        <h1 className="text-6xl font-extrabold text-white tracking-tight drop-shadow-md">
                            Ticketera CTI
                        </h1>
                    </div>
                    <p className="text-blue-100 text-lg font-medium leading-relaxed whitespace-nowrap">
                        El sistema de gestión de tareas de Informática - Delegación III
                    </p>
                </div>
            </div>

            {/* Lado Derecho (Formulario) */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 z-10">
                {/* Título en móvil (Solo visible en pantallas pequeñas) */}
                <div className="lg:hidden z-10 text-center mb-8 flex flex-col items-center">
                    <div className="flex items-center justify-center gap-3">
                        <img
                            src="/logo-pba.png"
                            alt="Provincia de Buenos Aires"
                            className="h-10 sm:h-12 w-auto object-contain filter drop-shadow-md"
                        />
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
                            Ticketera CTI
                        </h1>
                    </div>
                </div>

                <div className="bg-white/95 lg:bg-white/80 backdrop-blur-xl p-6 sm:p-10 rounded-[28px] sm:rounded-[32px] shadow-2xl w-full max-w-md border border-slate-100">
                    <div className="mb-8 sm:mb-10 text-center">
                        <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#065E94] to-[#043d63]">
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
                    ) : isForgotMode ? (
                        <form onSubmit={handleForgotPassword} className="space-y-6">
                            {recoverySent ? (
                                <div className="mb-4 p-5 bg-emerald-50 text-emerald-800 rounded-2xl text-sm font-semibold border border-emerald-200 text-center">
                                    <svg className="w-8 h-8 text-emerald-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    ¡Enlace enviado! Revisa tu bandeja de entrada (o spam) para restablecer la contraseña.
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-slate-600 mb-2">Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.</p>
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
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 mt-2 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#054b77] hover:to-[#032e4b] shadow-xl shadow-[#065E94]/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                    >
                                        {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                                    </button>
                                </>
                            )}
                            <div className="text-center mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setIsForgotMode(false); setErrorMsg(''); setRecoverySent(false); }}
                                    className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    Volver a iniciar sesión
                                </button>
                            </div>
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
                            <div className="text-center mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setIsForgotMode(true); setErrorMsg(''); setRecoverySent(false); }}
                                    className="text-sm font-semibold text-[#065E94] hover:text-[#043d63] hover:underline"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
