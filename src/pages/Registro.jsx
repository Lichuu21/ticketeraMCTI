import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Registro() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [dependencia, setDependencia] = useState('');
    const [piso, setPiso] = useState('');

    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const { registro } = useAuth();
    const navigate = useNavigate();

    const handleRegistro = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        // 1. Crear usuario en Auth
        const { data: authData, error: authError } = await registro(email, password, nombre);

        if (authError) {
            setErrorMsg(authError.message || 'Error al registrar la cuenta.');
            setLoading(false);
            return;
        }

        // 2. Guardar el perfil en la tabla usuarios pública
        if (authData?.user) {
            const { error: dbError } = await supabase
                .from('usuarios')
                .insert([{
                    id: authData.user.id, // Vinculamos el UUID de Auth
                    nombre,
                    dependencia,
                    piso
                }]);

            if (dbError) {
                console.error("Error guardando perfil:", dbError);
                // Nota: en producción deberíamos borrar el usuario de Auth si esto falla para no dejar cuentas huérfanas
                setErrorMsg('Cuenta creada, pero hubo un error al guardar tu perfil. Contacta a sistemas.');
            } else {
                alert("¡Registro exitoso! Ya puedes iniciar sesión.");
                navigate('/login');
            }
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex text-slate-800 bg-slate-300">
            <div className="w-full flex items-center justify-center p-8 z-10 relative overflow-hidden">

                {/* Adornos abstractos - Modificados a tonos azules tranquilos */}
                <div className="absolute top-[10%] left-[20%] w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-[30%] right-[20%] w-64 h-64 bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[32px] shadow-2xl w-full max-w-lg border border-slate-100 relative z-10">
                    <div className="mb-8 text-center">
                        <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#065E94] to-[#043d63] tracking-tight">
                            Crear Cuenta
                        </h2>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Únete a la Ticketera para gestionar y crear solicitudes</p>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-semibold border border-red-100 flex items-start gap-3">
                            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleRegistro} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nombre Completo</label>
                                <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm" placeholder="Ej. Ana García" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Correo Institucional</label>
                                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm" placeholder="ana@empresa.com" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contraseña</label>
                                <input required type="password" minLength="6" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm" placeholder="Mínimo 6 caracteres" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Dependencia / Área</label>
                                <input required type="text" value={dependencia} onChange={e => setDependencia(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm" placeholder="Ej. RRHH" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Piso / Ubicación</label>
                                <input required type="text" value={piso} onChange={e => setPiso(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm" placeholder="Ej. 2do Piso" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 mt-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#054b77] hover:to-[#032e4b] shadow-xl shadow-[#065E94]/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Registrando...
                                </>
                            ) : (
                                'Crear Cuenta'
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm font-medium text-slate-500">
                        ¿Ya tienes una cuenta?{' '}
                        <button onClick={() => navigate('/login')} className="text-[#065E94] hover:text-[#043d63] font-bold transition-colors">
                            Inicia sesión
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
