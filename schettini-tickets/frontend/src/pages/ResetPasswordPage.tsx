import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { FaLock } from 'react-icons/fa';

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error('Enlace inválido. Solicitá uno nuevo desde "¿Olvidaste tu contraseña?"');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            toast.error('Enlace inválido.');
            return;
        }
        if (password.length < 6) {
            toast.warning('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/api/auth/reset-password', { token, password });
            setSuccess(true);
            toast.success('Contraseña actualizada. Ya podés iniciar sesión.');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Error al actualizar. El enlace puede haber expirado.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-2xl text-center">
                    <p className="text-gray-600 mb-4">No se encontró un token válido en el enlace.</p>
                    <Link to="/forgot-password" className="text-red-600 font-medium hover:text-red-500">
                        Solicitar nuevo enlace
                    </Link>
                    <br />
                    <Link to="/login" className="text-gray-500 text-sm mt-4 inline-block">Volver al inicio de sesión</Link>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-2xl text-center">
                    <h2 className="text-2xl font-bold text-green-600 mb-2">¡Listo!</h2>
                    <p className="text-gray-600">Tu contraseña fue actualizada. Redirigiendo al inicio de sesión...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-10 rounded-2xl shadow-2xl">
                <div>
                    <img className="mx-auto h-24 sm:h-28 w-auto object-contain" src="/images/Lila.png" alt="Casa Schettini" />
                    <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
                        Nueva contraseña
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-500">
                        Elegí una contraseña nueva para tu cuenta.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Nueva contraseña
                        </label>
                        <div className="relative">
                            <FaLock className="absolute left-3 top-3 text-gray-400" />
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={6}
                                className="pl-10 w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                                placeholder="Mínimo 6 caracteres"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar contraseña
                        </label>
                        <div className="relative">
                            <FaLock className="absolute left-3 top-3 text-gray-400" />
                            <input
                                id="confirm"
                                name="confirm"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={6}
                                className="pl-10 w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                                placeholder="Repetí la contraseña"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 border border-transparent rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400 font-medium"
                    >
                        {loading ? 'Guardando...' : 'Guardar contraseña'}
                    </button>

                    <div className="text-center">
                        <Link to="/login" className="text-sm text-red-600 hover:text-red-500 font-medium">
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
