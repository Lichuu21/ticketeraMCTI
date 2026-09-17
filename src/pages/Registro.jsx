import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Registro() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [dependencia, setDependencia] = useState('');

    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const { registro } = useAuth();
    const navigate = useNavigate();

    const handleRegistro = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        const { data: authData, error: authError } = await registro(email, password, nombre, apellido);

        if (authError) {
            setErrorMsg(authError.message || 'Error al registrar la cuenta.');
            setLoading(false);
            return;
        }

        if (authData?.user) {
            const { error: dbError } = await api.usuarios.create({
                id: authData.user.id,
                nombre,
                apellido,
                email,
                dependencia,
            });

            if (dbError) {
                console.error("Error guardando perfil:", dbError);
                setErrorMsg('Cuenta creada, pero hubo un error al guardar tu perfil. Contacta a sistemas.');
            } else {
                alert("¡Registro exitoso! Ya puedes iniciar sesión.");
                navigate('/login');
            }
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-[#0a192f] dark:via-[#112240] dark:to-[#0a192f] flex items-center justify-center p-4">
            <div className="bg-white/80 dark:bg-[#112240]/90 backdrop-blur-xl rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-none w-full max-w-md p-8 md:p-10 border border-white/60 dark:border-[var(--border-accent)] transform transition-all">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Crear Cuenta</h1>
                    <p className="text-sm text-slate-500 dark:text-neutral-400 mt-2">Regístrate para comenzar a usar la plataforma</p>
                </div>

                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleRegistro} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Nombre</label>
                        <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Tu nombre" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Apellido</label>
                        <input required type="text" value={apellido} onChange={e => setApellido(e.target.value)} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Tu apellido" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="ejemplo@correo.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Dependencia</label>
                        <input type="text" value={dependencia} onChange={e => setDependencia(e.target.value)} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Ej. Informática, Personal..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Contraseña</label>
                        <input required type="password" minLength="6" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Mínimo 6 caracteres" />
                    </div>

                    <div className="pt-4">
                        <button type="submit" disabled={loading} className="w-full px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#043d63] hover:to-[#022740] shadow-lg shadow-[#065E94]/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-500 dark:text-neutral-400">
                        ¿Ya tenés cuenta? <a href="/login" className="font-bold text-[#065E94] dark:text-[#2a83bd] hover:underline">Iniciar sesión</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
